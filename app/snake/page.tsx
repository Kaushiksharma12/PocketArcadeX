'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

const GRID_SIZE = 16 // 16x16 grid

function SnakeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const p1 = decodeURIComponent(searchParams.get('p1') || 'Player')

  // Game States: 'intro' | 'playing' | 'gameover'
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'gameover'>('intro')
  const [snake, setSnake] = useState<{ r: number; c: number }[]>([])
  const [direction, setDirection] = useState<{ dr: number; dc: number }>({ dr: 0, dc: -1 })
  const [food, setFood] = useState<{ r: number; c: number }>({ r: 5, c: 5 })
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [newHighScoreAchieved, setNewHighScoreAchieved] = useState(false)

  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const directionRef = useRef(direction)

  // Load high score on mount
  useEffect(() => {
    const savedHighScore = localStorage.getItem('arcade_snake_highscore')
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10))
    }
  }, [])

  // Initialize game
  function initGame() {
    // Start snake in center
    const initialSnake = [
      { r: Math.floor(GRID_SIZE / 2), c: Math.floor(GRID_SIZE / 2) },
      { r: Math.floor(GRID_SIZE / 2), c: Math.floor(GRID_SIZE / 2) + 1 },
      { r: Math.floor(GRID_SIZE / 2), c: Math.floor(GRID_SIZE / 2) + 2 },
    ]
    setSnake(initialSnake)
    const initialDirection = { dr: 0, dc: -1 }
    setDirection(initialDirection)
    directionRef.current = initialDirection
    setScore(0)
    setNewHighScoreAchieved(false)
    spawnFood(initialSnake)
  }

  // Spawn food not on the snake body
  function spawnFood(currentSnake: { r: number; c: number }[]) {
    let newFood = { r: 0, c: 0 }
    let onSnake = true
    let attempts = 0
    while (onSnake && attempts < 1000) {
      newFood = {
        r: Math.floor(Math.random() * GRID_SIZE),
        c: Math.floor(Math.random() * GRID_SIZE),
      }
      onSnake = currentSnake.some(cell => cell.r === newFood.r && cell.c === newFood.c)
      attempts++
    }
    setFood(newFood)
  }

  // Start round gameplay
  function startPlaying() {
    initGame()
    setGameState('playing')
  }

  // Handle direction change safely
  function changeDirection(dr: number, dc: number) {
    const cur = directionRef.current
    // Prevent 180-degree turns
    if (cur.dr !== 0 && dr !== 0) return
    if (cur.dc !== 0 && dc !== 0) return

    const newDir = { dr, dc }
    setDirection(newDir)
    directionRef.current = newDir
  }

  // Listen to keyboard arrow keys
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (gameState !== 'playing') return
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        changeDirection(-1, 0)
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault()
        changeDirection(1, 0)
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        changeDirection(0, -1)
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        changeDirection(0, 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameState])

  // Core game tick loop
  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current)
      return
    }

    gameIntervalRef.current = setInterval(() => {
      setSnake(prevSnake => {
        if (prevSnake.length === 0) return prevSnake
        const head = prevSnake[0]
        const dir = directionRef.current
        const newHead = { r: head.r + dir.dr, c: head.c + dir.dc }

        // Wall Collision
        if (newHead.r < 0 || newHead.r >= GRID_SIZE || newHead.c < 0 || newHead.c >= GRID_SIZE) {
          handleCrash()
          return prevSnake
        }

        // Body Collision (excluding tail if it moves out)
        const selfCollision = prevSnake.slice(0, -1).some(cell => cell.r === newHead.r && cell.c === newHead.c)
        if (selfCollision) {
          handleCrash()
          return prevSnake
        }

        const newSnake = [newHead, ...prevSnake]

        // Food eating
        if (newHead.r === food.r && newHead.c === food.c) {
          setScore(s => {
            const nextScore = s + 1
            // Check high score progress in real-time
            if (nextScore > highScore) {
              setNewHighScoreAchieved(true)
            }
            return nextScore
          })
          spawnFood(newSnake)
        } else {
          newSnake.pop() // remove tail
        }

        return newSnake
      })
    }, 150)

    return () => {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current)
    }
  }, [gameState, food, highScore])

  // Handle crash
  function handleCrash() {
    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current)

    setGameState('gameover')
    setScore(currentScore => {
      const savedHighScore = localStorage.getItem('arcade_snake_highscore')
      const currentHighScore = savedHighScore ? parseInt(savedHighScore, 10) : 0
      if (currentScore > currentHighScore) {
        localStorage.setItem('arcade_snake_highscore', currentScore.toString())
        setHighScore(currentScore)
        setNewHighScoreAchieved(true)
      }
      return currentScore
    })
  }

  // Rematch entire game
  function resetAll() {
    setGameState('intro')
  }

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
        textShadow: '0 0 20px #ffaa00',
        marginBottom: 16, marginTop: 0,
      }}>ARCADE SNAKE</h1>

      {/* Screen 1: Intro / ready */}
      {gameState === 'intro' && (
        <div style={{
          background: '#0d0d20',
          border: '2px solid #ffaa00',
          borderRadius: 20,
          padding: '30px 20px',
          width: '100%',
          maxWidth: 340,
          textAlign: 'center',
          boxShadow: '0 0 20px rgba(255, 170, 0, 0.2)',
          boxSizing: 'border-box',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🐍</div>
          <h2 style={{ color: '#ffaa00', fontSize: 16, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 10px 0' }}>
            READY PLAYER 1
          </h2>
          <h3 style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', margin: '0 0 20px 0' }}>
            {p1.toUpperCase()}
          </h3>
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 24
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#555', letterSpacing: 1 }}>HIGH SCORE</div>
              <div style={{ fontSize: 22, fontWeight: 'bold', color: '#ffaa00' }}>{highScore}</div>
            </div>
          </div>
          <p style={{ color: '#666', fontSize: 11, lineHeight: '1.6', margin: '0 0 24px 0' }}>
            Eat the yellow apples. Avoid the walls and your own tail. Use arrow/WASD keys or the D-pad below to steer.
          </p>
          <button onClick={startPlaying} className="btn-touch" style={{
            width: '100%', padding: '16px',
            background: 'linear-gradient(135deg, #ffaa00, #d97706)',
            border: 'none', borderRadius: 12,
            color: '#fff', fontSize: 14, fontWeight: 'bold',
            letterSpacing: 2, cursor: 'pointer',
            outline: 'none',
            WebkitTapHighlightColor: 'transparent',
            boxShadow: '0 4px 15px rgba(255, 170, 0, 0.3)'
          }}>
            START PLAYING →
          </button>
        </div>
      )}

      {/* Screen 2: Playing State */}
      {gameState === 'playing' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 340 }}>
          {/* HUD info */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            width: '100%', color: '#fff', fontSize: 11,
            marginBottom: 10, letterSpacing: 1
          }}>
            <span style={{ color: '#ffaa00' }}>{p1.toUpperCase()}</span>
            <span>SCORE: <b style={{ fontSize: 13, color: '#00ff88' }}>{score}</b></span>
            <span>BEST: <b style={{ fontSize: 13, color: '#ffaa00' }}>{Math.max(highScore, score)}</b></span>
          </div>

          {/* Grid board */}
          <div style={{
            background: '#04040e',
            border: '3px solid #ffaa00',
            borderRadius: 12,
            width: '100%',
            aspectRatio: '1',
            boxSizing: 'border-box',
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
            padding: 4,
            gap: 1,
            boxShadow: '0 0 20px rgba(255, 170, 0, 0.15)',
            marginBottom: 20
          }}>
            {Array.from({ length: GRID_SIZE }).map((_, r) => (
              Array.from({ length: GRID_SIZE }).map((_, c) => {
                const isHead = snake[0]?.r === r && snake[0]?.c === c
                const isBody = snake.slice(1).some(cell => cell.r === r && cell.c === c)
                const isFood = food.r === r && food.c === c

                return (
                  <div
                    key={`${r}-${c}`}
                    style={{
                      background: isHead
                        ? '#ffaa00'
                        : isBody
                          ? '#d97706'
                          : isFood
                            ? '#00ff88'
                            : 'transparent',
                      borderRadius: isHead || isFood ? '50%' : '2px',
                      boxShadow: isHead
                        ? '0 0 8px #ffaa00'
                        : isFood
                          ? '0 0 8px #00ff88'
                          : 'none',
                    }}
                  />
                )
              })
            ))}
          </div>

          {/* D-pad controls */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: 160,
            marginBottom: 10
          }}>
            {/* UP button */}
            <button
              onClick={() => changeDirection(-1, 0)}
              className="btn-touch"
              style={{
                width: 50, height: 50,
                background: '#12122b', border: '2px solid #ffaa00',
                borderRadius: 10, color: '#ffaa00', fontSize: 18,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(255, 170, 0, 0.2)', margin: '0 0 6px 0',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              ▲
            </button>
            {/* LEFT / RIGHT row */}
            <div style={{ display: 'flex', gap: 32, justifyContent: 'center', width: '100%' }}>
              <button
                onClick={() => changeDirection(0, -1)}
                className="btn-touch"
                style={{
                  width: 50, height: 50,
                  background: '#12122b', border: '2px solid #ffaa00',
                  borderRadius: 10, color: '#ffaa00', fontSize: 18,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(255, 170, 0, 0.2)',
                  outline: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                ◀
              </button>
              <button
                onClick={() => changeDirection(0, 1)}
                className="btn-touch"
                style={{
                  width: 50, height: 50,
                  background: '#12122b', border: '2px solid #ffaa00',
                  borderRadius: 10, color: '#ffaa00', fontSize: 18,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(255, 170, 0, 0.2)',
                  outline: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                ▶
              </button>
            </div>
            {/* DOWN button */}
            <button
              onClick={() => changeDirection(1, 0)}
              className="btn-touch"
              style={{
                width: 50, height: 50,
                background: '#12122b', border: '2px solid #ffaa00',
                borderRadius: 10, color: '#ffaa00', fontSize: 18,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(255, 170, 0, 0.2)', margin: '6px 0 0 0',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              ▼
            </button>
          </div>
        </div>
      )}

      {/* Screen 3: Game Over overlay modal */}
      {gameState === 'gameover' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 5, 15, 0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: 16
        }}>
          <div style={{
            background: '#0d0d20',
            border: `2px solid ${newHighScoreAchieved ? '#00ff88' : '#ffaa00'}`,
            borderRadius: 20,
            padding: '32px 24px',
            width: '100%',
            maxWidth: 340,
            textAlign: 'center',
            boxShadow: `0 0 24px ${newHighScoreAchieved ? '#00ff88' : '#ffaa00'}44`,
            boxSizing: 'border-box'
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {newHighScoreAchieved ? '👑' : '💥'}
            </div>
            <h2 style={{
              color: newHighScoreAchieved ? '#00ff88' : '#ffaa00',
              fontSize: 18, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 8px 0',
              textShadow: `0 0 10px ${newHighScoreAchieved ? '#00ff88' : '#ffaa00'}`
            }}>
              {newHighScoreAchieved ? 'NEW RECORD!' : 'GAME OVER!'}
            </h2>
            <p style={{ color: '#fff', fontSize: 15, margin: '0 0 24px 0' }}>
              {p1.toUpperCase()}'S SCORE: <b style={{ color: '#00ff88', fontSize: 20 }}>{score}</b>
            </p>

            <div style={{
              background: '#12122b', border: '1px solid #20204a',
              borderRadius: 12, padding: '12px', marginBottom: 24
            }}>
              <span style={{ color: '#666', fontSize: 10, letterSpacing: 1, display: 'block', marginBottom: 2 }}>PERSONAL BEST</span>
              <span style={{ color: '#ffaa00', fontSize: 22, fontWeight: 'bold' }}>{highScore}</span>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={resetAll} className="btn-touch" style={{
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
                ↺ PLAY AGAIN
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

export default function Snake() {
  return (
    <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center', marginTop: 100 }}>Loading Snake...</div>}>
      <SnakeContent />
    </Suspense>
  )
}
