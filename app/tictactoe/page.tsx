'use client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import BottomNav from '@/components/BottomNav'

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
]

function TicTacToeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { effectiveTheme } = useTheme()
  const isDark = effectiveTheme === 'dark'

  const p1 = decodeURIComponent(searchParams.get('p1') || 'Player 1')
  const p2 = decodeURIComponent(searchParams.get('p2') || 'Player 2')

  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null))
  const [isXNext, setIsXNext] = useState(true)
  const [winningLine, setWinningLine] = useState<number[] | null>(null)
  const [winner, setWinner] = useState<string | null>(null)
  const [isDraw, setIsDraw] = useState(false)
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 })

  function handleCellClick(index: number) {
    if (board[index] || winner || isDraw) return

    const newBoard = [...board]
    const mark = isXNext ? 'X' : 'O'
    newBoard[index] = mark
    setBoard(newBoard)

    for (const combo of WINNING_COMBOS) {
      const [a, b, c] = combo
      if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
        setWinningLine(combo)
        const winName = mark === 'X' ? p1 : p2
        setWinner(winName)
        setScores(prev => ({ ...prev, [mark]: prev[mark as 'X' | 'O'] + 1 }))
        return
      }
    }

    if (newBoard.every(cell => cell !== null)) {
      setIsDraw(true)
      setScores(prev => ({ ...prev, draws: prev.draws + 1 }))
      return
    }

    setIsXNext(!isXNext)
  }

  function resetGame() {
    setBoard(Array(9).fill(null))
    setIsXNext(true)
    setWinningLine(null)
    setWinner(null)
    setIsDraw(false)
  }

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

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, paddingTop: 'env(safe-area-inset-top, 0px)',
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

        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Tic-Tac-Toe</h1>

        <button onClick={resetGame} className="btn-touch" style={{
          padding: '6px 12px', borderRadius: 9999,
          background: isDark ? '#17171c' : '#ffffff', border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`,
          fontSize: 12, fontWeight: 700, color: isDark ? '#9ca3af' : '#6b7280', cursor: 'pointer',
        }}>
          Reset
        </button>
      </header>

      {/* Players Header Box */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: isDark ? '#17171c' : '#ffffff', borderRadius: 20,
        border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`, padding: '12px 16px',
        marginBottom: 16, boxShadow: isDark ? 'none' : '0 2px 10px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          opacity: isXNext && !winner && !isDraw ? 1 : 0.6,
        }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#ef4444' }}>✕</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{p1}</div>
            <div style={{ fontSize: 11, color: isDark ? '#9ca3af' : '#6b7280' }}>Score: {scores.X}</div>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 800, color: isDark ? '#9ca3af' : '#6b7280' }}>
          VS
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          opacity: !isXNext && !winner && !isDraw ? 1 : 0.6,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, textAlign: 'right' }}>{p2}</div>
            <div style={{ fontSize: 11, color: isDark ? '#9ca3af' : '#6b7280', textAlign: 'right' }}>Score: {scores.O}</div>
          </div>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#3b82f6' }}>◯</span>
        </div>
      </div>

      {/* 3x3 Grid */}
      <div style={{
        width: '100%', aspectRatio: '1', background: isDark ? '#17171c' : '#ffffff',
        borderRadius: 24, border: `2px solid ${isDark ? '#272730' : '#e5e7eb'}`,
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)',
        gap: 8, padding: 12, boxSizing: 'border-box',
        boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.08)',
        marginBottom: 16,
      }}>
        {board.map((cell, idx) => {
          const isWinCell = winningLine?.includes(idx)
          return (
            <div
              key={idx}
              onClick={() => handleCellClick(idx)}
              className="btn-touch"
              style={{
                background: isWinCell
                  ? (cell === 'X' ? '#ef444422' : '#3b82f622')
                  : (isDark ? '#121217' : '#f8f9fa'),
                border: `1.5px solid ${isWinCell ? (cell === 'X' ? '#ef4444' : '#3b82f6') : (isDark ? '#272730' : '#e5e7eb')}`,
                borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 48, fontWeight: 900, cursor: cell || winner || isDraw ? 'default' : 'pointer',
                color: cell === 'X' ? '#ef4444' : '#3b82f6', transition: 'all 0.15s ease',
              }}
            >
              {cell === 'X' ? '✕' : cell === 'O' ? '◯' : ''}
            </div>
          )
        })}
      </div>

      {/* Winner Modal */}
      {(winner || isDraw) && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20
        }}>
          <div style={{
            background: isDark ? '#17171c' : '#ffffff', borderRadius: 24, padding: 24,
            maxWidth: 340, width: '100%', textAlign: 'center', boxSizing: 'border-box'
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{winner ? '🎉' : '🤝'}</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px 0' }}>
              {winner ? `${winner} Wins!` : 'Match Drawn!'}
            </h2>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
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

export default function TicTacToe() {
  return (
    <Suspense fallback={<div style={{ color: '#888', textAlign: 'center', marginTop: 100 }}>Loading Tic-Tac-Toe...</div>}>
      <TicTacToeContent />
    </Suspense>
  )
}