'use client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import BottomNav from '@/components/BottomNav'

const ROWS = 6
const COLS = 7

const PLAYER_COLORS = [
  { name: 'Red', fill: '#ef4444', border: '#b91c1c' },
  { name: 'Yellow', fill: '#eab308', border: '#a16207' },
  { name: 'Blue', fill: '#3b82f6', border: '#1d4ed8' },
  { name: 'Green', fill: '#22c55e', border: '#15803d' },
]

function Connect4Content() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { effectiveTheme } = useTheme()
  const isDark = effectiveTheme === 'dark'

  const p1 = decodeURIComponent(searchParams.get('p1') || 'Player 1')
  const p2 = decodeURIComponent(searchParams.get('p2') || 'Player 2')
  const p3 = decodeURIComponent(searchParams.get('p3') || '')
  const p4 = decodeURIComponent(searchParams.get('p4') || '')

  const playerNames = [p1, p2, p3, p4].filter(Boolean)
  const totalPlayers = Math.max(2, playerNames.length)

  const [board, setBoard] = useState<number[][]>(() =>
    Array(ROWS).fill(null).map(() => Array(COLS).fill(0))
  )
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0)
  const [winner, setWinner] = useState<string | null>(null)
  const [winningCells, setWinningCells] = useState<[number, number][]>([])
  const [isDraw, setIsDraw] = useState(false)
  const [scores, setScores] = useState<number[]>(Array(totalPlayers).fill(0))

  function checkWin(grid: number[][], r: number, c: number, playerVal: number) {
    const directions = [
      [[0, 1], [0, -1]],
      [[1, 0], [-1, 0]],
      [[1, 1], [-1, -1]],
      [[1, -4], [-1, 1]],
    ]

    for (const [d1, d2] of directions) {
      const line: [number, number][] = [[r, c]]

      for (const [dr, dc] of [d1, d2]) {
        let nr = r + dr
        let nc = c + dc
        while (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === playerVal) {
          line.push([nr, nc])
          nr += dr
          nc += dc
        }
      }

      if (line.length >= 4) {
        return line
      }
    }
    return null
  }

  function handleColumnClick(c: number) {
    if (winner || isDraw) return

    let targetRow = -1
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c] === 0) {
        targetRow = r
        break
      }
    }

    if (targetRow === -1) return

    const playerVal = currentPlayerIdx + 1
    const newBoard = board.map(row => [...row])
    newBoard[targetRow][c] = playerVal
    setBoard(newBoard)

    const winLine = checkWin(newBoard, targetRow, c, playerVal)
    if (winLine) {
      setWinner(playerNames[currentPlayerIdx])
      setWinningCells(winLine)
      setScores(prev => {
        const next = [...prev]
        next[currentPlayerIdx]++
        return next
      })
      return
    }

    const full = newBoard.every(row => row.every(cell => cell !== 0))
    if (full) {
      setIsDraw(true)
      return
    }

    setCurrentPlayerIdx((currentPlayerIdx + 1) % totalPlayers)
  }

  function resetGame() {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(0)))
    setCurrentPlayerIdx(0)
    setWinner(null)
    setWinningCells([])
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

        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Connect 4</h1>

        <button onClick={resetGame} className="btn-touch" style={{
          padding: '6px 12px', borderRadius: 9999,
          background: isDark ? '#17171c' : '#ffffff', border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`,
          fontSize: 12, fontWeight: 700, color: isDark ? '#9ca3af' : '#6b7280', cursor: 'pointer',
        }}>
          Reset
        </button>
      </header>

      {/* Player Indicators */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap',
        marginBottom: 16,
      }}>
        {playerNames.map((name, idx) => {
          const isTurn = currentPlayerIdx === idx && !winner && !isDraw
          const pCol = PLAYER_COLORS[idx % PLAYER_COLORS.length]
          return (
            <div
              key={name}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: isTurn ? `${pCol.fill}22` : (isDark ? '#17171c' : '#ffffff'),
                border: `1.5px solid ${isTurn ? pCol.fill : (isDark ? '#272730' : '#e5e7eb')}`,
                borderRadius: 9999, padding: '4px 12px',
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: pCol.fill }} />
              <span style={{ fontSize: 12, fontWeight: 700 }}>{name}</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>({scores[idx]})</span>
            </div>
          )
        })}
      </div>

      {/* Connect 4 Grid */}
      <div style={{
        width: '100%', aspectRatio: '7/6', background: isDark ? '#1e1e2d' : '#2563eb',
        borderRadius: 24, padding: 12, boxSizing: 'border-box',
        display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gridTemplateRows: `repeat(${ROWS}, 1fr)`, gap: 8,
        boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.5)' : '0 8px 30px rgba(37,99,235,0.25)',
        marginBottom: 16, cursor: 'pointer',
      }}>
        {board.map((row, r) =>
          row.map((cell, c) => {
            const pCol = cell > 0 ? PLAYER_COLORS[(cell - 1) % PLAYER_COLORS.length] : null
            const isWinCell = winningCells.some(([wr, wc]) => wr === r && wc === c)

            return (
              <div
                key={`${r}-${c}`}
                onClick={() => handleColumnClick(c)}
                style={{
                  width: '100%', height: '100%', borderRadius: '50%',
                  background: pCol ? pCol.fill : (isDark ? '#0b0b0e' : '#1d4ed8'),
                  boxShadow: isWinCell ? '0 0 16px #ffffff' : 'inset 0 2px 4px rgba(0,0,0,0.4)',
                  transition: 'all 0.2s ease',
                  border: isWinCell ? '3px solid #ffffff' : 'none',
                }}
              />
            )
          })
        )}
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

export default function Connect4() {
  return (
    <Suspense fallback={<div style={{ color: '#888', textAlign: 'center', marginTop: 100 }}>Loading Connect 4...</div>}>
      <Connect4Content />
    </Suspense>
  )
}
