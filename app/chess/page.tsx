'use client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Chess as ChessEngine, Square } from 'chess.js'
import { useTheme } from '@/components/ThemeProvider'
import BottomNav from '@/components/BottomNav'

// Piece Unicode symbols & graphics mapping
const PIECE_SYMBOLS: Record<string, string> = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
}

function ChessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { effectiveTheme } = useTheme()
  const isDark = effectiveTheme === 'dark'

  const p1 = decodeURIComponent(searchParams.get('p1') || 'Player 1')
  const p2 = decodeURIComponent(searchParams.get('p2') || 'Player 2')

  // Board FEN state
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([])
  const [promotionSquare, setPromotionSquare] = useState<{ from: Square; to: Square } | null>(null)
  const [autoFlip, setAutoFlip] = useState(false)
  const [scores, setScores] = useState({ w: 0, b: 0 })
  const [draws, setDraws] = useState(0)
  const [resignedWinner, setResignedWinner] = useState<'w' | 'b' | null>(null)
  const [log, setLog] = useState('Game started! White to move.')

  const game = new ChessEngine(fen)
  const activeColor = game.turn() // 'w' | 'b'
  const isCheckmate = game.isCheckmate()
  const isDraw = game.isDraw() || game.isStalemate() || game.isThreefoldRepetition() || game.isInsufficientMaterial()
  const isGameOver = isCheckmate || isDraw || resignedWinner !== null

  const activePlayerName = activeColor === 'w' ? p1 : p2
  const opponentPlayerName = activeColor === 'w' ? p2 : p1

  function handleSquareClick(sq: Square) {
    if (isGameOver || promotionSquare) return

    if (selectedSquare === sq) {
      setSelectedSquare(null)
      setPossibleMoves([])
      return
    }

    if (selectedSquare && possibleMoves.includes(sq)) {
      const piece = game.get(selectedSquare)
      const isPawnPromotion = piece && piece.type === 'p' && (
        (piece.color === 'w' && sq[1] === '8') ||
        (piece.color === 'b' && sq[1] === '1')
      )

      if (isPawnPromotion) {
        setPromotionSquare({ from: selectedSquare, to: sq })
        return
      }

      executeMove(selectedSquare, sq)
      return
    }

    const clickedPiece = game.get(sq)
    if (clickedPiece && clickedPiece.color === activeColor) {
      setSelectedSquare(sq)
      const moves = game.moves({ square: sq, verbose: true })
      setPossibleMoves(moves.map(m => m.to as Square))
    } else {
      setSelectedSquare(null)
      setPossibleMoves([])
    }
  }

  function executeMove(from: Square, to: Square, promotionPiece = 'q') {
    try {
      const move = game.move({ from, to, promotion: promotionPiece })
      if (!move) return

      const newFen = game.fen()
      setFen(newFen)
      setSelectedSquare(null)
      setPossibleMoves([])
      setPromotionSquare(null)

      if (game.isCheckmate()) {
        const winningColor = activeColor
        setScores(prev => ({ ...prev, [winningColor]: prev[winningColor] + 1 }))
        setLog(`🎉 Checkmate! ${activePlayerName} wins!`)
      } else if (game.isDraw() || game.isStalemate()) {
        setDraws(prev => prev + 1)
        setLog(`🤝 Game ended in a draw/stalemate.`)
      } else {
        const nextPlayerName = activeColor === 'w' ? p2 : p1
        const inCheck = game.inCheck()
        setLog(`${move.piece.toUpperCase()} to ${to}${inCheck ? ' (Check!)' : ''}. Turn: ${nextPlayerName}`)
      }
    } catch (e) {
      console.error(e)
    }
  }

  function handleResign() {
    if (isGameOver) return
    const winnerColor = activeColor === 'w' ? 'b' : 'w'
    const winnerName = winnerColor === 'w' ? p1 : p2
    setResignedWinner(winnerColor)
    setScores(prev => ({ ...prev, [winnerColor]: prev[winnerColor] + 1 }))
    setLog(`🏳️ ${activePlayerName} resigned! ${winnerName} wins!`)
  }

  function resetGame() {
    setFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    setSelectedSquare(null)
    setPossibleMoves([])
    setPromotionSquare(null)
    setResignedWinner(null)
    setLog('New game started! White to move.')
  }

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']

  const shouldFlipBoard = autoFlip && activeColor === 'b'
  const displayRanks = shouldFlipBoard ? [...ranks].reverse() : ranks
  const displayFiles = shouldFlipBoard ? [...files].reverse() : files

  return (
    <main style={{
      minHeight: '100dvh',
      maxWidth: 500,
      margin: '0 auto',
      background: isDark ? '#0b0b0e' : '#f8f9fa',
      color: isDark ? '#f9fafb' : '#111827',
      padding: '16px 16px 84px 16px',
      boxSizing: 'border-box',
      position: 'relative',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      transition: 'background-color 0.3s ease, color 0.3s ease',
    }}>

      {/* Top Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <button
          onClick={() => router.back()}
          className="btn-touch"
          style={{
            width: 38, height: 38, borderRadius: '50%',
            background: isDark ? '#17171c' : '#ffffff',
            border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isDark ? '#f9fafb' : '#111827', cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>

        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Chess</h1>

        <button
          onClick={() => setAutoFlip(!autoFlip)}
          className="btn-touch"
          style={{
            padding: '6px 12px', borderRadius: 9999,
            background: autoFlip ? (isDark ? '#ff453a22' : '#ff3b3015') : (isDark ? '#17171c' : '#ffffff'),
            border: `1px solid ${autoFlip ? (isDark ? '#ff453a' : '#ff3b30') : (isDark ? '#272730' : '#e5e7eb')}`,
            color: autoFlip ? (isDark ? '#ff453a' : '#ff3b30') : (isDark ? '#9ca3af' : '#6b7280'),
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Auto-Flip: {autoFlip ? 'ON' : 'OFF'}
        </button>
      </header>

      {/* Players Header Box */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: isDark ? '#17171c' : '#ffffff', borderRadius: 20,
        border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`, padding: '12px 16px',
        marginBottom: 14, boxShadow: isDark ? 'none' : '0 2px 10px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffffff', border: '2px solid #000' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{p1}</div>
            <div style={{ fontSize: 11, color: isDark ? '#9ca3af' : '#6b7280' }}>Score: {scores.w}</div>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 800, color: isDark ? '#ff453a' : '#ff3b30' }}>
          VS
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, textAlign: 'right' }}>{p2}</div>
            <div style={{ fontSize: 11, color: isDark ? '#9ca3af' : '#6b7280', textAlign: 'right' }}>Score: {scores.b}</div>
          </div>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#111827', border: '2px solid #888' }} />
        </div>
      </div>

      {/* Board */}
      <div style={{
        width: '100%', aspectRatio: '1', borderRadius: 20, overflow: 'hidden',
        border: `3px solid ${isDark ? '#272730' : '#e5e7eb'}`,
        display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)',
        marginBottom: 14, boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.08)',
      }}>
        {displayRanks.map((r, rowIdx) => (
          displayFiles.map((f, colIdx) => {
            const square = `${f}${r}` as Square
            const isDarkSquare = (rowIdx + colIdx) % 2 === 1
            const piece = game.get(square)
            const isSelected = selectedSquare === square
            const isPossible = possibleMoves.includes(square)

            let cellBg = isDarkSquare
              ? (isDark ? '#2b2b36' : '#b88b4a')
              : (isDark ? '#17171c' : '#e2d6b5')

            if (isSelected) cellBg = '#ff3b3077'
            if (isPossible) cellBg = isDarkSquare ? '#10b981aa' : '#34d399aa'

            const pieceKey = piece ? `${piece.color}${piece.type.toUpperCase()}` : ''
            const symbol = pieceKey ? PIECE_SYMBOLS[pieceKey] : ''

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                style={{
                  background: cellBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, cursor: 'pointer', userSelect: 'none', position: 'relative',
                }}
              >
                {symbol && (
                  <span style={{
                    color: piece?.color === 'w' ? '#ffffff' : '#111827',
                    filter: piece?.color === 'w' ? 'drop-shadow(0 2px 3px rgba(0,0,0,0.8))' : 'none',
                  }}>
                    {symbol}
                  </span>
                )}
              </div>
            )
          })
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <button onClick={resetGame} className="btn-touch" style={{
          flex: 1, padding: '12px', borderRadius: 14,
          background: isDark ? '#17171c' : '#ffffff', border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`,
          color: isDark ? '#ffffff' : '#111827', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          Reset Board
        </button>
        <button onClick={handleResign} className="btn-touch" style={{
          flex: 1, padding: '12px', borderRadius: 14,
          background: isDark ? '#ff453a22' : '#ff3b3015', border: `1px solid ${isDark ? '#ff453a' : '#ff3b30'}`,
          color: isDark ? '#ff453a' : '#ff3b30', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          Resign
        </button>
      </div>

      {/* Log */}
      <div style={{
        background: isDark ? '#17171c' : '#ffffff', border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`,
        borderRadius: 14, padding: '8px 12px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: isDark ? '#9ca3af' : '#6b7280',
      }}>
        {log}
      </div>

      {/* Game Over Modal */}
      {isGameOver && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20
        }}>
          <div style={{
            background: isDark ? '#17171c' : '#ffffff', borderRadius: 24, padding: 24,
            maxWidth: 340, width: '100%', textAlign: 'center', boxSizing: 'border-box'
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>👑</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px 0' }}>Match Over!</h2>
            <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 20px 0' }}>
              {resignedWinner
                ? `${resignedWinner === 'w' ? p1 : p2} Won by Resignation!`
                : isCheckmate
                ? `${activeColor === 'w' ? p2 : p1} Won by Checkmate!`
                : 'Match Ended in Draw!'}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={resetGame} className="btn-touch" style={{
                flex: 1, padding: '12px', borderRadius: 14, background: isDark ? '#ff453a' : '#ff3b30',
                border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer'
              }}>
                Rematch
              </button>
              <button onClick={() => router.push('/games')} className="btn-touch" style={{
                flex: 1, padding: '12px', borderRadius: 14, background: isDark ? '#272730' : '#e5e7eb',
                border: 'none', color: isDark ? '#fff' : '#111827', fontSize: 13, fontWeight: 800, cursor: 'pointer'
              }}>
                Games
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}

export default function Chess() {
  return (
    <Suspense fallback={<div style={{ color: '#888', textAlign: 'center', marginTop: 100 }}>Loading Chess...</div>}>
      <ChessContent />
    </Suspense>
  )
}
