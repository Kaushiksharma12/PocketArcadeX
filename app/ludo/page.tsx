'use client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import BottomNav from '@/components/BottomNav'

// Board grid: 15 rows x 15 columns
const BOARD_SIZE = 15

// Outer track coordinates (52 spaces)
const TRACK_COORDS: [number, number][] = [
  [6, 1],  [6, 2],  [6, 3],  [6, 4],  [6, 5],
  [5, 6],  [4, 6],  [3, 6],  [2, 6],  [1, 6],  [0, 6],
  [0, 7],
  [0, 8],  [1, 8],  [2, 8],  [3, 8],  [4, 8],  [5, 8],
  [6, 9],  [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8],  [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5],  [8, 4],  [8, 3],  [8, 2],  [8, 1],  [8, 0],
  [7, 0],
  [6, 0]
]

// Safe spots
const SAFE_TRACK_INDICES = [0, 8, 13, 21, 26, 34, 39, 47]

interface PlayerConfig {
  id: string
  name: string
  color: string
  accentColor: string
  homeBg: string
  startIdx: number
  homeExitIdx: number
  homeLane: [number, number][]
  basePositions: [number, number][]
  emoji: string
}

const PLAYERS_CONFIG: PlayerConfig[] = [
  {
    id: 'red',
    name: 'Red',
    color: '#ef4444',
    accentColor: '#fca5a5',
    homeBg: '#ef444415',
    startIdx: 39,
    homeExitIdx: 37,
    homeLane: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
    basePositions: [[11, 2], [11, 3], [12, 2], [12, 3]],
    emoji: '🔴'
  },
  {
    id: 'blue',
    name: 'Blue',
    color: '#3b82f6',
    accentColor: '#93c5fd',
    homeBg: '#3b82f615',
    startIdx: 26,
    homeExitIdx: 24,
    homeLane: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
    basePositions: [[2, 11], [2, 12], [3, 11], [3, 12]],
    emoji: '🔵'
  },
  {
    id: 'green',
    name: 'Green',
    color: '#22c55e',
    accentColor: '#86efac',
    homeBg: '#22c55e15',
    startIdx: 0,
    homeExitIdx: 50,
    homeLane: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    basePositions: [[11, 11], [11, 12], [12, 11], [12, 12]],
    emoji: '🟢'
  },
  {
    id: 'yellow',
    name: 'Yellow',
    color: '#eab308',
    accentColor: '#fef08a',
    homeBg: '#eab30815',
    startIdx: 13,
    homeExitIdx: 11,
    homeLane: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
    basePositions: [[2, 2], [2, 3], [3, 2], [3, 3]],
    emoji: '🟡'
  }
]

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

const ARM_CELLS: { r: number; c: number }[] = []
for (let r = 0; r < 15; r++) {
  for (let c = 0; c < 15; c++) {
    if (r < 6 && c < 6) continue
    if (r < 6 && c > 8) continue
    if (r > 8 && c < 6) continue
    if (r > 8 && c > 8) continue
    if (r >= 6 && r <= 8 && c >= 6 && c <= 8) continue
    ARM_CELLS.push({ r, c })
  }
}

interface TokenState {
  playerId: string
  tokenId: number
  posType: 'base' | 'track' | 'homeLane' | 'done'
  trackIdx: number
  homeLaneIdx: number
  stepCount: number
}

function LudoContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { effectiveTheme } = useTheme()
  const isDark = effectiveTheme === 'dark'

  const p1 = decodeURIComponent(searchParams.get('p1') || 'Player 1')
  const p2 = decodeURIComponent(searchParams.get('p2') || 'Player 2')
  const p3 = decodeURIComponent(searchParams.get('p3') || 'Player 3')
  const p4 = decodeURIComponent(searchParams.get('p4') || 'Player 4')

  const activeNames = [p1, p2, p3, p4].filter(Boolean)
  const playerCount = Math.max(2, activeNames.length)

  const activePlayers = PLAYERS_CONFIG.slice(0, playerCount).map((cfg, idx) => ({
    ...cfg,
    displayName: activeNames[idx] || cfg.name
  }))

  const [tokens, setTokens] = useState<TokenState[]>(() => {
    const initialTokens: TokenState[] = []
    activePlayers.forEach((player) => {
      for (let i = 0; i < 4; i++) {
        initialTokens.push({
          playerId: player.id,
          tokenId: i,
          posType: 'base',
          trackIdx: 0,
          homeLaneIdx: 0,
          stepCount: 0,
        })
      }
    })
    return initialTokens
  })

  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0)
  const [diceVal, setDiceVal] = useState<number | null>(null)
  const [isRolling, setIsRolling] = useState(false)
  const [hasRolled, setHasRolled] = useState(false)
  const [movableTokenIds, setMovableTokenIds] = useState<number[]>([])
  const [log, setLog] = useState<string>('Roll to start the game!')
  const [winner, setWinner] = useState<string | null>(null)
  const [consecutiveSixes, setConsecutiveSixes] = useState(0)
  const [rankings, setRankings] = useState<string[]>([])
  const [isPaused, setIsPaused] = useState(false)

  const currentPlayer = activePlayers[currentPlayerIdx]

  function rollDice() {
    if (isRolling || hasRolled || winner || isPaused) return

    setIsRolling(true)
    const rollInterval = setInterval(() => {
      setDiceVal(Math.floor(Math.random() * 6) + 1)
    }, 80)

    setTimeout(() => {
      clearInterval(rollInterval)
      const finalVal = Math.floor(Math.random() * 6) + 1
      setDiceVal(finalVal)
      setIsRolling(false)
      setHasRolled(true)

      if (finalVal === 6) {
        const nextSixes = consecutiveSixes + 1
        setConsecutiveSixes(nextSixes)
        if (nextSixes === 3) {
          setLog(`Three 6s! Turn forfeited.`)
          setConsecutiveSixes(0)
          setTimeout(() => {
            passTurn()
          }, 1500)
          return
        }
      } else {
        setConsecutiveSixes(0)
      }
      evaluateMoves(finalVal)
    }, 800)
  }

  function evaluateMoves(roll: number) {
    const playerTokens = tokens.filter(t => t.playerId === currentPlayer.id)
    const movableIds: number[] = []

    playerTokens.forEach(token => {
      if (token.posType === 'base') {
        if (roll === 6) {
          movableIds.push(token.tokenId)
        }
      } else if (token.posType === 'track') {
        movableIds.push(token.tokenId)
      } else if (token.posType === 'homeLane') {
        const stepsNeeded = 57 - token.stepCount
        if (roll <= stepsNeeded) {
          movableIds.push(token.tokenId)
        }
      }
    })

    setMovableTokenIds(movableIds)

    if (movableIds.length === 0) {
      setLog(`${currentPlayer.displayName} rolled ${roll} - No valid moves!`)
      setTimeout(() => {
        passTurn()
      }, 1500)
    } else {
      setLog(`${currentPlayer.displayName} rolled ${roll}! Tap a token to move.`)
    }
  }

  function executeTokenMove(tokenId: number) {
    if (!hasRolled || !movableTokenIds.includes(tokenId) || !diceVal || winner || isPaused) return

    const roll = diceVal
    const rolledSix = roll === 6

    const updatedTokens = tokens.map(token => {
      if (token.playerId !== currentPlayer.id || token.tokenId !== tokenId) return token

      const newPos = { ...token }

      if (token.posType === 'base') {
        newPos.posType = 'track'
        newPos.trackIdx = currentPlayer.startIdx
        newPos.stepCount = 1
      } else if (token.posType === 'track') {
        let stepsLeft = roll
        let currentIdx = token.trackIdx
        let stepsAccum = token.stepCount

        while (stepsLeft > 0) {
          if (currentIdx === currentPlayer.homeExitIdx) {
            newPos.posType = 'homeLane'
            newPos.homeLaneIdx = 0
            newPos.stepCount = stepsAccum + 1
            stepsLeft--

            if (stepsLeft > 0) {
              const targetLaneIdx = newPos.homeLaneIdx + stepsLeft
              if (targetLaneIdx === 5) {
                newPos.posType = 'done'
                newPos.stepCount = 57
              } else {
                newPos.homeLaneIdx = targetLaneIdx
                newPos.stepCount += stepsLeft
              }
              stepsLeft = 0
            }
            break
          } else {
            currentIdx = (currentIdx + 1) % 52
            stepsAccum++
            stepsLeft--
          }
        }

        if (newPos.posType === 'track') {
          newPos.trackIdx = currentIdx
          newPos.stepCount = stepsAccum
        }
      } else if (token.posType === 'homeLane') {
        const newLaneIdx = token.homeLaneIdx + roll
        if (newLaneIdx === 5) {
          newPos.posType = 'done'
          newPos.stepCount = 57
        } else {
          newPos.homeLaneIdx = newLaneIdx
          newPos.stepCount = token.stepCount + roll
        }
      }

      return newPos
    })

    const movedToken = updatedTokens.find(t => t.playerId === currentPlayer.id && t.tokenId === tokenId)!
    let capturedAny = false

    if (movedToken.posType === 'track') {
      const isSafeSpot = SAFE_TRACK_INDICES.includes(movedToken.trackIdx)
      if (!isSafeSpot) {
        updatedTokens.forEach(otherToken => {
          if (otherToken.playerId !== currentPlayer.id && otherToken.posType === 'track' && otherToken.trackIdx === movedToken.trackIdx) {
            otherToken.posType = 'base'
            otherToken.stepCount = 0
            otherToken.trackIdx = 0
            otherToken.homeLaneIdx = 0
            capturedAny = true
            setLog(`💥 ${currentPlayer.displayName} captured ${otherToken.playerId.toUpperCase()}'s token!`)
          }
        })
      }
    }

    const originalToken = tokens.find(t => t.playerId === currentPlayer.id && t.tokenId === tokenId)!
    const reachedHome = originalToken.posType !== 'done' && movedToken.posType === 'done'

    setTokens(updatedTokens)

    const playerTokens = updatedTokens.filter(t => t.playerId === currentPlayer.id)
    const allDone = playerTokens.every(t => t.posType === 'done')

    let gameFinished = false
    const updatedRankings = [...rankings]
    if (allDone && !rankings.includes(currentPlayer.id)) {
      updatedRankings.push(currentPlayer.id)
      setLog(`🎉 ${currentPlayer.displayName} finished all tokens!`)

      const activePlayersRemaining = activePlayers.filter(p => !updatedRankings.includes(p.id))
      if (activePlayersRemaining.length <= 1) {
        if (activePlayersRemaining.length === 1) {
          updatedRankings.push(activePlayersRemaining[0].id)
        }
        setWinner(activePlayers.find(p => p.id === updatedRankings[0])!.displayName)
        gameFinished = true
      }
      setRankings(updatedRankings)
    }

    if (gameFinished) return

    if (allDone) {
      setTimeout(() => {
        passTurnWithRankings(currentPlayerIdx, updatedRankings)
      }, 1500)
      return
    }

    const getExtraRoll = rolledSix || capturedAny || reachedHome
    if (getExtraRoll) {
      setHasRolled(false)
      setDiceVal(null)
      setMovableTokenIds([])
      if (reachedHome) {
        setLog(`🎉 Token reached Home! Extra roll!`)
      } else if (!capturedAny) {
        setLog(`${currentPlayer.displayName} rolled a 6! Extra roll!`)
      }
    } else {
      passTurnWithRankings(currentPlayerIdx, updatedRankings)
    }
  }

  function passTurnWithRankings(currentIdx: number, activeRankings: string[]) {
    if (winner) return
    let nextIdx = (currentIdx + 1) % playerCount
    let attempts = 0
    while (activeRankings.includes(activePlayers[nextIdx].id) && attempts < playerCount) {
      nextIdx = (nextIdx + 1) % playerCount
      attempts++
    }
    setCurrentPlayerIdx(nextIdx)
    setHasRolled(false)
    setDiceVal(null)
    setMovableTokenIds([])
  }

  function passTurn() {
    passTurnWithRankings(currentPlayerIdx, rankings)
  }

  function resetGame() {
    const initialTokens: TokenState[] = []
    activePlayers.forEach((player) => {
      for (let i = 0; i < 4; i++) {
        initialTokens.push({
          playerId: player.id,
          tokenId: i,
          posType: 'base',
          trackIdx: 0,
          homeLaneIdx: 0,
          stepCount: 0,
        })
      }
    })
    setTokens(initialTokens)
    setCurrentPlayerIdx(0)
    setDiceVal(null)
    setIsRolling(false)
    setHasRolled(false)
    setMovableTokenIds([])
    setLog('Roll to start the game!')
    setWinner(null)
    setConsecutiveSixes(0)
    setRankings([])
    setIsPaused(false)
  }

  function getTokenCoordinates(token: TokenState): [number, number] {
    const pCfg = activePlayers.find(p => p.id === token.playerId)!
    if (token.posType === 'base') return pCfg.basePositions[token.tokenId]
    if (token.posType === 'track') return TRACK_COORDS[token.trackIdx]
    if (token.posType === 'homeLane') return pCfg.homeLane[token.homeLaneIdx]
    return [7, 7]
  }

  return (
    <main style={{
      minHeight: '100dvh',
      maxWidth: 500,
      margin: '0 auto',
      background: isDark ? '#0b0b0e' : '#f8f9fa',
      color: isDark ? '#f9fafb' : '#111827',
      padding: '12px 14px 84px 14px',
      boxSizing: 'border-box',
      position: 'relative',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      transition: 'background-color 0.3s ease, color 0.3s ease',
    }}>

      {/* Top Header Controls (Back button, Dice readout, Settings) */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <button
          onClick={() => router.back()}
          className="btn-touch"
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: isDark ? '#17171c' : '#ffffff',
            border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDark ? '#f9fafb' : '#111827',
            cursor: 'pointer',
            boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        {/* Dice Display Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: isDark ? '#17171c' : '#ffffff',
          borderRadius: 9999,
          border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`,
          padding: '4px 14px',
          boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <span style={{ fontSize: 18 }}>
            {diceVal !== null ? DICE_FACES[diceVal - 1] : '🎲'}
          </span>
          <span style={{
            fontSize: 12,
            fontWeight: 800,
            color: currentPlayer.color,
            textTransform: 'uppercase',
          }}>
            {currentPlayer.displayName}
          </span>
        </div>

        <button
          onClick={() => setIsPaused(!isPaused)}
          className="btn-touch"
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: isDark ? '#17171c' : '#ffffff',
            border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDark ? '#9ca3af' : '#6b7280',
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="10" y1="15" x2="10" y2="9" />
            <line x1="14" y1="15" x2="14" y2="9" />
          </svg>
        </button>
      </header>

      {/* Top Players Row (Player 1 Red & Player 2 Blue) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
      }}>
        {/* Player 1 Red */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: currentPlayerIdx === 0 ? '#ef444422' : (isDark ? '#17171c' : '#ffffff'),
          border: `1.5px solid ${currentPlayerIdx === 0 ? '#ef4444' : (isDark ? '#272730' : '#e5e7eb')}`,
          borderRadius: 9999,
          padding: '4px 10px',
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#ffffff' : '#111827' }}>
            {activePlayers[0]?.displayName}
          </span>
        </div>

        {/* Player 2 Blue */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: currentPlayerIdx === 1 ? '#3b82f622' : (isDark ? '#17171c' : '#ffffff'),
          border: `1.5px solid ${currentPlayerIdx === 1 ? '#3b82f6' : (isDark ? '#272730' : '#e5e7eb')}`,
          borderRadius: 9999,
          padding: '4px 10px',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#ffffff' : '#111827' }}>
            {activePlayers[1]?.displayName}
          </span>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }} />
        </div>
      </div>

      {/* 15x15 Ludo Board */}
      <div style={{
        width: '100%',
        aspectRatio: '1',
        background: isDark ? '#121217' : '#ffffff',
        border: `3px solid ${isDark ? '#272730' : '#e5e7eb'}`,
        borderRadius: 24,
        padding: 6,
        boxSizing: 'border-box',
        boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.08)',
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
        gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
        gap: 1,
        marginBottom: 10,
      }}>

        {/* Red Home Base (Top Left) */}
        <div style={{
          gridRow: '1 / 7', gridColumn: '1 / 7',
          background: '#ef4444', border: '3px solid #b91c1c',
          borderRadius: 14, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ width: '65%', height: '65%', background: '#ffffff', borderRadius: 10 }} />
        </div>

        {/* Yellow Home Base (Top Right) */}
        <div style={{
          gridRow: '1 / 7', gridColumn: '10 / 16',
          background: '#eab308', border: '3px solid #a16207',
          borderRadius: 14, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ width: '65%', height: '65%', background: '#ffffff', borderRadius: 10 }} />
        </div>

        {/* Red Home Base (Bottom Left) */}
        <div style={{
          gridRow: '10 / 16', gridColumn: '1 / 7',
          background: '#22c55e', border: '3px solid #15803d',
          borderRadius: 14, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ width: '65%', height: '65%', background: '#ffffff', borderRadius: 10 }} />
        </div>

        {/* Blue Home Base (Bottom Right) */}
        <div style={{
          gridRow: '10 / 16', gridColumn: '10 / 16',
          background: '#3b82f6', border: '3px solid #1d4ed8',
          borderRadius: 14, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ width: '65%', height: '65%', background: '#ffffff', borderRadius: 10 }} />
        </div>

        {/* Center Goal */}
        <div style={{
          gridRow: '7 / 10', gridColumn: '7 / 10',
          background: isDark ? '#1a1a24' : '#f3f4f6',
          border: `2px solid ${isDark ? '#272730' : '#d1d5db'}`,
          borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', zIndex: 2
        }}>
          <div style={{ fontSize: 18 }}>⭐</div>
        </div>

        {/* Track Arm Grid Cells */}
        {ARM_CELLS.map(({ r, c }) => {
          let cellBg = isDark ? '#17171c' : '#f9fafb'
          let borderCol = isDark ? '#272730' : '#e5e7eb'

          const isRedLane = c === 7 && r >= 1 && r <= 5
          const isGreenLane = r === 7 && c >= 1 && c <= 5
          const isYellowLane = r === 7 && c >= 9 && c <= 13
          const isBlueLane = c === 7 && r >= 9 && r <= 13

          if (isRedLane) { cellBg = '#ef4444'; borderCol = '#b91c1c' }
          if (isGreenLane) { cellBg = '#22c55e'; borderCol = '#15803d' }
          if (isYellowLane) { cellBg = '#eab308'; borderCol = '#a16207' }
          if (isBlueLane) { cellBg = '#3b82f6'; borderCol = '#1d4ed8' }

          if (r === 6 && c === 1) { cellBg = '#22c55e' }
          if (r === 1 && c === 8) { cellBg = '#ef4444' }
          if (r === 8 && c === 13) { cellBg = '#eab308' }
          if (r === 13 && c === 6) { cellBg = '#3b82f6' }

          const trackIndex = TRACK_COORDS.findIndex(([tr, tc]) => tr === r && tc === c)
          const isSafe = trackIndex !== -1 && SAFE_TRACK_INDICES.includes(trackIndex)

          return (
            <div
              key={`${r}-${c}`}
              style={{
                gridRow: r + 1,
                gridColumn: c + 1,
                background: cellBg,
                border: `1px solid ${borderCol}`,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isSafe && <span style={{ fontSize: 8, opacity: 0.6 }}>⭐</span>}
            </div>
          )
        })}

        {/* Render Tokens */}
        {tokens.map((token) => {
          const pCfg = PLAYERS_CONFIG.find(p => p.id === token.playerId)!
          const [r, c] = getTokenCoordinates(token)
          const isMovable = hasRolled && token.playerId === currentPlayer.id && movableTokenIds.includes(token.tokenId)
          if (token.posType === 'done') return null

          return (
            <div
              key={`${token.playerId}-${token.tokenId}`}
              onClick={() => isMovable && executeTokenMove(token.tokenId)}
              style={{
                gridRow: r + 1,
                gridColumn: c + 1,
                width: '82%',
                height: '82%',
                margin: 'auto',
                borderRadius: '50%',
                background: pCfg.color,
                border: `2px solid ${isMovable ? '#ffffff' : '#00000033'}`,
                boxShadow: isMovable ? `0 0 12px #ffffff, 0 0 14px ${pCfg.color}` : '0 2px 4px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isMovable ? 'pointer' : 'default',
                zIndex: isMovable ? 20 : 10,
                transform: isMovable ? 'scale(1.15)' : 'scale(1)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff' }} />
            </div>
          )
        })}
      </div>

      {/* Bottom Players Row & Action Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
      }}>
        {/* Player 3 Green */}
        {activePlayers[2] && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: currentPlayerIdx === 2 ? '#22c55e22' : (isDark ? '#17171c' : '#ffffff'),
            border: `1.5px solid ${currentPlayerIdx === 2 ? '#22c55e' : (isDark ? '#272730' : '#e5e7eb')}`,
            borderRadius: 9999,
            padding: '4px 10px',
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#ffffff' : '#111827' }}>
              {activePlayers[2].displayName}
            </span>
          </div>
        )}

        {/* Action Controls & Roll Dice Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="btn-touch"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: isDark ? '#17171c' : '#ffffff',
              border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#9ca3af' : '#6b7280',
              cursor: 'pointer',
            }}
          >
            ⏸
          </button>

          <button
            onClick={resetGame}
            className="btn-touch"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: isDark ? '#17171c' : '#ffffff',
              border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#9ca3af' : '#6b7280',
              cursor: 'pointer',
            }}
          >
            ⚙
          </button>

          {/* Roll Dice Button */}
          <button
            onClick={rollDice}
            disabled={isRolling || hasRolled || !!winner || isPaused}
            className="btn-touch"
            style={{
              padding: '10px 20px',
              borderRadius: 9999,
              background: isRolling || hasRolled || winner || isPaused
                ? (isDark ? '#272730' : '#e5e7eb')
                : (isDark ? 'linear-gradient(135deg, #ff453a, #ff6347)' : 'linear-gradient(135deg, #ff3b30, #ff5e36)'),
              border: 'none',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 800,
              cursor: isRolling || hasRolled || winner || isPaused ? 'not-allowed' : 'pointer',
              opacity: isRolling || hasRolled || winner || isPaused ? 0.6 : 1,
              boxShadow: isRolling || hasRolled || winner || isPaused
                ? 'none'
                : (isDark ? '0 4px 14px rgba(255, 69, 58, 0.4)' : '0 4px 14px rgba(255, 59, 48, 0.35)'),
            }}
          >
            {isRolling ? 'Rolling...' : hasRolled ? 'Tap Token' : 'Roll Dice'}
          </button>
        </div>

        {/* Player 4 Yellow */}
        {activePlayers[3] && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: currentPlayerIdx === 3 ? '#eab30822' : (isDark ? '#17171c' : '#ffffff'),
            border: `1.5px solid ${currentPlayerIdx === 3 ? '#eab308' : (isDark ? '#272730' : '#e5e7eb')}`,
            borderRadius: 9999,
            padding: '4px 10px',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#ffffff' : '#111827' }}>
              {activePlayers[3].displayName}
            </span>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#eab308' }} />
          </div>
        )}
      </div>

      {/* Log feed readout */}
      <div style={{
        background: isDark ? '#17171c' : '#ffffff',
        border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`,
        borderRadius: 14,
        padding: '8px 12px',
        textAlign: 'center',
        fontSize: 11,
        fontWeight: 600,
        color: isDark ? '#9ca3af' : '#6b7280',
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
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px 0' }}>Match Completed!</h2>
            <p style={{ fontSize: 15, fontWeight: 700, color: currentPlayer.color, margin: '0 0 20px 0' }}>
              {winner} Wins the Game!
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={resetGame}
                className="btn-touch"
                style={{
                  flex: 1, padding: '12px', borderRadius: 14,
                  background: isDark ? '#ff453a' : '#ff3b30', border: 'none',
                  color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer'
                }}
              >
                Rematch
              </button>
              <button
                onClick={() => router.push('/games')}
                className="btn-touch"
                style={{
                  flex: 1, padding: '12px', borderRadius: 14,
                  background: isDark ? '#272730' : '#e5e7eb', border: 'none',
                  color: isDark ? '#fff' : '#111827', fontSize: 13, fontWeight: 800, cursor: 'pointer'
                }}
              >
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

export default function Ludo() {
  return (
    <Suspense fallback={<div style={{ color: '#888', textAlign: 'center', marginTop: 100 }}>Loading Ludo...</div>}>
      <LudoContent />
    </Suspense>
  )
}