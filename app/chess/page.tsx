'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Chess as ChessEngine, Square } from 'chess.js'

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

  // Board FEN state
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([])
  const [autoFlip, setAutoFlip] = useState(true)
  const [log, setLog] = useState('White (Player 1) to make the first move.')
  const [promotionSquare, setPromotionSquare] = useState<{ from: Square; to: Square } | null>(null)

  // Custom states for session scores and resignation
  const [resignedWinner, setResignedWinner] = useState<string | null>(null) // 'w' | 'b' | null
  const [scores, setScores] = useState({ w: 0, b: 0 })
  const [draws, setDraws] = useState(0)

  // Chess.js engine instancing
  const game = new ChessEngine(fen)
  const isGameOver = game.isGameOver() || resignedWinner !== null
  const isCheckmate = game.isCheckmate()
  const isCheck = game.inCheck()
  const activeColor = game.turn() // 'w' or 'b'

  const currentPlayerName = activeColor === 'w' ? p1 : p2
  const opponentPlayerName = activeColor === 'w' ? p2 : p1

  // Cell click logic
  function handleCellClick(square: Square) {
    if (isGameOver || promotionSquare) return

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

  // Execute chess move
  function makeMove(from: Square, to: Square, promotionPiece = 'q') {
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

  // Resignation action
  function handleResign() {
    if (isGameOver) return
    const winnerColor = activeColor === 'w' ? 'b' : 'w'
    setResignedWinner(winnerColor)
    setScores(prev => ({ ...prev, [winnerColor]: prev[winnerColor] + 1 }))
    setLog(`RESIGNATION! ${winnerColor === 'w' ? p1 : p2} wins by resignation.`)
  }

  // Promotion choice selection
  function handlePromoSelection(pieceType: string) {
    if (!promotionSquare) return
    makeMove(promotionSquare.from, promotionSquare.to, pieceType)
  }

  // Rematch reset
  function resetGame() {
    setFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    setSelectedSquare(null)
    setPossibleMoves([])
    setPromotionSquare(null)
    setResignedWinner(null)
    setLog('Game reset! White (Player 1) to start.')
  }

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
            ▶ {currentPlayerName}'S TURN
          </p>
        )}
      </div>

      {/* Chess Board Container */}
      <div style={{
        width: '100%',
        maxWidth: 340,
        aspectRatio: '1',
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
          gridTemplateColumns: 'repeat(8, 1fr)',
          gridTemplateRows: 'repeat(8, 1fr)',
          width: '100%',
          height: '100%',
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
                    fontSize: 34,
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
            <button onClick={handleResign} className="btn-touch" style={{
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
            <button onClick={resetGame} className="btn-touch" style={{
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
              <button onClick={resetGame} className="btn-touch" style={{
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
