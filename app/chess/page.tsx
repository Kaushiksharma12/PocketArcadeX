'use client'
import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Chess as ChessEngine, Square } from 'chess.js'
import { publishEvent, fetchEventHistory, OnlineConnection } from '../lib/online'

// Map chess piece types and colors to unicode symbols
const PIECE_SYMBOLS: Record<string, string> = {
  wp: '♙', wr: '♖', wn: '♘', wb: '♗', wq: '♕', wk: '♔',
  bp: '♟', br: '♜', bn: '♞', bb: '♝', bq: '♛', bk: '♚'
}

function ChessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const p1 = decodeURIComponent(searchParams.get('p1') || 'Player 1')
  const p2 = decodeURIComponent(searchParams.get('p2') || 'Player 2')

  const mode = searchParams.get('mode')?.trim() === 'bot'
  const difficulty = searchParams.get('difficulty')?.trim() || 'medium'

  const isOnline = searchParams.get('mode')?.trim() === 'online'
  const room = searchParams.get('room')?.trim()?.toUpperCase()
  const role = searchParams.get('role')?.trim()

  // Board FEN state
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([])
  const [autoFlip, setAutoFlip] = useState(false)
  const [log, setLog] = useState('White (Player 1) to make the first move.')
  const [promotionSquare, setPromotionSquare] = useState<{ from: Square; to: Square } | null>(null)

  // Custom states for session scores and resignation
  const [resignedWinner, setResignedWinner] = useState<string | null>(null) // 'w' | 'b' | null
  const [scores, setScores] = useState({ w: 0, b: 0 })
  const [draws, setDraws] = useState(0)
  const [isBotThinking, setIsBotThinking] = useState(false)
  const [isMoveInFlight, setIsMoveInFlight] = useState(false)

  // Online status states
  const [onlineStatus, setOnlineStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')
  const [isLoadingHistory, setIsLoadingHistory] = useState(isOnline)
  const connectionRef = useRef<any>(null)
  const processedIdsRef = useRef<Set<string>>(new Set())

  // Chess.js engine instancing
  const game = new ChessEngine(fen)
  const isGameOver = game.isGameOver() || resignedWinner !== null
  const isCheckmate = game.isCheckmate()
  const isCheck = game.inCheck()
  const activeColor = game.turn() // 'w' or 'b'

  const isMyTurn = !isOnline || (role === 'host' && activeColor === 'w') || (role && role.startsWith('guest') && activeColor === 'b')

  const currentPlayerName = activeColor === 'w' ? p1 : p2
  const opponentPlayerName = activeColor === 'w' ? p2 : p1

  // Simple evaluation function based on material values
  function evaluateChessBoard(engine: ChessEngine, botColor: 'w' | 'b'): number {
    let score = 0
    const pieceValues: Record<string, number> = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 }
    
    const board = engine.board()
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c]
        if (piece) {
          const val = pieceValues[piece.type] || 0
          if (piece.color === botColor) {
            score += val
          } else {
            score -= val
          }
        }
      }
    }
    return score
  }

  // Minimax with Alpha-Beta pruning
  function chessMinimax(engine: ChessEngine, depth: number, alpha: number, beta: number, isMaximizing: boolean, botColor: 'w' | 'b'): number {
    if (depth === 0 || engine.isGameOver()) {
      return evaluateChessBoard(engine, botColor)
    }

    const moves = engine.moves()
    if (isMaximizing) {
      let maxEval = -Infinity
      for (const move of moves) {
        engine.move(move)
        const evaluation = chessMinimax(engine, depth - 1, alpha, beta, false, botColor)
        engine.undo()
        maxEval = Math.max(maxEval, evaluation)
        alpha = Math.max(alpha, evaluation)
        if (beta <= alpha) break
      }
      return maxEval
    } else {
      let minEval = Infinity
      for (const move of moves) {
        engine.move(move)
        const evaluation = chessMinimax(engine, depth - 1, alpha, beta, true, botColor)
        engine.undo()
        minEval = Math.min(minEval, evaluation)
        beta = Math.min(beta, evaluation)
        if (beta <= alpha) break
      }
      return minEval
    }
  }

  function findBestChessMove(engine: ChessEngine, botColor: 'w' | 'b', depth: number): any {
    const moves = engine.moves({ verbose: true }) as any[]
    let bestMove = null
    let bestValue = -Infinity

    const shuffledMoves = [...moves].sort(() => Math.random() - 0.5)

    for (const move of shuffledMoves) {
      engine.move({ from: move.from, to: move.to, promotion: 'q' })
      const boardValue = chessMinimax(engine, depth - 1, -Infinity, Infinity, false, botColor)
      engine.undo()

      if (boardValue > bestValue) {
        bestValue = boardValue
        bestMove = move
      }
    }
    return bestMove
  }

  // Trigger bot move
  useEffect(() => {
    if (!mode || isGameOver || promotionSquare) return
    const isBotTurn = currentPlayerName === 'Bot'
    if (isBotTurn) {
      setIsBotThinking(true)
      const delay = Math.floor(Math.random() * 400) + 300 // 300 to 700 ms
      const timer = setTimeout(() => {
        const botColor = activeColor
        const engineCopy = new ChessEngine(fen)
        let move = null

        if (difficulty === 'easy') {
          const moves = engineCopy.moves({ verbose: true })
          move = moves[Math.floor(Math.random() * moves.length)]
        } else if (difficulty === 'medium') {
          move = findBestChessMove(engineCopy, botColor, 1)
        } else {
          move = findBestChessMove(engineCopy, botColor, 3)
        }

        if (move) {
          makeMove(move.from, move.to, move.promotion || 'q')
        }
        setIsBotThinking(false)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [fen, isGameOver, promotionSquare, mode])

  // Cell click logic
  function handleCellClick(square: Square) {
    if (isGameOver || promotionSquare || isBotThinking || (mode && currentPlayerName === 'Bot') || (isOnline && !isMyTurn) || isLoadingHistory || isMoveInFlight) return

    const piece = game.get(square)

    // Case 1: Selecting player's own piece
    if (piece && piece.color === activeColor) {
      setSelectedSquare(square)
      const moves = game.moves({ square, verbose: true }) as any[]
      setPossibleMoves(moves.map(m => m.to as Square))
      return
    }

    // Case 2: Executing a move
    if (selectedSquare) {
      const isLegal = possibleMoves.includes(square)
      if (isLegal) {
        const movingPiece = game.get(selectedSquare)
        const isPawn = movingPiece && movingPiece.type === 'p'
        const isPromotionRank = square.endsWith('8') || square.endsWith('1')

        if (isPawn && isPromotionRank) {
          setPromotionSquare({ from: selectedSquare, to: square })
        } else {
          makeMove(selectedSquare, square)
        }
      } else {
        setSelectedSquare(null)
        setPossibleMoves([])
      }
    }
  }

  function handlePromoSelection(promotionPiece: string) {
    if (isMoveInFlight) return
    if (promotionSquare) {
      makeMove(promotionSquare.from, promotionSquare.to, promotionPiece)
    }
  }

  // Execute chess move
  function makeMoveLocally(from: Square, to: Square, promotionPiece = 'q') {
    try {
      game.move({ from, to, promotion: promotionPiece })
      const newFen = game.fen()
      setFen(newFen)
      setSelectedSquare(null)
      setPossibleMoves([])
      setPromotionSquare(null)

      // Post-move log and session score updates
      const nextGame = new ChessEngine(newFen)
      if (nextGame.isGameOver()) {
        if (nextGame.isCheckmate()) {
          const winnerColor = nextGame.turn() === 'w' ? 'b' : 'w'
          setScores(prev => ({ ...prev, [winnerColor]: prev[winnerColor] + 1 }))
          setLog(`CHECKMATE! ${winnerColor === 'w' ? p1 : p2} wins!`)
        } else {
          setDraws(d => d + 1)
          setLog('DRAW / STALEMATE!')
        }
      } else if (nextGame.inCheck()) {
        setLog(`CHECK! ${opponentPlayerName}'s turn. Protect the King.`)
      } else {
        setLog(`Moved ${from.toUpperCase()} to ${to.toUpperCase()}. It is now ${opponentPlayerName}'s turn.`)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Execute chess move
  function makeMove(from: Square, to: Square, promotionPiece = 'q') {
    if (isOnline) {
      try {
        // Move on local engine copy to compute state
        game.move({ from, to, promotion: promotionPiece })
        const newFen = game.fen()

        let nextScores = { ...scores }
        let nextDraws = draws
        let nextLog = ''
        
        if (game.isGameOver()) {
          if (game.isCheckmate()) {
            const winnerColor = game.turn() === 'w' ? 'b' : 'w'
            nextScores[winnerColor] = (scores[winnerColor as 'w' | 'b'] || 0) + 1
            nextLog = `CHECKMATE! ${winnerColor === 'w' ? p1 : p2} wins!`
          } else {
            nextDraws = draws + 1
            nextLog = 'DRAW / STALEMATE!'
          }
        } else if (game.inCheck()) {
          nextLog = `CHECK! ${opponentPlayerName}'s turn. Protect the King.`
        } else {
          nextLog = `Moved ${from.toUpperCase()} to ${to.toUpperCase()}. It is now ${opponentPlayerName}'s turn.`
        }

        const nextState = {
          fen: newFen,
          scores: nextScores,
          draws: nextDraws,
          resignedWinner: null,
          log: nextLog
        }

        // Restore previous fen locally to prevent optimistic update before SSE echo
        game.load(fen)

        setSelectedSquare(null)
        setPossibleMoves([])
        setPromotionSquare(null)

        console.log('[CHESS] Outgoing update:', nextState)
        setIsMoveInFlight(true)
        publishEvent(room!, 'state_update', nextState)
          .catch(() => setIsMoveInFlight(false))
      } catch (err) {
        console.error(err)
      }
    } else {
      makeMoveLocally(from, to, promotionPiece)
    }
  }

  // Resignation action
  function handleResign(isIncoming = false) {
    if (isMoveInFlight) return
    if (isOnline) {
      const winnerColor = activeColor === 'w' ? 'b' : 'w'
      const nextScores = { ...scores, [winnerColor]: (scores[winnerColor as 'w' | 'b'] || 0) + 1 }
      const nextState = {
        fen: fen,
        scores: nextScores,
        draws: draws,
        resignedWinner: winnerColor,
        log: `RESIGNATION! ${winnerColor === 'w' ? p1 : p2} wins by resignation.`
      }
      console.log('[CHESS] Outgoing resignation update:', nextState)
      setIsMoveInFlight(true)
      publishEvent(room!, 'state_update', nextState)
        .catch(() => setIsMoveInFlight(false))
    } else {
      if (isGameOver) return
      const winnerColor = activeColor === 'w' ? 'b' : 'w'
      setResignedWinner(winnerColor)
      setScores(prev => ({ ...prev, [winnerColor]: prev[winnerColor] + 1 }))
      setLog(`RESIGNATION! ${winnerColor === 'w' ? p1 : p2} wins by resignation.`)
    }
  }

  // Rematch reset
  function resetGame(isIncoming = false) {
    if (isOnline) {
      const nextState = {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        scores: scores,
        draws: draws,
        resignedWinner: null,
        log: 'Game reset! White (Player 1) to start.'
      }
      console.log('[CHESS] Outgoing reset update:', nextState)
      setIsMoveInFlight(true)
      publishEvent(room!, 'state_update', nextState)
        .catch(() => setIsMoveInFlight(false))
    } else {
      setFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
      setSelectedSquare(null)
      setPossibleMoves([])
      setPromotionSquare(null)
      setResignedWinner(null)
      setLog('Game reset! White (Player 1) to start.')
    }
  }

  // Online connection useEffect
  useEffect(() => {
    if (!isOnline || !room) return

    const processedIds = new Set<string>()
    processedIdsRef.current = processedIds

    async function initOnline() {
      setIsLoadingHistory(true)
      const history = await fetchEventHistory(room!)
      console.log('[CHESS] Fetched history:', history)

      const stateUpdateEvents = history.filter(e => e.type === 'state_update')
      let initialRoomStateApplied = false

      if (stateUpdateEvents.length > 0) {
        const latestEvent = stateUpdateEvents[stateUpdateEvents.length - 1]
        const state = latestEvent.payload
        console.log('[CHESS] Reconstructed state from history:', state)

        game.load(state.fen)
        setFen(state.fen)
        setResignedWinner(state.resignedWinner)
        setScores(state.scores)
        setDraws(state.draws)
        setLog(state.log)
        initialRoomStateApplied = true
      }

      if (!initialRoomStateApplied && role === 'host') {
        const initialState = {
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          scores: { w: 0, b: 0 },
          draws: 0,
          resignedWinner: null,
          log: 'Game reset! White (Player 1) to start.'
        }
        console.log('[CHESS] Host publishing initial room state:', initialState)
        publishEvent(room!, 'state_update', initialState)

        game.load(initialState.fen)
        setFen(initialState.fen)
        setResignedWinner(initialState.resignedWinner)
        setScores(initialState.scores)
        setDraws(initialState.draws)
        setLog(initialState.log)
      }

      for (const event of history) {
        processedIds.add(event.id)
      }

      setIsLoadingHistory(false)

      // Establish live listener
      const conn = new OnlineConnection(
        room!,
        (event) => {
          console.log('[CHESS] Live event callback:', event)
          if (event.type === 'state_update') {
            const state = event.payload
            console.log('[CHESS] Applying live state update:', state)
            setIsMoveInFlight(false)
            game.load(state.fen)
            setFen(state.fen)
            setResignedWinner(state.resignedWinner)
            setScores(state.scores)
            setDraws(state.draws)
            setLog(state.log)
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

  // Board layout rotation coordinates
  const isFlipped = autoFlip && activeColor === 'b' && !isGameOver
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

  const displayRanks = isFlipped ? [...ranks].reverse() : ranks
  const displayFiles = isFlipped ? [...files].reverse() : files

  const currentColor = activeColor === 'w' ? '#00f0ff' : '#ff00ff'

  return (
    <main style={{
      minHeight: '100dvh',
      background: '#0a0a1a',
      fontFamily: "'Courier New', monospace",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px 16px',
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
        textShadow: '0 0 20px #a78bfa',
        marginBottom: 16, marginTop: 0,
      }}>ARCADE CHESS</h1>

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
            {role === 'host' ? 'WHITE' : 'BLACK'}
          </span>
        </div>
      )}

      {/* Scoreboard */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, width: '100%', maxWidth: 340 }}>
        <div style={{
          flex: 1,
          border: '2px solid #00f0ff',
          borderRadius: 14, padding: '10px 4px',
          textAlign: 'center',
          background: !isGameOver && activeColor === 'w' ? '#00f0ff15' : '#11112b',
          boxShadow: !isGameOver && activeColor === 'w' ? '0 0 12px #00f0ff44' : 'none',
          transition: 'all 0.3s',
        }}>
          <div style={{
            color: '#00f0ff', fontSize: 9, letterSpacing: 1, marginBottom: 2,
            textTransform: 'uppercase', fontWeight: 'bold',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
          }}>
            {p1}
          </div>
          <div style={{ color: '#fff', fontSize: 22, fontWeight: 900 }}>
            {scores.w}
          </div>
          <div style={{ color: '#00f0ff', fontSize: 8, marginTop: 1, fontWeight: 'bold' }}>WHITE</div>
        </div>

        <div style={{
          flex: 1,
          border: '2px solid #ff00ff',
          borderRadius: 14, padding: '10px 4px',
          textAlign: 'center',
          background: !isGameOver && activeColor === 'b' ? '#ff00ff15' : '#11112b',
          boxShadow: !isGameOver && activeColor === 'b' ? '0 0 12px #ff00ff44' : 'none',
          transition: 'all 0.3s',
        }}>
          <div style={{
            color: '#ff00ff', fontSize: 9, letterSpacing: 1, marginBottom: 2,
            textTransform: 'uppercase', fontWeight: 'bold',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
          }}>
            {p2}
          </div>
          <div style={{ color: '#fff', fontSize: 22, fontWeight: 900 }}>
            {scores.b}
          </div>
          <div style={{ color: '#ff00ff', fontSize: 8, marginTop: 1, fontWeight: 'bold' }}>BLACK</div>
        </div>

        <div style={{
          width: 58, border: '1px solid #333',
          borderRadius: 14, padding: '10px 2px',
          textAlign: 'center', background: '#11112b',
        }}>
          <div style={{ color: '#444', fontSize: 8, letterSpacing: 1, marginBottom: 2, fontWeight: 'bold' }}>DRAWS</div>
          <div style={{ color: '#666', fontSize: 22, fontWeight: 900 }}>{draws}</div>
        </div>
      </div>

      {/* Turn Display Log */}
      <div style={{ height: 26, display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        {!isGameOver && (
          <p style={{ color: currentColor, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', margin: 0, fontWeight: 'bold' }}>
            {isBotThinking ? '🤖 Bot is thinking...' : `▶ ${currentPlayerName}'S TURN`}
          </p>
        )}
      </div>

      {/* Chess Board Container */}
      <div style={{
        width: '100%',
        maxWidth: 340,
        height: 'auto',
        border: '3px solid #a78bfa',
        borderRadius: 12,
        padding: 4,
        boxSizing: 'border-box',
        background: '#12122b',
        boxShadow: '0 0 24px rgba(167, 139, 250, 0.25)',
        position: 'relative',
        marginBottom: 16,
      }}>
        {/* Render Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
          gridTemplateRows: 'repeat(8, minmax(0, 1fr))',
          width: '100%',
          aspectRatio: '1 / 1',
          boxSizing: 'border-box',
        }}>
          {displayRanks.map((rank) =>
            displayFiles.map((file) => {
              const square = `${file}${rank}` as Square
              const piece = game.get(square)

              const isDarkSquare = (file.charCodeAt(0) - 97 + parseInt(rank)) % 2 === 0
              const isSelected = selectedSquare === square
              const isPossibleTarget = possibleMoves.includes(square)

              const baseBg = isDarkSquare ? '#1c1b35' : '#2d2a55'
              const bg = isSelected
                ? '#581c87' // Selected square
                : isPossibleTarget
                ? '#1e3a8a' // Valid move spot
                : baseBg

              const pieceColor = piece?.color === 'w' ? '#00f0ff' : '#ff00ff'
              const pieceGlow = piece?.color === 'w' ? '0 0 8px #00f0ff88' : '0 0 8px #ff00ff88'

              return (
                <div
                  key={square}
                  onClick={() => handleCellClick(square)}
                  style={{
                    background: bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'calc((min(340px, 90vw) - 14px) / 8 * 0.8)',
                    cursor: isGameOver ? 'default' : 'pointer',
                    userSelect: 'none',
                    transition: 'background 0.2s',
                    position: 'relative',
                    border: isPossibleTarget ? '1px dashed #3b82f6' : 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {piece && (
                    <span style={{
                      color: pieceColor,
                      textShadow: pieceGlow,
                      fontWeight: 'bold',
                      zIndex: 2,
                    }}>
                      {PIECE_SYMBOLS[`${piece.color}${piece.type}`]}
                    </span>
                  )}

                  {isPossibleTarget && !piece && (
                    <div style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#3b82f6',
                      boxShadow: '0 0 8px #3b82f6',
                      zIndex: 1
                    }} />
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Pawn Promotion Overlay dialog */}
        {promotionSquare && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(10, 10, 26, 0.95)',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}>
            <p style={{ color: '#fff', fontSize: 12, marginBottom: 16, letterSpacing: 2, fontWeight: 'bold' }}>
              SELECT PROMOTION PIECE
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { type: 'q', sym: activeColor === 'w' ? '♕' : '♛' },
                { type: 'r', sym: activeColor === 'w' ? '♖' : '♜' },
                { type: 'b', sym: activeColor === 'w' ? '♗' : '♝' },
                { type: 'n', sym: activeColor === 'w' ? '♘' : '♞' },
              ].map((p) => (
                <button
                  key={p.type}
                  onClick={() => handlePromoSelection(p.type)}
                  className="btn-touch"
                  style={{
                    width: 52,
                    height: 52,
                    background: '#1c1b35',
                    border: '2px solid #a78bfa',
                    borderRadius: 10,
                    color: activeColor === 'w' ? '#00f0ff' : '#ff00ff',
                    fontSize: 30,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    outline: 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.sym}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls panel */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        width: '100%',
        maxWidth: 340,
      }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          color: '#888',
          fontSize: 11,
          cursor: 'pointer',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}>
          <input
            type="checkbox"
            checked={autoFlip}
            onChange={(e) => setAutoFlip(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          AUTO-FLIP BOARD ON TURN
        </label>

        {/* Gameplay Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {!isGameOver ? (
            <button onClick={() => handleResign(false)} className="btn-touch" style={{
              flex: 1, padding: '14px',
              background: 'transparent',
              border: '2px solid #ef4444',
              borderRadius: 12, color: '#ef4444',
              fontSize: 12, fontWeight: 900,
              letterSpacing: 2, textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: "'Courier New', monospace",
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}>
              🏳️ RESIGN
            </button>
          ) : (
            <button onClick={() => resetGame(false)} className="btn-touch" style={{
              flex: 1, padding: '14px',
              background: 'transparent',
              border: '2px solid #00ff88',
              borderRadius: 12, color: '#00ff88',
              fontSize: 12, fontWeight: 900,
              letterSpacing: 2, textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: "'Courier New', monospace",
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}>
              ↺ RESET
            </button>
          )}
          <button onClick={() => router.back()} className="btn-touch" style={{
            flex: 1, padding: '14px',
            background: 'transparent',
            border: '1px solid #333',
            borderRadius: 12, color: '#64748b',
            fontSize: 12, fontWeight: 900,
            letterSpacing: 2, textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: "'Courier New', monospace",
            outline: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}>
            ← GAMES
          </button>
        </div>
      </div>

      {/* Winner Overlay dialog */}
      {isGameOver && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 5, 15, 0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: 16
        }}>
          <div style={{
            background: '#0d0d20',
            border: '2px solid #a78bfa',
            borderRadius: 20,
            padding: '32px 24px',
            width: '100%',
            maxWidth: 340,
            textAlign: 'center',
            boxShadow: '0 0 24px rgba(167, 139, 250, 0.35)',
            boxSizing: 'border-box'
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
            <h2 style={{ color: '#a78bfa', fontSize: 18, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 8px 0' }}>
              GAME OVER
            </h2>
            <p style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              {resignedWinner ? (
                `${resignedWinner === 'w' ? p1.toUpperCase() : p2.toUpperCase()} WINS BY RESIGNATION!`
              ) : isCheckmate ? (
                `${activeColor === 'w' ? p2.toUpperCase() : p1.toUpperCase()} DELIVERED CHECKMATE!`
              ) : (
                'THE MATCH ENDED IN A DRAW!'
              )}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => resetGame(false)} className="btn-touch" style={{
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

export default function Chess() {
  return (
    <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center', marginTop: 100 }}>Loading Chess...</div>}>
      <ChessContent />
    </Suspense>
  )
}
