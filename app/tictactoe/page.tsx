'use client'
import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { publishEvent, fetchEventHistory, OnlineConnection } from '../lib/online'

const WINNING_COMBOS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
]

function TicTacToeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const p1 = decodeURIComponent(searchParams.get('p1')||'Player 1')
  const p2 = decodeURIComponent(searchParams.get('p2')||'Player 2')

  const mode = searchParams.get('mode')?.trim() === 'bot'
  const difficulty = searchParams.get('difficulty')?.trim() || 'medium'
  const first = searchParams.get('first')?.trim() || 'player'

  const isOnline = searchParams.get('mode')?.trim() === 'online'
  const room = searchParams.get('room')?.trim()?.toUpperCase()
  const role = searchParams.get('role')?.trim()

  const getInitialTurn = () => {
    if (mode) {
      if (first === 'bot') return false // Bot starts (O starts)
      if (first === 'player') return true // Player starts (X starts)
      if (first === 'random') return Math.random() < 0.5
    }
    return true
  }

  const [board,    setBoard]    = useState<(string | null)[]>(Array(9).fill(null))
  const [isX,      setIsX]      = useState(getInitialTurn)
  const [winner,   setWinner]   = useState<string | null>(null)
  const [winCombo, setWinCombo] = useState<number[]>([])
  const [scores,   setScores]   = useState<Record<string, number>>({ X:0, O:0 })
  const [draws,    setDraws]    = useState(0)
  const [isBotThinking, setIsBotThinking] = useState(false)
  const [isMoveInFlight, setIsMoveInFlight] = useState(false)

  // Online status states
  const [onlineStatus, setOnlineStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')
  const [isLoadingHistory, setIsLoadingHistory] = useState(isOnline)
  const connectionRef = useRef<any>(null)
  const processedIdsRef = useRef<Set<string>>(new Set())

  const playerColors: Record<string, string> = { X:'#00f0ff', O:'#ff00ff' }

  const botSymbol = p1 === 'Bot' ? 'X' : 'O'
  const playerSymbol = botSymbol === 'X' ? 'O' : 'X'
  const isMyTurn = !isOnline || (role === 'host' && isX) || (role && role.startsWith('guest') && !isX)
  const currentName = isX ? p1 : p2

  function checkWinner(squares: (string | null)[]) {
    for (let combo of WINNING_COMBOS) {
      const [a,b,c] = combo
      if (squares[a] && squares[a]===squares[b] && squares[a]===squares[c])
        return { winner:squares[a], combo }
    }
    if (squares.every(s=>s!==null)) return { winner:'draw', combo:[] }
    return null
  }

  // Minimax and Bot Move logic
  function evaluateBoard(tempBoard: (string | null)[]): number {
    for (let combo of WINNING_COMBOS) {
      const [a, b, c] = combo
      if (tempBoard[a] && tempBoard[a] === tempBoard[b] && tempBoard[a] === tempBoard[c]) {
        return tempBoard[a] === botSymbol ? 10 : -10
      }
    }
    return 0
  }

  function minimax(tempBoard: (string | null)[], depth: number, isMaximizing: boolean): number {
    const score = evaluateBoard(tempBoard)
    if (score === 10) return score - depth
    if (score === -10) return score + depth
    if (tempBoard.every(s => s !== null)) return 0

    if (isMaximizing) {
      let best = -1000
      for (let i = 0; i < 9; i++) {
        if (tempBoard[i] === null) {
          tempBoard[i] = botSymbol
          best = Math.max(best, minimax(tempBoard, depth + 1, false))
          tempBoard[i] = null
        }
      }
      return best
    } else {
      let best = 1000
      for (let i = 0; i < 9; i++) {
        if (tempBoard[i] === null) {
          tempBoard[i] = playerSymbol
          best = Math.min(best, minimax(tempBoard, depth + 1, true))
          tempBoard[i] = null
        }
      }
      return best
    }
  }

  function findBestMove(tempBoard: (string | null)[]): number {
    let bestVal = -1000
    let bestMove = -1
    for (let i = 0; i < 9; i++) {
      if (tempBoard[i] === null) {
        tempBoard[i] = botSymbol
        let moveVal = minimax(tempBoard, 0, false)
        tempBoard[i] = null
        if (moveVal > bestVal) {
          bestMove = i
          bestVal = moveVal
        }
      }
    }
    return bestMove
  }

  function findMediumMove(tempBoard: (string | null)[]): number {
    // 1. Can Bot win in this move?
    for (let i = 0; i < 9; i++) {
      if (tempBoard[i] === null) {
        tempBoard[i] = botSymbol
        const win = evaluateBoard(tempBoard) === 10
        tempBoard[i] = null
        if (win) return i
      }
    }

    // 2. Can Player win in their next move? Block them!
    for (let i = 0; i < 9; i++) {
      if (tempBoard[i] === null) {
        tempBoard[i] = playerSymbol
        const lose = evaluateBoard(tempBoard) === -10
        tempBoard[i] = null
        if (lose) return i
      }
    }

    // 3. Otherwise, select random
    const emptyIndices = tempBoard.map((c, i) => c === null ? i : -1).filter(idx => idx !== -1)
    return emptyIndices[Math.floor(Math.random() * emptyIndices.length)]
  }

  function makeBotMove() {
    let moveIdx = -1
    const tempBoard = [...board]

    if (difficulty === 'easy') {
      const emptyIndices = tempBoard.map((c, i) => c === null ? i : -1).filter(idx => idx !== -1)
      moveIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)]
    } else if (difficulty === 'medium') {
      moveIdx = findMediumMove(tempBoard)
    } else {
      moveIdx = findBestMove(tempBoard)
    }

    if (moveIdx !== -1) {
      executeMoveLocally(moveIdx)
    }
  }

  // Trigger bot move
  useEffect(() => {
    if (!mode || winner) return
    const isBotTurn = currentName === 'Bot'
    if (isBotTurn) {
      setIsBotThinking(true)
      const delay = Math.floor(Math.random() * 400) + 300 // 300 to 700 ms
      const timer = setTimeout(() => {
        makeBotMove()
        setIsBotThinking(false)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [isX, winner, mode])

  function executeMoveLocally(i: number) {
    const symbol = isX ? 'X' : 'O'
    const newBoard = [...board]
    newBoard[i] = symbol
    setBoard(newBoard)
    const result = checkWinner(newBoard)
    if (result) {
      setWinner(result.winner)
      setWinCombo(result.combo)
      if (result.winner==='draw') setDraws(d=>d+1)
      else setScores(prev=>({...prev,[result.winner]:prev[result.winner]+1}))
    } else {
      setIsX(!isX)
    }
  }

  function handleTap(i: number) {
    if (board[i] || winner || isBotThinking || (mode && currentName === 'Bot') || (isOnline && !isMyTurn) || isLoadingHistory || isMoveInFlight) return
    
    if (isOnline) {
      const symbol = isX ? 'X' : 'O'
      const newBoard = [...board]
      newBoard[i] = symbol

      let newWinner = null
      let newWinCombo: number[] = []
      let newScores = { ...scores }
      let newDraws = draws
      let newLog = ''
      let newIsX = isX

      const result = checkWinner(newBoard)
      if (result) {
        newWinner = result.winner
        newWinCombo = result.combo
        if (result.winner === 'draw') {
          newDraws = draws + 1
          newLog = `⚡ DRAW!`
        } else {
          newScores[result.winner as 'X' | 'O'] = scores[result.winner as 'X' | 'O'] + 1
          newLog = `🏆 ${result.winner === 'X' ? p1 : p2} WINS!`
        }
      } else {
        newIsX = !isX
        newLog = `It is now ${!isX ? p1 : p2}'s turn.`
      }

      const nextState = {
        board: newBoard,
        isX: newIsX,
        winner: newWinner,
        winCombo: newWinCombo,
        scores: newScores,
        draws: newDraws,
        log: newLog
      }
      console.log('[TIC-TAC-TOE] Outgoing update:', nextState)
      setIsMoveInFlight(true)
      publishEvent(room!, 'state_update', nextState)
        .catch(() => setIsMoveInFlight(false))
    } else {
      executeMoveLocally(i)
    }
  }

  function reset(isIncoming = false) {
    if (isOnline) {
      const initialState = {
        board: Array(9).fill(null),
        isX: getInitialTurn(),
        winner: null,
        winCombo: [],
        scores: scores,
        draws: draws,
        log: 'Welcome to Arcade Tic-Tac-Toe! Player 1 to start.'
      }
      console.log('[TIC-TAC-TOE] Outgoing reset state:', initialState)
      setIsMoveInFlight(true)
      publishEvent(room!, 'state_update', initialState)
        .catch(() => setIsMoveInFlight(false))
    } else {
      setBoard(Array(9).fill(null))
      setWinner(null)
      setWinCombo([])
      setIsX(getInitialTurn())
    }
  }

  useEffect(() => {
    if (!isOnline || !room) return

    const processedIds = new Set<string>()
    processedIdsRef.current = processedIds

    async function initOnline() {
      setIsLoadingHistory(true)
      const history = await fetchEventHistory(room!)
      console.log('[TIC-TAC-TOE] Fetched history:', history)

      const stateUpdateEvents = history.filter(e => e.type === 'state_update')
      let initialRoomStateApplied = false

      if (stateUpdateEvents.length > 0) {
        const latestEvent = stateUpdateEvents[stateUpdateEvents.length - 1]
        const state = latestEvent.payload
        console.log('[TIC-TAC-TOE] Reconstructed state from history:', state)
        
        setBoard(state.board)
        setIsX(state.isX)
        setWinner(state.winner)
        setWinCombo(state.winCombo)
        setScores(state.scores)
        setDraws(state.draws)
        initialRoomStateApplied = true
      }

      if (!initialRoomStateApplied && role === 'host') {
        const initialState = {
          board: Array(9).fill(null),
          isX: true,
          winner: null,
          winCombo: [],
          scores: { X: 0, O: 0 },
          draws: 0,
          log: 'Welcome to Arcade Tic-Tac-Toe! Player 1 to start.'
        }
        console.log('[TIC-TAC-TOE] Host publishing initial room state:', initialState)
        publishEvent(room!, 'state_update', initialState)
        
        setBoard(initialState.board)
        setIsX(initialState.isX)
        setWinner(initialState.winner)
        setWinCombo(initialState.winCombo)
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
          console.log('[TIC-TAC-TOE] Live event callback:', event)
          if (event.type === 'state_update') {
            const state = event.payload
            console.log('[TIC-TAC-TOE] Applying live state update:', state)
            setIsMoveInFlight(false)
            setBoard(state.board)
            setIsX(state.isX)
            setWinner(state.winner)
            setWinCombo(state.winCombo)
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

  const currentSymbol = isX ? 'X' : 'O'
  const currentColor  = playerColors[currentSymbol]

  return (
    <main style={{
      minHeight: '100dvh',
      background:'#0a0a1a',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      padding:'20px 16px',
      fontFamily:"'Courier New', monospace",
      boxSizing:'border-box',
      overflowX:'hidden',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none',
      touchAction: 'manipulation',
    }}>

      {/* Title */}
      <h1 style={{
        fontSize:20, fontWeight:900, color:'#fff',
        letterSpacing:6, textTransform:'uppercase',
        textShadow:'0 0 20px #00f0ff',
        marginBottom:20, marginTop:0,
      }}>TIC TAC TOE</h1>

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
            {role === 'host' ? 'X (HOST)' : 'O (GUEST)'}
          </span>
        </div>
      )}

      {/* Scoreboard */}
      <div style={{ display:'flex', gap:10, marginBottom:20, width:'100%', maxWidth:340 }}>
        {[{name:p1,sym:'X'},{name:p2,sym:'O'}].map(({name,sym})=>(
          <div key={sym} style={{
            flex:1,
            border:`2px solid ${playerColors[sym]}`,
            borderRadius:14, padding:'12px 8px',
            textAlign:'center',
            background: !winner&&currentSymbol===sym ? `${playerColors[sym]}15` : 'transparent',
            boxShadow: !winner&&currentSymbol===sym ? `0 0 16px ${playerColors[sym]}44` : 'none',
            transition:'all 0.3s',
          }}>
            <div style={{ color:playerColors[sym], fontSize:10, letterSpacing:2, marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {name.toUpperCase()}
            </div>
            <div style={{ color:'#fff', fontSize:32, fontWeight:900 }}>
              {scores[sym]}
            </div>
            <div style={{ color:playerColors[sym], fontSize:11, marginTop:2 }}>{sym}</div>
          </div>
        ))}
        <div style={{
          width:60, border:'1px solid #333',
          borderRadius:14, padding:'12px 4px',
          textAlign:'center', background:'transparent',
        }}>
          <div style={{ color:'#444', fontSize:9, letterSpacing:1, marginBottom:4 }}>DRAW</div>
          <div style={{ color:'#666', fontSize:28, fontWeight:900 }}>{draws}</div>
        </div>
      </div>

      {/* Turn / Winner Display (In-game Header status) */}
      <div style={{ height:32, display:'flex', alignItems:'center', marginBottom:16 }}>
        {!winner ? (
          <p style={{ color:currentColor, fontSize:11, letterSpacing:3, textTransform:'uppercase', margin:0 }}>
            {isBotThinking ? '🤖 Bot is thinking...' : `▶ ${currentName}'S TURN (${currentSymbol})`}
          </p>
        ) : (
          <p style={{
            color: winner==='draw'?'#ffaa00':playerColors[winner],
            fontSize:14, letterSpacing:3, textTransform:'uppercase',
            margin:0, fontWeight:900,
            textShadow:`0 0 20px ${winner==='draw'?'#ffaa00':playerColors[winner]}`,
          }}>
            {winner==='draw' ? '⚡ DRAW!' : `🏆 ${winner==='X'?p1:p2} WINS!`}
          </p>
        )}
      </div>

      {/* Board */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(3, 1fr)',
        gap:8,
        width:'100%',
        maxWidth:320,
        marginBottom:24,
      }}>
        {board.map((cell,i)=>{
          const isWin = winCombo.includes(i)
          return (
            <div
              key={i}
              onClick={()=>handleTap(i)}
              className={!cell && !winner ? 'btn-touch' : ''}
              style={{
                aspectRatio:'1',
                background: isWin && cell ? `${playerColors[cell]}22` : '#0d0d20',
                border:`2px solid ${isWin && cell ? playerColors[cell] : '#1a1a3a'}`,
                borderRadius:14,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:52, fontWeight:900,
                color: cell ? playerColors[cell] : 'transparent',
                textShadow: cell ? `0 0 20px ${playerColors[cell]}` : 'none',
                boxShadow: isWin && cell ? `0 0 20px ${playerColors[cell]}66` : 'none',
                cursor: cell||winner ? 'default' : 'pointer',
                transition:'all 0.15s',
                WebkitTapHighlightColor:'transparent',
                userSelect:'none',
                outline: 'none',
              }}
            >
              {cell}
            </div>
          )
        })}
      </div>

      {/* Bottom Action Buttons (Hidden when overlay is shown, or kept for reset/exit) */}
      <div style={{ display:'flex', gap:10, width:'100%', maxWidth:320 }}>
        <button onClick={() => reset(false)} className="btn-touch" style={{
          flex:1, padding:'14px',
          background:'transparent',
          border:'2px solid #00ff88',
          borderRadius:12, color:'#00ff88',
          fontSize:12, fontWeight:900,
          letterSpacing:3, textTransform:'uppercase',
          cursor:'pointer',
          fontFamily:"'Courier New', monospace",
          outline: 'none',
          WebkitTapHighlightColor:'transparent',
        }}>
          ↺ RESET
        </button>
        <button onClick={()=>router.back()} className="btn-touch" style={{
          flex:1, padding:'14px',
          background:'transparent',
          border:'1px solid #333',
          borderRadius:12, color:'#555',
          fontSize:12, fontWeight:900,
          letterSpacing:3, textTransform:'uppercase',
          cursor:'pointer',
          fontFamily:"'Courier New', monospace",
          outline: 'none',
          WebkitTapHighlightColor:'transparent',
        }}>
          ← LOBBY
        </button>
      </div>

      {/* Winner Overlay Modal */}
      {winner && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 5, 15, 0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: 16
        }}>
          <div style={{
            background: '#0d0d20',
            border: `2px solid ${winner === 'draw' ? '#ffaa00' : playerColors[winner]}`,
            borderRadius: 20,
            padding: '32px 24px',
            width: '100%',
            maxWidth: 340,
            textAlign: 'center',
            boxShadow: `0 0 24px ${winner === 'draw' ? '#ffaa00' : playerColors[winner]}44`,
            boxSizing: 'border-box'
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {winner === 'draw' ? '⚡' : '🏆'}
            </div>
            <h2 style={{
              color: winner === 'draw' ? '#ffaa00' : playerColors[winner],
              fontSize: 18, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 8px 0'
            }}>
              {winner === 'draw' ? 'DRAW!' : 'VICTORY!'}
            </h2>
            <p style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', margin: '0 0 24px 0' }}>
              {winner === 'draw' ? 'THE GAME IS A DRAW!' : `${winner === 'X' ? p1 : p2} WINS!`}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => reset(false)} className="btn-touch" style={{
                flex: 1, padding: '14px 12px',
                background: 'transparent',
                border: '2px solid #00ff88',
                borderRadius: 12, color: '#00ff88',
                fontSize: 11, fontWeight: 900,
                letterSpacing: 2, textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: "'Courier New', monospace",
                outline: 'none',
                WebkitTapHighlightColor: 'transparent'
              }}>
                ↺ REMATCH
              </button>
              <button onClick={() => router.back()} className="btn-touch" style={{
                flex: 1, padding: '14px 12px',
                background: 'transparent',
                border: '1px solid #334155',
                borderRadius: 12, color: '#64748b',
                fontSize: 11, fontWeight: 900,
                letterSpacing: 2, textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: "'Courier New', monospace",
                outline: 'none',
                WebkitTapHighlightColor: 'transparent'
              }}>
                ← LOBBY
              </button>
            </div>
          </div>
        </div>
      )}

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

export default function TicTacToe() {
  return <Suspense><TicTacToeContent/></Suspense>
}