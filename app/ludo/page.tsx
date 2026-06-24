'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

// Board grid: 15 rows x 15 columns
const BOARD_SIZE = 15

// Outer track coordinates (52 spaces) starting near green exit, tracing clockwise
const TRACK_COORDS: [number, number][] = [
  [6, 1],  [6, 2],  [6, 3],  [6, 4],  [6, 5],  // Green start and track
  [5, 6],  [4, 6],  [3, 6],  [2, 6],  [1, 6],  [0, 6],
  [0, 7],  // Top middle cross
  [0, 8],  [1, 8],  [2, 8],  [3, 8],  [4, 8],  [5, 8],  // Yellow track
  [6, 9],  [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], // Right middle cross
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],  // Blue track
  [9, 8],  [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], // Bottom middle cross
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],  // Red track
  [8, 5],  [8, 4],  [8, 3],  [8, 2],  [8, 1],  [8, 0],
  [7, 0],  // Left middle cross
  [6, 0]   // Closing tile
]

// Safe spots (indices on the 52-tile TRACK_COORDS)
const SAFE_TRACK_INDICES = [0, 8, 13, 21, 26, 34, 39, 47]

interface PlayerConfig {
  id: string
  name: string
  color: string
  accentColor: string
  homeBg: string
  startIdx: number      // index in TRACK_COORDS
  homeExitIdx: number   // index in TRACK_COORDS where token exits to home lane
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
    homeBg: '#3f1a1a',
    startIdx: 39,
    homeExitIdx: 37,
    homeLane: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
    basePositions: [[11, 2], [11, 3], [12, 2], [12, 3]],
    emoji: '🔴'
  },
  {
    id: 'green',
    name: 'Green',
    color: '#22c55e',
    accentColor: '#86efac',
    homeBg: '#1b3f1b',
    startIdx: 0,
    homeExitIdx: 50,
    homeLane: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    basePositions: [[2, 2], [2, 3], [3, 2], [3, 3]],
    emoji: '🟢'
  },
  {
    id: 'yellow',
    name: 'Yellow',
    color: '#eab308',
    accentColor: '#fef08a',
    homeBg: '#3f3a1a',
    startIdx: 13,
    homeExitIdx: 11,
    homeLane: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
    basePositions: [[2, 11], [2, 12], [3, 11], [3, 12]],
    emoji: '🟡'
  },
  {
    id: 'blue',
    name: 'Blue',
    color: '#3b82f6',
    accentColor: '#93c5fd',
    homeBg: '#1b2b3f',
    startIdx: 26,
    homeExitIdx: 24,
    homeLane: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
    basePositions: [[11, 11], [11, 12], [12, 11], [12, 12]],
    emoji: '🔵'
  }
]

// Map dice values to standard Unicode dice faces
const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

// Coordinates of the 72 arm squares (non-home, non-goal cells)
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
  // position state: 'base' | 'track' | 'homeLane' | 'done'
  posType: 'base' | 'track' | 'homeLane' | 'done'
  trackIdx: number    // if 'track', index in TRACK_COORDS (0..51)
  homeLaneIdx: number // if 'homeLane', index in player's homeLane (0..4)
  stepCount: number   // total steps taken (0 to 57, where 57 is home goal)
}

function LudoContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Get players from search params
  const p1 = decodeURIComponent(searchParams.get('p1') || 'Player 1')
  const p2 = decodeURIComponent(searchParams.get('p2') || 'Player 2')
  const p3 = decodeURIComponent(searchParams.get('p3') || '')
  const p4 = decodeURIComponent(searchParams.get('p4') || '')

  const activeNames = [p1, p2, p3, p4].filter(Boolean)
  const playerCount = activeNames.length

  // Select the subset of player configs based on active player count
  // Standard arrangement:
  // 2 players: Red & Green
  // 3 players: Red, Green, Yellow
  // 4 players: Red, Green, Yellow, Blue
  const activePlayers = PLAYERS_CONFIG.slice(0, playerCount).map((cfg, idx) => ({
    ...cfg,
    displayName: activeNames[idx]
  }))

  // Game state
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
  const [log, setLog] = useState<string>('Welcome to Arcade Ludo! Roll to start.')
  const [winner, setWinner] = useState<string | null>(null)
  const [consecutiveSixes, setConsecutiveSixes] = useState(0)
  const [rankings, setRankings] = useState<string[]>([])

  const currentPlayer = activePlayers[currentPlayerIdx]

  // Roll the dice
  function rollDice() {
    if (isRolling || hasRolled || winner) return

    setIsRolling(true)
    let rollInterval = setInterval(() => {
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
          setLog(`Three 6s in a row! 💥 Turn forfeited.`)
          setConsecutiveSixes(0)
          setTimeout(() => {
            passTurn(true)
          }, 1500)
          return
        }
      } else {
        setConsecutiveSixes(0)
      }

      evaluateMoves(finalVal)
    }, 800)
  }

  // Find movable tokens for current player and rolled value
  function evaluateMoves(roll: number) {
    const playerTokens = tokens.filter(t => t.playerId === currentPlayer.id)
    const movableIds: number[] = []

    playerTokens.forEach(token => {
      if (token.posType === 'base') {
        // Can only exit base if roll is a 6
        if (roll === 6) {
          movableIds.push(token.tokenId)
        }
      } else if (token.posType === 'track') {
        // Track movement is always valid, but entering homeLane or goal requires checks
        movableIds.push(token.tokenId)
      } else if (token.posType === 'homeLane') {
        // Must roll exact or less than needed to reach goal
        const stepsNeeded = 57 - token.stepCount
        if (roll <= stepsNeeded) {
          movableIds.push(token.tokenId)
        }
      }
    })

    setMovableTokenIds(movableIds)

    if (movableIds.length === 0) {
      setLog(`${currentPlayer.displayName} rolled a ${roll} but has no moves!`)
      // Auto pass turn after a delay
      setTimeout(() => {
        passTurn(false)
      }, 1500)
    } else {
      setLog(`${currentPlayer.displayName} rolled a ${roll}! Tap a highlighted token to move.`)
    }
  }

  // Move token
  function handleTokenClick(tokenId: number) {
    if (!hasRolled || !movableTokenIds.includes(tokenId) || !diceVal || winner) return

    const roll = diceVal
    let rolledSix = roll === 6

    const updatedTokens = tokens.map(token => {
      if (token.playerId !== currentPlayer.id || token.tokenId !== tokenId) return token

      let newPos = { ...token }

      if (token.posType === 'base') {
        // Exit base
        newPos.posType = 'track'
        newPos.trackIdx = currentPlayer.startIdx
        newPos.stepCount = 1
      } else if (token.posType === 'track') {
        // Normal track move
        let stepsLeft = roll
        let currentIdx = token.trackIdx
        let stepsAccum = token.stepCount

        while (stepsLeft > 0) {
          // If token is at its home exit square, enter home lane
          if (currentIdx === currentPlayer.homeExitIdx) {
            newPos.posType = 'homeLane'
            newPos.homeLaneIdx = 0
            newPos.stepCount = stepsAccum + 1
            stepsLeft--

            // Continue moving inside home lane if steps remain
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
        // Move inside home lane
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

    // Collision Check: did we land on an opponent on a normal non-safe tile?
    const movedToken = updatedTokens.find(t => t.playerId === currentPlayer.id && t.tokenId === tokenId)!
    let capturedAny = false

    if (movedToken.posType === 'track') {
      const isSafeSpot = SAFE_TRACK_INDICES.includes(movedToken.trackIdx)
      if (!isSafeSpot) {
        // Look for opponent tokens on the same track index
        updatedTokens.forEach(otherToken => {
          if (otherToken.playerId !== currentPlayer.id && otherToken.posType === 'track' && otherToken.trackIdx === movedToken.trackIdx) {
            // Send captured token back to base!
            otherToken.posType = 'base'
            otherToken.stepCount = 0
            otherToken.trackIdx = 0
            otherToken.homeLaneIdx = 0
            capturedAny = true
            setLog(`💥 ${currentPlayer.displayName} captured ${otherToken.playerId.toUpperCase()}'s token! Extra turn!`)
          }
        })
      }
    }

    const originalToken = tokens.find(t => t.playerId === currentPlayer.id && t.tokenId === tokenId)!
    const reachedHome = originalToken.posType !== 'done' && movedToken.posType === 'done'

    setTokens(updatedTokens)

    // Check if this player has won/completed all tokens
    const playerTokens = updatedTokens.filter(t => t.playerId === currentPlayer.id)
    const allDone = playerTokens.every(t => t.posType === 'done')

    let gameFinished = false
    let updatedRankings = [...rankings]
    if (allDone && !rankings.includes(currentPlayer.id)) {
      updatedRankings.push(currentPlayer.id)
      setRankings(updatedRankings)
      setLog(`🎉 ${currentPlayer.displayName} finished all 4 tokens! (Rank #${updatedRankings.length})`)

      // Game is completely over when all active players (or all except 1) have completed
      const activePlayersRemaining = activePlayers.filter(p => !updatedRankings.includes(p.id))
      if (activePlayersRemaining.length <= 1) {
        if (activePlayersRemaining.length === 1) {
          updatedRankings.push(activePlayersRemaining[0].id)
          setRankings(updatedRankings)
        }

        const rankingsStr = updatedRankings
          .map((pId, idx) => {
            const pName = activePlayers.find(ap => ap.id === pId)?.displayName || pId
            return `#${idx + 1}: ${pName.toUpperCase()}`
          })
          .join(' · ')

        setWinner(activePlayers.find(p => p.id === updatedRankings[0])!.displayName)
        setLog(`🏆 GAME COMPLETED! Rankings: ${rankingsStr}`)
        gameFinished = true
      }
    }

    if (gameFinished) return

    // If this player completed their tokens but the game isn't finished, force pass turn immediately
    if (allDone) {
      setTimeout(() => {
        passTurnWithRankings(currentPlayerIdx, updatedRankings)
      }, 1500)
      return
    }

    // Pass turn
    // Rules: Get another roll if you roll a 6, capture an opponent, or bring a piece home
    const getExtraRoll = rolledSix || capturedAny || reachedHome
    if (getExtraRoll) {
      setHasRolled(false)
      setDiceVal(null)
      setMovableTokenIds([])
      if (reachedHome) {
        setLog(`🎉 ${currentPlayer.displayName} brought a token home! Extra roll!`)
      } else if (capturedAny) {
        // Capture log is already set above
      } else {
        setLog(`${currentPlayer.displayName} rolled a 6! Extra roll!`)
      }
    } else {
      passTurnWithRankings(currentPlayerIdx, updatedRankings)
    }
  }

  // Move turn to next player, skipping players who have finished
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
    setConsecutiveSixes(0)
    setLog(`It's now ${activePlayers[nextIdx].displayName}'s turn.`)
  }

  // Fallback passTurn method mapping to passTurnWithRankings
  function passTurn(withReset = true) {
    passTurnWithRankings(currentPlayerIdx, rankings)
  }

  // Reset entire game board
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
    setHasRolled(false)
    setMovableTokenIds([])
    setWinner(null)
    setConsecutiveSixes(0)
    setRankings([])
    setLog('Game reset! Roll to start.')
  }

  // Render tokens at specific coordinates on the board grid
  function getTokensAt(row: number, col: number) {
    const cellTokens: TokenState[] = []
    tokens.forEach(token => {
      const cfg = activePlayers.find(p => p.id === token.playerId)
      if (!cfg) return

      if (token.posType === 'track') {
        const coords = TRACK_COORDS[token.trackIdx]
        if (coords[0] === row && coords[1] === col) {
          cellTokens.push(token)
        }
      } else if (token.posType === 'homeLane') {
        const coords = cfg.homeLane[token.homeLaneIdx]
        if (coords[0] === row && coords[1] === col) {
          cellTokens.push(token)
        }
      }
    })
    return cellTokens
  }

  // Helper to determine background styling and contents of a cell
  function getCellTheme(r: number, c: number) {
    // Start squares
    if (r === 6 && c === 1) return { background: '#22c55e' } // Green start
    if (r === 1 && c === 8) return { background: '#eab308' } // Yellow start
    if (r === 8 && c === 13) return { background: '#3b82f6' } // Blue start
    if (r === 13 && c === 6) return { background: '#ef4444' } // Red start

    // Home lanes
    if (r === 7 && c >= 1 && c <= 5) return { background: '#22c55e' }
    if (c === 7 && r >= 1 && r <= 5) return { background: '#eab308' }
    if (r === 7 && c >= 9 && c <= 13) return { background: '#3b82f6' }
    if (c === 7 && r >= 9 && r <= 13) return { background: '#ef4444' }

    // Home lane entry arrows (colored outer track cells with arrows pointing to home lane)
    if (r === 7 && c === 0) return { background: '#22c55e', arrow: '→' }
    if (r === 0 && c === 7) return { background: '#eab308', arrow: '↓' }
    if (r === 7 && c === 14) return { background: '#3b82f6', arrow: '←' }
    if (r === 14 && c === 7) return { background: '#ef4444', arrow: '↑' }

    // Start entrance arrows (white cells with colored arrows pointing to start)
    if (r === 6 && c === 0) return { background: '#ffffff', arrow: '→', arrowColor: '#22c55e' }
    if (r === 0 && c === 8) return { background: '#ffffff', arrow: '↓', arrowColor: '#eab308' }
    if (r === 8 && c === 14) return { background: '#ffffff', arrow: '←', arrowColor: '#3b82f6' }
    if (r === 14 && c === 6) return { background: '#ffffff', arrow: '↑', arrowColor: '#ef4444' }

    // Safe spots (Stars)
    if (
      (r === 8 && c === 2) || // Red star
      (r === 2 && c === 6) || // Green star
      (r === 6 && c === 12) || // Yellow star
      (r === 12 && c === 8)    // Blue star
    ) {
      return { background: '#ffffff', isSafe: true }
    }

    return { background: '#ffffff' }
  }

  function renderPlayerCard(playerId: string, alignRight: boolean) {
    const config = PLAYERS_CONFIG.find(p => p.id === playerId)!
    const activePlayer = activePlayers.find(p => p.id === playerId)
    const isTurn = currentPlayer.id === playerId && !winner

    if (!activePlayer) {
      return (
        <div style={{
          background: '#0f0f23',
          border: '1px dashed #312e81',
          borderRadius: 12,
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 155,
          height: 58,
          boxSizing: 'border-box',
          opacity: 0.3,
        }}>
          <span style={{ fontSize: 9, color: '#666', fontWeight: 'bold', letterSpacing: 1 }}>EMPTY SEAT</span>
        </div>
      )
    }

    const doneCount = tokens.filter(t => t.playerId === playerId && t.posType === 'done').length
    const isPlayerRolling = isTurn && isRolling
    const isPlayerTurnToRoll = isTurn && !hasRolled && !isRolling

    return (
      <div style={{
        background: '#11112b',
        border: `2px solid ${isTurn ? config.color : '#1f1f3e'}`,
        boxShadow: isTurn ? `0 0 12px ${config.color}55` : 'none',
        borderRadius: 12,
        padding: '6px 8px',
        display: 'flex',
        flexDirection: alignRight ? 'row-reverse' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: 155,
        height: 58,
        boxSizing: 'border-box',
        transition: 'all 0.3s ease',
        position: 'relative',
      }}>
        {/* Avatar, Name, and Progress/Rank info */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: alignRight ? 'flex-end' : 'flex-start',
          justifyContent: 'center',
          gap: 2,
          overflow: 'hidden',
          flex: 1,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexDirection: alignRight ? 'row-reverse' : 'row',
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: `${config.color}22`,
              border: `1px solid ${config.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, flexShrink: 0
            }}>
              {config.emoji}
            </div>
            <span style={{
              fontSize: 9, fontWeight: 'bold', color: '#fff',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              textTransform: 'uppercase', letterSpacing: 0.5,
              maxWidth: 75,
            }}>
              {activePlayer.displayName}
            </span>
          </div>

          {rankings.includes(playerId) ? (
            <span style={{ fontSize: 8, color: '#eab308', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              RANK #{rankings.indexOf(playerId) + 1} 🏆
            </span>
          ) : (
            <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
              {Array.from({ length: 4 }).map((_, idx) => {
                const isDone = idx < doneCount
                return (
                  <div
                    key={idx}
                    style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: isDone ? config.color : '#374151',
                      border: isDone ? `1px solid ${config.accentColor}` : 'none',
                      boxShadow: isDone ? `0 0 4px ${config.color}` : 'none',
                    }}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Dice Slot */}
        <div style={{
          position: 'relative',
          width: 38,
          height: 38,
          borderRadius: 8,
          background: isTurn ? '#1f1f3e' : '#15152a',
          border: `1px solid ${isTurn ? config.color : '#27274a'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}>
          {isTurn ? (
            <button
              onClick={rollDice}
              disabled={isRolling || hasRolled}
              className="btn-touch"
              style={{
                width: '100%',
                height: '100%',
                background: isPlayerTurnToRoll ? `linear-gradient(135deg, ${config.color}, ${config.color}cc)` : '#ffffff',
                border: 'none',
                borderRadius: 7,
                color: isPlayerTurnToRoll ? '#ffffff' : config.color,
                fontSize: diceVal ? 28 : 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isRolling || hasRolled ? 'default' : 'pointer',
                boxShadow: isPlayerTurnToRoll ? `0 0 10px ${config.color}88` : 'none',
                transform: isPlayerRolling ? 'rotate(360deg)' : 'none',
                transition: isPlayerRolling ? 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none',
                textShadow: isPlayerTurnToRoll ? '0 1px 2px rgba(0,0,0,0.3)' : `0 0 4px ${config.color}33`,
                padding: 0,
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
                animation: isPlayerTurnToRoll ? 'pulse-dice 1.2s infinite alternate' : 'none',
              }}
            >
              {isPlayerRolling ? '🎲' : (diceVal ? DICE_FACES[diceVal - 1] : '🎲')}
            </button>
          ) : (
            <span style={{ fontSize: 16, color: '#374151', opacity: 0.5 }}>
              🎲
            </span>
          )}
        </div>
      </div>
    )
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
      padding: '16px 12px',
      boxSizing: 'border-box',
      overflowX: 'hidden',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none',
      touchAction: 'manipulation',
    }}>

      {/* Header Info */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <h1 style={{
          fontSize: 20, fontWeight: 900, color: '#fff',
          letterSpacing: 4, textShadow: '0 0 16px #00ff88',
          margin: '0 0 4px 0'
        }}>ARCADE LUDO</h1>
        <div style={{
          fontSize: 11, color: currentPlayer.color,
          letterSpacing: 2, fontWeight: 'bold', textTransform: 'uppercase'
        }}>
          ● {currentPlayer.displayName}'s turn ({currentPlayer.name})
        </div>
      </div>

      {/* Status Log */}
      <div style={{
        background: '#12122b',
        border: '1px solid #1a1a3a',
        borderRadius: 8,
        padding: '10px 14px',
        width: '100%',
        maxWidth: 360,
        textAlign: 'center',
        color: '#a1a1aa',
        fontSize: 12,
        marginBottom: 16,
        boxSizing: 'border-box',
        minHeight: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {log}
      </div>

      {/* Top Corner Profiles Row: Green (Left), Yellow (Right) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        maxWidth: 370,
        marginBottom: 10,
        boxSizing: 'border-box'
      }}>
        {renderPlayerCard('green', false)}
        {renderPlayerCard('yellow', true)}
      </div>

      {/* 15x15 Ludo Board Grid */}
      <div style={{
        width: '100%',
        maxWidth: 370,
        aspectRatio: '1',
        background: '#cbd5e1',
        border: '3px solid #00ff88',
        borderRadius: 14,
        padding: 4,
        boxSizing: 'border-box',
        position: 'relative',
        boxShadow: '0 0 20px rgba(0, 255, 136, 0.15)',
        marginBottom: 20,
      }}>
        {/* Render Grid container */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
          width: '100%',
          height: '100%',
          gap: 1,
        }}>
          {/* Render 4 Home Bases */}
          {PLAYERS_CONFIG.map((player) => {
            let gridRow = ''
            let gridCol = ''
            if (player.id === 'green') { gridRow = '1/7'; gridCol = '1/7' }
            else if (player.id === 'yellow') { gridRow = '1/7'; gridCol = '10/16' }
            else if (player.id === 'red') { gridRow = '10/16'; gridCol = '1/7' }
            else if (player.id === 'blue') { gridRow = '10/16'; gridCol = '10/16' }

            const isActive = activePlayers.some(ap => ap.id === player.id)

            return (
              <div
                key={`base-${player.id}`}
                style={{
                  gridRow,
                  gridColumn: gridCol,
                  background: player.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                }}
              >
                {/* White inner card */}
                <div style={{
                  width: '70%',
                  height: '70%',
                  background: '#fff',
                  borderRadius: 8,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gridTemplateRows: '1fr 1fr',
                  padding: 6,
                  gap: 6,
                  boxSizing: 'border-box',
                }}>
                  {Array.from({ length: 4 }).map((_, slotIdx) => {
                    const baseToken = isActive ? tokens.find(t => t.playerId === player.id && t.posType === 'base' && t.tokenId === slotIdx) : null
                    const isMovable = baseToken && baseToken.playerId === currentPlayer.id && movableTokenIds.includes(baseToken.tokenId)

                    return (
                      <div
                        key={slotIdx}
                        style={{
                          borderRadius: '50%',
                          border: `2px solid ${player.color}`,
                          background: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box',
                          position: 'relative',
                        }}
                      >
                        {baseToken && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation()
                              handleTokenClick(baseToken.tokenId)
                            }}
                            className={isMovable ? 'btn-touch' : ''}
                            style={{
                              width: '85%',
                              height: '85%',
                              borderRadius: '50%',
                              background: player.color,
                              border: isMovable ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.4)',
                              boxShadow: isMovable
                                ? '0 0 8px #ffffff, 0 0 12px ' + player.color
                                : 'inset 0 0 5px rgba(0,0,0,0.5)',
                              cursor: isMovable ? 'pointer' : 'default',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: 'bold',
                              fontSize: 10,
                              transform: isMovable ? 'scale(1.15)' : 'scale(1)',
                              animation: isMovable ? 'bounce 0.8s infinite alternate' : 'none',
                              zIndex: 10,
                              outline: 'none',
                              transition: 'all 0.2s',
                              WebkitTapHighlightColor: 'transparent',
                            }}
                          >
                            {baseToken.tokenId + 1}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Center Goal */}
          <div
            style={{
              gridRow: '7/10',
              gridColumn: '7/10',
              background: 'conic-gradient(from -45deg, #eab308 0deg 90deg, #2563eb 90deg 180deg, #dc2626 180deg 270deg, #16a34a 270deg 360deg)',
              border: '1px solid #cbd5e1',
              boxSizing: 'border-box',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {tokens.filter(t => t.posType === 'done').map((token, idx) => {
              const cfg = activePlayers.find(p => p.id === token.playerId)!
              return (
                <div
                  key={`done-${token.playerId}-${token.tokenId}`}
                  style={{
                    position: 'absolute',
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: cfg.color,
                    border: '1px solid #fff',
                    boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                    transform: `translate(${(idx % 2) * 14 - 7}px, ${Math.floor(idx / 2) * 14 - 7}px)`,
                    zIndex: 15,
                  }}
                />
              )
            })}
          </div>

          {/* Render 72 Arm Squares */}
          {ARM_CELLS.map(({ r, c }) => {
            const theme = getCellTheme(r, c)
            const cellTokens = getTokensAt(r, c)

            return (
              <div
                key={`cell-${r}-${c}`}
                style={{
                  gridRow: r + 1,
                  gridColumn: c + 1,
                  background: theme.background,
                  border: '1px solid #cbd5e1',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  boxSizing: 'border-box',
                }}
              >
                {theme.isSafe && (
                  <div style={{
                    position: 'absolute',
                    color: '#ffd700',
                    fontSize: 14,
                    fontWeight: 'bold',
                    opacity: cellTokens.length > 0 ? 0.25 : 0.85,
                    textShadow: '0 0 2px rgba(0,0,0,0.5)',
                    zIndex: 1,
                  }}>★</div>
                )}

                {theme.arrow && (
                  <div style={{
                    position: 'absolute',
                    color: theme.arrowColor || '#ffffff',
                    fontSize: 14,
                    fontWeight: 'bold',
                    opacity: cellTokens.length > 0 ? 0.25 : 0.85,
                    zIndex: 1,
                  }}>{theme.arrow}</div>
                )}

                {cellTokens.map((token, tIdx) => {
                  const cfg = activePlayers.find(p => p.id === token.playerId)!
                  const isMovable = token.playerId === currentPlayer.id && movableTokenIds.includes(token.tokenId)

                  return (
                    <div
                      key={`${token.playerId}-${token.tokenId}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTokenClick(token.tokenId)
                      }}
                      className={isMovable ? 'btn-touch' : ''}
                      style={{
                        width: cellTokens.length > 1 ? '40%' : '75%',
                        height: cellTokens.length > 1 ? '40%' : '75%',
                        borderRadius: '50%',
                        background: cfg.color,
                        border: isMovable ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.4)',
                        boxShadow: isMovable
                          ? '0 0 10px #ffffff, 0 0 15px ' + cfg.color
                          : 'inset 0 0 5px rgba(0,0,0,0.5)',
                        cursor: isMovable ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: cellTokens.length > 1 ? 8 : 10,
                        transform: isMovable ? 'scale(1.15)' : 'scale(1)',
                        animation: isMovable ? 'bounce 0.8s infinite alternate' : 'none',
                        zIndex: isMovable ? 10 : 2 + tIdx,
                        outline: 'none',
                        transition: 'all 0.2s',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      {token.tokenId + 1}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom Corner Profiles Row: Red (Left), Blue (Right) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        maxWidth: 370,
        boxSizing: 'border-box'
      }}>
        {renderPlayerCard('red', false)}
        {renderPlayerCard('blue', true)}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 370, marginTop: 18 }}>
        <button onClick={resetGame} className="btn-touch" style={{
          flex: 1, padding: '12px',
          background: 'transparent',
          border: '2px solid #ef4444',
          borderRadius: 12, color: '#ef4444',
          fontSize: 11, fontWeight: 900,
          letterSpacing: 2, textTransform: 'uppercase',
          cursor: 'pointer',
          outline: 'none',
          fontFamily: "'Courier New', monospace",
          WebkitTapHighlightColor: 'transparent',
        }}>
          ↺ RESET
        </button>
        <button onClick={() => router.back()} className="btn-touch" style={{
          flex: 1, padding: '12px',
          background: 'transparent',
          border: '1px solid #333',
          borderRadius: 12, color: '#555',
          fontSize: 11, fontWeight: 900,
          letterSpacing: 2, textTransform: 'uppercase',
          cursor: 'pointer',
          outline: 'none',
          fontFamily: "'Courier New', monospace",
          WebkitTapHighlightColor: 'transparent',
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
            border: '2px solid #eab308',
            borderRadius: 20,
            padding: '32px 24px',
            width: '100%',
            maxWidth: 340,
            textAlign: 'center',
            boxShadow: '0 0 24px rgba(234, 179, 8, 0.3)',
            boxSizing: 'border-box'
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
            <h2 style={{ color: '#eab308', fontSize: 18, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 8px 0' }}>
              VICTORY!
            </h2>
            <p style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', margin: '0 0 24px 0' }}>
              {winner.toUpperCase()} IS THE CHAMPION!
            </p>

            {rankings.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ color: '#888', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px 0' }}>Final Rankings</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                  {rankings.map((pId, idx) => {
                    const pName = activePlayers.find(ap => ap.id === pId)?.displayName || pId
                    const cfg = PLAYERS_CONFIG.find(p => p.id === pId)
                    return (
                      <div key={pId} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontSize: 13, fontFamily: "'Courier New', monospace" }}>
                        <span style={{ color: '#eab308', fontWeight: 'bold' }}>#{idx + 1}</span>
                        <span style={{ color: cfg?.color || '#fff', fontWeight: 'bold' }}>{pName.toUpperCase()}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

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

      {/* Inline styles for custom bouncing/tactile animations */}
      <style jsx global>{`
        @keyframes bounce {
          from {
            transform: scale(1.1) translateY(0);
          }
          to {
            transform: scale(1.1) translateY(-4px);
            box-shadow: 0 0 14px #fff;
          }
        }
        @keyframes pulse-dice {
          from {
            transform: scale(1);
          }
          to {
            transform: scale(1.06);
          }
        }
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

export default function Ludo() {
  return (
    <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center', marginTop: 100 }}>Loading Ludo...</div>}>
      <LudoContent />
    </Suspense>
  )
}