'use client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import BottomNav from '@/components/BottomNav'

const SNAKES: Record<number, number> = {
  16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78
}

const LADDERS: Record<number, number> = {
  1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100
}

const PLAYER_COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Yellow', hex: '#eab308' },
]

function SnakeLadderContent() {
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

  const [positions, setPositions] = useState<number[]>(Array(totalPlayers).fill(0))
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0)
  const [diceVal, setDiceVal] = useState<number | null>(null)
  const [isRolling, setIsRolling] = useState(false)
  const [log, setLog] = useState('Roll to start the game!')
  const [winner, setWinner] = useState<string | null>(null)

  function rollDice() {
    if (isRolling || winner) return

    setIsRolling(true)
    const rollInterval = setInterval(() => {
      setDiceVal(Math.floor(Math.random() * 6) + 1)
    }, 80)

    setTimeout(() => {
      clearInterval(rollInterval)
      const roll = Math.floor(Math.random() * 6) + 1
      setDiceVal(roll)
      setIsRolling(false)

      let currentPos = positions[currentPlayerIdx]
      let nextPos = currentPos + roll

      if (nextPos > 100) {
        setLog(`${playerNames[currentPlayerIdx]} rolled ${roll} (over 100, turn skipped)`)
        setCurrentPlayerIdx((currentPlayerIdx + 1) % totalPlayers)
        return
      }

      let logMsg = `${playerNames[currentPlayerIdx]} moved to ${nextPos}`
      if (SNAKES[nextPos]) {
        logMsg = `🐍 Snake! ${playerNames[currentPlayerIdx]} slid down to ${SNAKES[nextPos]}`
        nextPos = SNAKES[nextPos]
      } else if (LADDERS[nextPos]) {
        logMsg = `🪜 Ladder! ${playerNames[currentPlayerIdx]} climbed up to ${LADDERS[nextPos]}`
        nextPos = LADDERS[nextPos]
      }

      const newPositions = [...positions]
      newPositions[currentPlayerIdx] = nextPos
      setPositions(newPositions)

      if (nextPos === 100) {
        setWinner(playerNames[currentPlayerIdx])
        setLog(`🎉 ${playerNames[currentPlayerIdx]} reached 100 and WON!`)
        return
      }

      setLog(logMsg)
      setCurrentPlayerIdx((currentPlayerIdx + 1) % totalPlayers)
    }, 600)
  }

  function resetGame() {
    setPositions(Array(totalPlayers).fill(0))
    setCurrentPlayerIdx(0)
    setDiceVal(null)
    setIsRolling(false)
    setLog('Roll to start the game!')
    setWinner(null)
  }

  // Calculate 10x10 board grid from 100 down to 1
  const gridRows: number[][] = []
  for (let r = 9; r >= 0; r--) {
    const row: number[] = []
    for (let c = 0; c < 10; c++) {
      const num = r % 2 === 1 ? r * 10 + (10 - c) : r * 10 + c + 1
      row.push(num)
    }
    gridRows.push(row)
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
        marginBottom: 14, paddingTop: 'env(safe-area-inset-top, 0px)',
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

        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Snakes & Ladders</h1>

        <button onClick={resetGame} className="btn-touch" style={{
          padding: '6px 12px', borderRadius: 9999,
          background: isDark ? '#17171c' : '#ffffff', border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`,
          fontSize: 12, fontWeight: 700, color: isDark ? '#9ca3af' : '#6b7280', cursor: 'pointer',
        }}>
          Reset
        </button>
      </header>

      {/* Turn Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: isDark ? '#17171c' : '#ffffff', borderRadius: 16,
        border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`, padding: '10px 16px',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: PLAYER_COLORS[currentPlayerIdx].hex }} />
          <span style={{ fontSize: 13, fontWeight: 800 }}>Turn: {playerNames[currentPlayerIdx]}</span>
        </div>
        <button
          onClick={rollDice}
          disabled={isRolling || !!winner}
          className="btn-touch"
          style={{
            padding: '6px 16px', borderRadius: 9999,
            background: isDark ? 'linear-gradient(135deg, #ff453a, #ff6347)' : 'linear-gradient(135deg, #ff3b30, #ff5e36)',
            border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer'
          }}
        >
          {isRolling ? '...' : `Roll ${diceVal ? `(${diceVal})` : ''}`}
        </button>
      </div>

      {/* 10x10 Board */}
      <div style={{
        width: '100%', aspectRatio: '1', background: isDark ? '#121217' : '#ffffff',
        borderRadius: 20, border: `2px solid ${isDark ? '#272730' : '#e5e7eb'}`,
        display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gridTemplateRows: 'repeat(10, 1fr)',
        gap: 1, padding: 4, boxSizing: 'border-box', marginBottom: 12,
        boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.08)',
      }}>
        {gridRows.flatMap((row) =>
          row.map((cellNum) => {
            const hasSnake = SNAKES[cellNum]
            const hasLadder = LADDERS[cellNum]
            const playersHere = positions
              .map((pos, idx) => (pos === cellNum ? idx : null))
              .filter(idx => idx !== null) as number[]

            return (
              <div
                key={cellNum}
                style={{
                  background: isDark ? '#17171c' : '#f8f9fa',
                  border: `1px solid ${isDark ? '#22222c' : '#e5e7eb'}`,
                  borderRadius: 3, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'space-between',
                  padding: 1, boxSizing: 'border-box', position: 'relative',
                }}
              >
                <span style={{ fontSize: 7, fontWeight: 'bold', opacity: 0.6, alignSelf: 'flex-start' }}>{cellNum}</span>
                {hasSnake && <span style={{ fontSize: 9 }}>🐍</span>}
                {hasLadder && <span style={{ fontSize: 9 }}>🪜</span>}

                <div style={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {playersHere.map(pIdx => (
                    <div
                      key={pIdx}
                      style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: PLAYER_COLORS[pIdx].hex,
                        boxShadow: '0 0 4px rgba(0,0,0,0.5)'
                      }}
                    />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Log */}
      <div style={{
        background: isDark ? '#17171c' : '#ffffff', border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`,
        borderRadius: 14, padding: '8px 12px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: isDark ? '#9ca3af' : '#6b7280',
      }}>
        {log}
      </div>

      {/* Winner Modal */}
      {winner && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20
        }}>
          <div style={{
            background: isDark ? '#17171c' : '#ffffff', borderRadius: 24, padding: 24,
            maxWidth: 340, width: '100%', textAlign: 'center', boxSizing: 'border-box'
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px 0' }}>{winner} Won!</h2>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={resetGame} className="btn-touch" style={{
                flex: 1, padding: '12px', borderRadius: 14, background: isDark ? '#ff453a' : '#ff3b30',
                border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer'
              }}>
                Play Again
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

export default function SnakeLadder() {
  return (
    <Suspense fallback={<div style={{ color: '#888', textAlign: 'center', marginTop: 100 }}>Loading Snakes & Ladders...</div>}>
      <SnakeLadderContent />
    </Suspense>
  )
}
