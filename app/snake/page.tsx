'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import BottomNav from '@/components/BottomNav'

const GRID_SIZE = 16

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
type Position = { x: number; y: number }

export default function Snake() {
  const router = useRouter()
  const { effectiveTheme } = useTheme()
  const isDark = effectiveTheme === 'dark'

  const [snake, setSnake] = useState<Position[]>([
    { x: 8, y: 8 },
    { x: 8, y: 9 },
  ])
  const [food, setFood] = useState<Position>({ x: 4, y: 4 })
  const [dir, setDir] = useState<Direction>('UP')
  const [nextDir, setNextDir] = useState<Direction>('UP')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('pa_snake_high')
    if (saved) setHighScore(parseInt(saved, 10))
  }, [])

  const generateFood = useCallback((currentSnake: Position[]) => {
    while (true) {
      const rx = Math.floor(Math.random() * GRID_SIZE)
      const ry = Math.floor(Math.random() * GRID_SIZE)
      if (!currentSnake.some(p => p.x === rx && p.y === ry)) {
        return { x: rx, y: ry }
      }
    }
  }, [])

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (gameOver) return
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
        if (dir !== 'DOWN') setNextDir('UP')
        break
      case 'ArrowDown':
      case 's':
        if (dir !== 'UP') setNextDir('DOWN')
        break
      case 'ArrowLeft':
      case 'a':
        if (dir !== 'RIGHT') setNextDir('LEFT')
        break
      case 'ArrowRight':
      case 'd':
        if (dir !== 'LEFT') setNextDir('RIGHT')
        break
    }
  }, [dir, gameOver])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  useEffect(() => {
    if (gameOver || isPaused) return

    const interval = setInterval(() => {
      setDir(nextDir)
      setSnake(prevSnake => {
        const head = { ...prevSnake[0] }
        switch (nextDir) {
          case 'UP': head.y -= 1; break
          case 'DOWN': head.y += 1; break
          case 'LEFT': head.x -= 1; break
          case 'RIGHT': head.x += 1; break
        }

        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setGameOver(true)
          return prevSnake
        }

        if (prevSnake.some(p => p.x === head.x && p.y === head.y)) {
          setGameOver(true)
          return prevSnake
        }

        const newSnake = [head, ...prevSnake]
        if (head.x === food.x && head.y === food.y) {
          setScore(s => {
            const nextScore = s + 10
            if (nextScore > highScore) {
              setHighScore(nextScore)
              localStorage.setItem('pa_snake_high', String(nextScore))
            }
            return nextScore
          })
          setFood(generateFood(newSnake))
        } else {
          newSnake.pop()
        }

        return newSnake
      })
    }, 150)

    return () => clearInterval(interval)
  }, [nextDir, food, gameOver, isPaused, highScore, generateFood])

  function resetGame() {
    const initSnake = [{ x: 8, y: 8 }, { x: 8, y: 9 }]
    setSnake(initSnake)
    setDir('UP')
    setNextDir('UP')
    setFood(generateFood(initSnake))
    setScore(0)
    setGameOver(false)
    setIsPaused(false)
  }

  function handlePadClick(newDir: Direction) {
    if (gameOver) return
    if (newDir === 'UP' && dir !== 'DOWN') setNextDir('UP')
    if (newDir === 'DOWN' && dir !== 'UP') setNextDir('DOWN')
    if (newDir === 'LEFT' && dir !== 'RIGHT') setNextDir('LEFT')
    if (newDir === 'RIGHT' && dir !== 'LEFT') setNextDir('RIGHT')
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

        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Snake</h1>

        <button onClick={resetGame} className="btn-touch" style={{
          padding: '6px 12px', borderRadius: 9999,
          background: isDark ? '#17171c' : '#ffffff', border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`,
          fontSize: 12, fontWeight: 700, color: isDark ? '#9ca3af' : '#6b7280', cursor: 'pointer',
        }}>
          Reset
        </button>
      </header>

      {/* Score Box */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: isDark ? '#17171c' : '#ffffff', borderRadius: 16,
        border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`, padding: '10px 16px',
        marginBottom: 14,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Score: <b style={{ color: isDark ? '#ff453a' : '#ff3b30' }}>{score}</b></span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Best: <b style={{ color: '#10b981' }}>{highScore}</b></span>
      </div>

      {/* Snake Grid */}
      <div style={{
        width: '100%', aspectRatio: '1', background: isDark ? '#121217' : '#15803d15',
        borderRadius: 24, border: `2px solid ${isDark ? '#272730' : '#22c55e44'}`,
        display: 'grid', gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
        gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`, gap: 1, padding: 4,
        boxSizing: 'border-box', marginBottom: 20,
      }}>
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
          const x = idx % GRID_SIZE
          const y = Math.floor(idx / GRID_SIZE)
          const isHead = snake[0].x === x && snake[0].y === y
          const isBody = snake.slice(1).some(p => p.x === x && p.y === y)
          const isFood = food.x === x && food.y === y

          let cellBg = 'transparent'
          if (isHead) cellBg = '#22c55e'
          else if (isBody) cellBg = '#16a34a'
          else if (isFood) cellBg = '#ef4444'

          return (
            <div
              key={idx}
              style={{
                background: cellBg, borderRadius: isHead ? 6 : (isFood ? '50%' : 3),
                transition: 'background-color 0.1s ease',
              }}
            />
          )
        })}
      </div>

      {/* D-Pad Controls for Touch */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      }}>
        <button onClick={() => handlePadClick('UP')} className="btn-touch" style={{
          width: 54, height: 44, borderRadius: 12, background: isDark ? '#17171c' : '#ffffff',
          border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`, fontSize: 18, fontWeight: 'bold', cursor: 'pointer'
        }}>▲</button>
        <div style={{ display: 'flex', gap: 24 }}>
          <button onClick={() => handlePadClick('LEFT')} className="btn-touch" style={{
            width: 54, height: 44, borderRadius: 12, background: isDark ? '#17171c' : '#ffffff',
            border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`, fontSize: 18, fontWeight: 'bold', cursor: 'pointer'
          }}>◀</button>
          <button onClick={() => handlePadClick('RIGHT')} className="btn-touch" style={{
            width: 54, height: 44, borderRadius: 12, background: isDark ? '#17171c' : '#ffffff',
            border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`, fontSize: 18, fontWeight: 'bold', cursor: 'pointer'
          }}>▶</button>
        </div>
        <button onClick={() => handlePadClick('DOWN')} className="btn-touch" style={{
          width: 54, height: 44, borderRadius: 12, background: isDark ? '#17171c' : '#ffffff',
          border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`, fontSize: 18, fontWeight: 'bold', cursor: 'pointer'
        }}>▼</button>
      </div>

      {/* Game Over Modal */}
      {gameOver && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20
        }}>
          <div style={{
            background: isDark ? '#17171c' : '#ffffff', borderRadius: 24, padding: 24,
            maxWidth: 340, width: '100%', textAlign: 'center', boxSizing: 'border-box'
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🐍</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px 0' }}>Game Over!</h2>
            <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 20px 0' }}>
              Final Score: {score}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
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
