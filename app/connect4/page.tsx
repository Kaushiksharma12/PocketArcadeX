'use client'
import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { publishEvent, fetchEventHistory, OnlineConnection } from '../lib/online'

const PLAYERS_CONFIG = [
  { id: 'p1', color: '#00f0ff', label: 'CYAN' },
  { id: 'p2', color: '#ff00ff', label: 'MAGENTA' },
  { id: 'p3', color: '#00ff88', label: 'GREEN' },
  { id: 'p4', color: '#ffaa00', label: 'ORANGE' }
]

function Connect4Content() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const p1 = decodeURIComponent(searchParams.get('p1') || 'Player 1')
  const p2 = decodeURIComponent(searchParams.get('p2') || 'Player 2')
  const p3 = decodeURIComponent(searchParams.get('p3') || '')
  const p4 = decodeURIComponent(searchParams.get('p4') || '')

  const activeNames = [p1, p2, p3, p4].filter(Boolean)
  const playerCount = activeNames.length

  // Dynamic board size based on player count
  // 2 Players: 6x7, 3 Players: 7x8, 4 Players: 8x9
  const ROWS = playerCount === 2 ? 6 : playerCount === 3 ? 7 : 8
  const COLS = playerCount === 2 ? 7 : playerCount === 3 ? 8 : 9

  const activePlayers = activeNames.map((name, idx) => ({
    ...PLAYERS_CONFIG[idx],
    displayName: name
  }))

  // Board state: cell holds player id ('p1', 'p2', etc) or null
  const [board, setBoard] = useState<(string | null)[][]>(() =>
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
  )
  const mode = searchParams.get('mode')?.trim() === 'bot'
  const difficulty = searchParams.get('difficulty')?.trim() || 'medium'

  const isOnline = searchParams.get('mode')?.trim() === 'online'
  const room = searchParams.get('room')?.trim()?.toUpperCase()
  const role = searchParams.get('role')?.trim()

  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0)
  const [winner, setWinner] = useState<string | null>(null)
  const [winCells, setWinCells] = useState<[number, number][]>([])
  const [scores, setScores] = useState<{ [key: string]: number }>({ p1: 0, p2: 0, p3: 0, p4: 0 })
  const [draws, setDraws] = useState(0)
  const [isBotThinking, setIsBotThinking] = useState(false)
  const [isMoveInFlight, setIsMoveInFlight] = useState(false)

  // Online status states
  const [onlineStatus, setOnlineStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')
  const [isLoadingHistory, setIsLoadingHistory] = useState(isOnline)
  const connectionRef = useRef<any>(null)
  const processedIdsRef = useRef<Set<string>>(new Set())

  const myRoleIdx = role === 'host' ? 0 : role ? parseInt(role.replace('guest', '')) : -1
  const isMyTurn = !isOnline || (currentPlayerIdx === myRoleIdx)

  // Check victory condition
  function checkWin(grid: (string | null)[][], r: number, c: number, playerId: string) {
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal down-right
      [1, -1],  // diagonal down-left
    ]

    for (const [dr, dc] of directions) {
      let cells: [number, number][] = [[r, c]]

      let nr = r + dr
      let nc = c + dc
      while (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === playerId) {
        cells.push([nr, nc])
        nr += dr
        nc += dc
      }

      nr = r - dr
      nc = c - dc
      while (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === playerId) {
        cells.push([nr, nc])
        nr -= dr
        nc -= dc
      }

      if (cells.length >= 4) {
        return cells
      }
    }
    return null
  }

  // Bot move helper
  function getBotColumn(): number {
    const validCols: number[] = []
    for (let c = 0; c < COLS; c++) {
      if (board[0][c] === null) {
        validCols.push(c)
      }
    }

    if (validCols.length === 0) return -1

    const botId = activePlayers.find(p => p.displayName === 'Bot')?.id || 'p2'
    const playerId = activePlayers.find(p => p.displayName !== 'Bot')?.id || 'p1'

    if (difficulty === 'easy') {
      return validCols[Math.floor(Math.random() * validCols.length)]
    }

    const checkImmediateWin = (tempGrid: (string | null)[][], checkPlayerId: string): number => {
      for (const col of validCols) {
        let row = -1
        for (let r = ROWS - 1; r >= 0; r--) {
          if (tempGrid[r][col] === null) {
            row = r
            break
          }
        }
        if (row !== -1) {
          tempGrid[row][col] = checkPlayerId
          const win = checkWin(tempGrid, row, col, checkPlayerId) !== null
          tempGrid[row][col] = null
          if (win) return col
        }
      }
      return -1
    }

    const winCol = checkImmediateWin(board, botId)
    if (winCol !== -1) return winCol

    const blockCol = checkImmediateWin(board, playerId)
    if (blockCol !== -1) return blockCol

    if (difficulty === 'medium') {
      return validCols[Math.floor(Math.random() * validCols.length)]
    }

    const safeCols: number[] = []
    const tempGrid = board.map(row => [...row])
    
    for (const col of validCols) {
      let row = -1
      for (let r = ROWS - 1; r >= 0; r--) {
        if (tempGrid[r][col] === null) {
          row = r
          break
        }
      }
      if (row !== -1) {
        tempGrid[row][col] = botId
        
        let playerRow = row - 1
        let isSafe = true
        if (playerRow >= 0) {
          tempGrid[playerRow][col] = playerId
          if (checkWin(tempGrid, playerRow, col, playerId) !== null) {
            isSafe = false
          }
          tempGrid[playerRow][col] = null
        }
        
        if (isSafe) {
          safeCols.push(col)
        }
        
        tempGrid[row][col] = null
      }
    }

    const candidates = safeCols.length > 0 ? safeCols : validCols

    const centerOrder = Array.from({ length: COLS }, (_, i) => i).sort((a, b) => {
      const distA = Math.abs(a - (COLS - 1) / 2)
      const distB = Math.abs(b - (COLS - 1) / 2)
      return distA - distB
    })

    for (const c of centerOrder) {
      if (candidates.includes(c)) return c
    }

    return candidates[0]
  }

  // Trigger bot move
  useEffect(() => {
    if (!mode || winner) return
    const isBotTurn = activePlayers[currentPlayerIdx]?.displayName === 'Bot'
    if (isBotTurn) {
      setIsBotThinking(true)
      const delay = Math.floor(Math.random() * 400) + 300 // 300 to 700 ms
      const timer = setTimeout(() => {
        const col = getBotColumn()
        if (col !== -1) {
          executeMoveLocally(col)
        }
        setIsBotThinking(false)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [currentPlayerIdx, winner, mode])

  function executeMoveLocally(colIndex: number) {
    let targetRow = -1
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][colIndex] === null) {
        targetRow = r
        break
      }
    }

    if (targetRow === -1) return

    const newBoard = board.map(row => [...row])
    const player = activePlayers[currentPlayerIdx]
    newBoard[targetRow][colIndex] = player.id
    setBoard(newBoard)

    const winResult = checkWin(newBoard, targetRow, colIndex, player.id)

    if (winResult) {
      setWinner(player.id)
      setWinCells(winResult)
      setScores(prev => ({ ...prev, [player.id]: prev[player.id] + 1 }))
    } else {
      const isDraw = newBoard.every(row => row.every(cell => cell !== null))
      if (isDraw) {
        setWinner('draw')
        setDraws(d => d + 1)
      } else {
        setCurrentPlayerIdx(prev => (prev + 1) % playerCount)
      }
    }
  }

  function handleColumnTap(colIndex: number) {
    if (winner || isBotThinking || (mode && activePlayers[currentPlayerIdx]?.displayName === 'Bot') || (isOnline && !isMyTurn) || isLoadingHistory || isMoveInFlight) return
    
    if (isOnline) {
      let targetRow = -1
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r][colIndex] === null) {
          targetRow = r
          break
        }
      }

      if (targetRow === -1) return

      const newBoard = board.map(row => [...row])
      const player = activePlayers[currentPlayerIdx]
      newBoard[targetRow][colIndex] = player.id

      let newWinner = null
      let newWinCells: [number, number][] = []
      let newScores = { ...scores }
      let newDraws = draws
      let newPlayerIdx = currentPlayerIdx

      const winResult = checkWin(newBoard, targetRow, colIndex, player.id)

      if (winResult) {
        newWinner = player.id
        newWinCells = winResult
        newScores[player.id] = (scores[player.id] || 0) + 1
      } else {
        const isDraw = newBoard.every(row => row.every(cell => cell !== null))
        if (isDraw) {
          newWinner = 'draw'
          newDraws = draws + 1
        } else {
          newPlayerIdx = (currentPlayerIdx + 1) % playerCount
        }
      }

      const nextState = {
        board: newBoard,
        currentPlayerIdx: newPlayerIdx,
        winner: newWinner,
        winCells: newWinCells,
        scores: newScores,
        draws: newDraws
      }

      console.log('[CONNECT-4] Outgoing update:', nextState)
      setIsMoveInFlight(true)
      publishEvent(room!, 'state_update', nextState)
        .catch(() => setIsMoveInFlight(false))
    } else {
      executeMoveLocally(colIndex)
    }
  }

  function reset(isIncoming = false) {
    if (isOnline) {
      const initialState = {
        board: Array(ROWS).fill(null).map(() => Array(COLS).fill(null)),
        currentPlayerIdx: 0,
        winner: null,
        winCells: [],
        scores: scores,
        draws: draws
      }
      console.log('[CONNECT-4] Outgoing reset state:', initialState)
      setIsMoveInFlight(true)
      publishEvent(room!, 'state_update', initialState)
        .catch(() => setIsMoveInFlight(false))
    } else {
      setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)))
      setWinner(null)
      setWinCells([])
      setCurrentPlayerIdx(0)
    }
  }

  useEffect(() => {
    if (!isOnline || !room) return

    const processedIds = new Set<string>()
    processedIdsRef.current = processedIds

    async function initOnline() {
      setIsLoadingHistory(true)
      const history = await fetchEventHistory(room!)
      console.log('[CONNECT-4] Fetched history:', history)

      const stateUpdateEvents = history.filter(e => e.type === 'state_update')
      let initialRoomStateApplied = false

      if (stateUpdateEvents.length > 0) {
        const latestEvent = stateUpdateEvents[stateUpdateEvents.length - 1]
        const state = latestEvent.payload
        console.log('[CONNECT-4] Reconstructed state from history:', state)

        setBoard(state.board)
        setCurrentPlayerIdx(state.currentPlayerIdx)
        setWinner(state.winner)
        setWinCells(state.winCells)
        setScores(state.scores)
        setDraws(state.draws)
        initialRoomStateApplied = true
      }

      if (!initialRoomStateApplied && role === 'host') {
        const initialState = {
          board: Array(ROWS).fill(null).map(() => Array(COLS).fill(null)),
          currentPlayerIdx: 0,
          winner: null,
          winCells: [],
          scores: { p1: 0, p2: 0, p3: 0, p4: 0 },
          draws: 0
        }
        console.log('[CONNECT-4] Host publishing initial room state:', initialState)
        publishEvent(room!, 'state_update', initialState)

        setBoard(initialState.board)
        setCurrentPlayerIdx(initialState.currentPlayerIdx)
        setWinner(initialState.winner)
        setWinCells(initialState.winCells)
        setScores(initialState.scores)
        setDraws(initialState.draws)
      }

      for (const event of history) {
        processedIds.add(event.id)
      }

      setIsLoadingHistory(false)

      const conn = new OnlineConnection(
        room!,
        (event) => {
          console.log('[CONNECT-4] Live event callback:', event)
          if (event.type === 'state_update') {
            const state = event.payload
            console.log('[CONNECT-4] Applying live state update:', state)
            setIsMoveInFlight(false)
            setBoard(state.board)
            setCurrentPlayerIdx(state.currentPlayerIdx)
            setWinner(state.winner)
            setWinCells(state.winCells)
            setScores(state.scores)
            setDraws(state.draws)
          }
        },
        (status) => setOnlineStatus(status),
        processedIds,
        true
      )

      connectionRef.current = conn
      conn.connect()
    }

    initOnline()

    return () => {
      if (connectionRef.current) {
        connectionRef.current.disconnect()
      }
    }
  }, [isOnline, room])

  const currentPlayer = activePlayers[currentPlayerIdx]
  const winnerPlayer = winner && winner !== 'draw' ? activePlayers.find(p => p.id === winner) : null
  const currentColor = winnerPlayer ? winnerPlayer.color : (currentPlayer ? currentPlayer.color : '#fff')
  const winnerName = winnerPlayer ? winnerPlayer.displayName : ''

  return (
    <main style={{
      minHeight: '100dvh',
      background: '#0a0a1a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '20px 16px',
      fontFamily: "'Courier New', monospace",
      boxSizing: 'border-box',
      overflowX: 'hidden',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none',
      touchAction: 'manipulation',
    }}>

      {/* Title */}
      <h1 style={{
        fontSize: 20, fontWeight: 900, color: '#fff',
        letterSpacing: 6, textTransform: 'uppercase',
        textShadow: '0 0 20px #ff00ff',
        marginBottom: 20, marginTop: 0,
      }}>CONNECT 4</h1>

      {/* Online Status Header */}
      {isOnline && (
        <div style={{
          background: '#11112b', border: `1px solid ${onlineStatus === 'connected' ? '#00ff88' : '#ef4444'}`,
          borderRadius: 14, padding: '8px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: `0 0 10px ${onlineStatus === 'connected' ? '#00ff8822' : '#ef444422'}`,
          width: '100%', maxWidth: 340, boxSizing: 'border-box'
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: onlineStatus === 'connected' ? '#00ff88' : '#ef4444',
            boxShadow: `0 0 8px ${onlineStatus === 'connected' ? '#00ff88' : '#ef4444'}`
          }} />
          <span style={{ color: '#fff', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 'bold' }}>
            {onlineStatus === 'connected' ? `ONLINE (ROOM: ${room})` : 'RECONNECTING...'}
          </span>
          <span style={{ color: '#666', fontSize: 10, marginLeft: 'auto', textTransform: 'uppercase', fontWeight: 'bold' }}>
            {role === 'host' ? 'CYAN (HOST)' : `GUEST ${myRoleIdx}`}
          </span>
        </div>
      )}

      {/* Scoreboard */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
        width: '100%',
        maxWidth: 380,
        marginBottom: 16
      }}>
        {activePlayers.map((player, idx) => {
          const isTurn = currentPlayerIdx === idx && !winner
          const color = player.color

          return (
            <div key={player.id} style={{
              flex: '1 1 74px',
              border: `2px solid ${isTurn ? color : '#1f1f3e'}`,
              borderRadius: 12, padding: '8px 4px',
              textAlign: 'center',
              background: isTurn ? `${color}15` : '#11112b',
              boxShadow: isTurn ? `0 0 12px ${color}44` : 'none',
              transition: 'all 0.3s',
              minWidth: 70
            }}>
              <div style={{
                color: color, fontSize: 9, letterSpacing: 1, marginBottom: 2,
                textTransform: 'uppercase', fontWeight: 'bold',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}>
                {player.displayName}
              </div>
              <div style={{ color: '#fff', fontSize: 20, fontWeight: 900 }}>
                {scores[player.id]}
              </div>
              <div style={{ color: color, fontSize: 8, marginTop: 1, fontWeight: 'bold' }}>{player.label}</div>
            </div>
          )
        })}
        <div style={{
          flex: '1 1 54px', border: '1px solid #333',
          borderRadius: 12, padding: '8px 4px',
          textAlign: 'center', background: '#11112b',
          minWidth: 50
        }}>
          <div style={{ color: '#444', fontSize: 9, letterSpacing: 1, marginBottom: 2, fontWeight: 'bold' }}>DRAWS</div>
          <div style={{ color: '#666', fontSize: 20, fontWeight: 900 }}>{draws}</div>
        </div>
      </div>

      {/* Turn / Winner Display */}
      <div style={{ height: 32, display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        {!winner ? (
          <p style={{ color: currentColor, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: 0 }}>
            {isBotThinking ? '🤖 Bot is thinking...' : `▶ ${currentPlayer?.displayName}'S TURN`}
          </p>
        ) : (
          <p style={{
            color: winner === 'draw' ? '#ffaa00' : currentColor,
            fontSize: 14, letterSpacing: 3, textTransform: 'uppercase',
            margin: 0, fontWeight: 900,
            textShadow: `0 0 20px ${winner === 'draw' ? '#ffaa00' : currentColor}`,
          }}>
            {winner === 'draw' ? '⚡ DRAW!' : `🏆 ${winnerName} WINS!`}
          </p>
        )}
      </div>

      {/* Connect 4 Board Container */}
      <div style={{
        background: '#12122b',
        border: '3px solid #ff00ff',
        borderRadius: 20,
        padding: 12,
        boxShadow: '0 0 25px rgba(255, 0, 255, 0.25)',
        width: '100%',
        maxWidth: 380,
        boxSizing: 'border-box',
        marginBottom: 24,
      }}>
        {/* The Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: 6,
        }}>
          {/* Columns rendering */}
          {Array.from({ length: COLS }).map((_, colIndex) => {
            const isColumnFull = board[0][colIndex] !== null

            return (
              <div
                key={colIndex}
                onClick={() => handleColumnTap(colIndex)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  cursor: winner || isColumnFull ? 'default' : 'pointer',
                  borderRadius: 8,
                  transition: 'background 0.2s',
                  WebkitTapHighlightColor: 'transparent',
                }}
                onTouchStart={(e) => {
                  if (!winner && !isColumnFull) {
                    e.currentTarget.style.background = '#ffffff0a'
                  }
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {/* Cells in this column */}
                {Array.from({ length: ROWS }).map((_, rowIndex) => {
                  const cell = board[rowIndex][colIndex]
                  const isWinningCell = winCells.some(([r, c]) => r === rowIndex && c === colIndex)
                  const cellPlayer = cell ? activePlayers.find(p => p.id === cell) : null
                  const cellColor = cellPlayer ? cellPlayer.color : '#080815'

                  return (
                    <div
                      key={rowIndex}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '50%',
                        background: cellColor,
                        border: `2px solid ${
                          isWinningCell
                            ? '#ffffff'
                            : cell
                            ? cellColor
                            : '#20204a'
                        }`,
                        boxShadow: isWinningCell
                          ? `0 0 15px #ffffff, 0 0 25px ${cellColor}`
                          : cell
                          ? `inset 0 0 10px rgba(0,0,0,0.6), 0 0 10px ${cellColor}88`
                          : 'inset 0 0 6px rgba(0,0,0,0.8)',
                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      }}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 380 }}>
        <button onClick={() => reset(false)} className="btn-touch" style={{
          flex: 1, padding: '14px',
          background: 'transparent',
          border: '2px solid #00ff88',
          borderRadius: 12, color: '#00ff88',
          fontSize: 12, fontWeight: 900,
          letterSpacing: 3, textTransform: 'uppercase',
          cursor: 'pointer',
          fontFamily: "'Courier New', monospace",
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}>
          ↺ REMATCH
        </button>
        <button onClick={() => router.back()} className="btn-touch" style={{
          flex: 1, padding: '14px',
          background: 'transparent',
          border: '1px solid #333',
          borderRadius: 12, color: '#64748b',
          fontSize: 12, fontWeight: 900,
          letterSpacing: 3, textTransform: 'uppercase',
          cursor: 'pointer',
          fontFamily: "'Courier New', monospace",
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}>
          ← GAMES
        </button>
      </div>

      {isLoadingHistory && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(10, 10, 26, 0.95)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }} className="dot-pulse" />
          <p style={{ color: '#fff', fontSize: 12, letterSpacing: 2, fontWeight: 'bold', textTransform: 'uppercase' }}>
            SYNCHRONIZING BOARD STATE...
          </p>
        </div>
      )}

      <style jsx global>{`
        .btn-touch {
          transition: transform 0.1s ease, filter 0.1s ease !important;
          -webkit-tap-highlight-color: transparent !important;
          outline: none !important;
        }
        .btn-touch:active {
          transform: scale(0.94) !important;
          filter: brightness(0.9) !important;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .dot-pulse {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #00ff88;
          display: inline-block;
          animation: pulse 1.5s infinite ease-in-out;
          box-shadow: 0 0 16px #00ff88;
        }
      `}</style>
    </main>
  )
}

export default function Connect4() {
  return (
    <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center', marginTop: 100 }}>Loading Connect 4...</div>}>
      <Connect4Content />
    </Suspense>
  )
}
