'use client'
import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { publishEvent, fetchEventHistory, OnlineConnection, getSessionPlayerId } from '../lib/online'

// --- ARCADE NEON BOARD CONFIGURATION ---
const ARCADE_THEME = {
  snakes: {
    17: 7,
    54: 34,
    58: 18,
    62: 60,
    92: 73,
    95: 36,
    97: 79
  },
  ladders: {
    2: 38,
    4: 14,
    9: 31,
    21: 42,
    28: 84,
    51: 67,
    71: 91,
    80: 99
  },
  gridColors: [
    '#ffde00', // Yellow
    '#ffffff', // White
    '#ff1a24', // Red
    '#0071bc', // Blue
    '#00a651'  // Green
  ]
}

const ARCADE_SNAKE_COLORS: { [key: number]: { body: string; belly: string; pattern: string } } = {
  17: { body: '#7c3aed', belly: '#f5f3ff', pattern: '#f59e0b' }, // Purple
  54: { body: '#dc2626', belly: '#fef2f2', pattern: '#facc15' }, // Red
  58: { body: '#ea580c', belly: '#fff7ed', pattern: '#f43f5e' }, // Orange
  62: { body: '#78350f', belly: '#fef3c7', pattern: '#fbbf24' }, // Brown
  92: { body: '#9333ea', belly: '#faf5ff', pattern: '#3b82f6' }, // Light Purple
  95: { body: '#16a34a', belly: '#f0fdf4', pattern: '#f59e0b' }, // Green
  97: { body: '#eab308', belly: '#fef9c3', pattern: '#16a34a' }  // Yellow
}

// --- RETRO CLASSIC BOARD CONFIGURATION ---
const RETRO_THEME = {
  snakes: {
    17: 7,
    54: 34,
    62: 19,
    64: 60,
    87: 24,
    93: 73,
    95: 75,
    99: 78
  },
  ladders: {
    4: 14,
    9: 31,
    20: 38,
    28: 84,
    40: 59,
    51: 67,
    63: 81,
    71: 91
  },
  gridColors: [
    '#fef08a', // Pastel Yellow
    '#fafaf9', // Warm White
    '#fca5a5', // Pastel Red
    '#93c5fd', // Pastel Blue
    '#86efac'  // Pastel Green
  ]
}

const RETRO_SNAKE_COLORS: { [key: number]: { body: string; belly: string; pattern: string } } = {
  17: { body: '#7c3aed', belly: '#f5f3ff', pattern: '#eab308' }, // Purple
  54: { body: '#dc2626', belly: '#f0fdf4', pattern: '#16a34a' }, // Red/Green
  62: { body: '#16a34a', belly: '#fef9c3', pattern: '#eab308' }, // Green/Yellow
  64: { body: '#ef4444', belly: '#fff7ed', pattern: '#f59e0b' }, // Red/Orange
  87: { body: '#2563eb', belly: '#fde047', pattern: '#eab308' }, // Blue/Yellow
  93: { body: '#3b82f6', belly: '#faf5ff', pattern: '#a855f7' }, // Blue/Purple
  95: { body: '#eab308', belly: '#fef2f2', pattern: '#ef4444' }, // Yellow/Red
  99: { body: '#15803d', belly: '#fde047', pattern: '#fbbf24' }  // Dark Green/Yellow
}


const PLAYERS_CONFIG = [
  { id: 'p1', name: 'Player 1', color: '#00f0ff', emoji: '🎮' },
  { id: 'p2', name: 'Player 2', color: '#ff00ff', emoji: '🕹️' },
  { id: 'p3', name: 'Player 3', color: '#00ff88', emoji: '👾' },
  { id: 'p4', name: 'Player 4', color: '#ffaa00', emoji: '🏆' }
]

const GRID_COLORS = [
  '#ffde00', // Yellow
  '#ffffff', // White
  '#ff1a24', // Red
  '#0071bc', // Blue
  '#00a651'  // Green
]

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

// Converts cell number (1 to 100) to grid coordinates (0-indexed row and col from top)
function getCellCoords(n: number) {
  const idx = n - 1
  const rowFromBottom = Math.floor(idx / 10)
  const r = 9 - rowFromBottom
  const c = rowFromBottom % 2 === 0 ? (idx % 10) : 9 - (idx % 10)
  return { r, c }
}

function SnakePath({ start, end, theme }: { start: number; end: number; theme: 'arcade' | 'retro' }) {
  const p1 = getCellCoords(start)
  const p2 = getCellCoords(end)
  const x1 = p1.c * 10 + 5
  const y1 = p1.r * 10 + 5
  const x2 = p2.c * 10 + 5
  const y2 = p2.r * 10 + 5

  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  const ux = dx / len
  const uy = dy / len
  const nx = -uy
  const ny = ux

  // Midpoint control point for curving the snake body
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  
  // Make retro curves slightly wider for organic hand-drawn appeal
  const offset = theme === 'retro' 
    ? Math.min(13, len * 0.28) * (start % 2 === 0 ? 1 : -1)
    : Math.min(11, len * 0.24)
    
  const cx = mx + nx * offset
  const cy = my + ny * offset

  const pathD = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
  
  const colors = theme === 'retro'
    ? (RETRO_SNAKE_COLORS[start] || { body: '#16a34a', belly: '#fde047', pattern: '#ef4444' })
    : (ARCADE_SNAKE_COLORS[start] || { body: '#f43f5e', belly: '#fda4af', pattern: '#eab308' })

  if (theme === 'retro') {
    return (
      <g>
        {/* Snake body shadow outline */}
        <path
          d={pathD}
          fill="none"
          stroke="#1e293b"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Snake body base */}
        <path
          d={pathD}
          fill="none"
          stroke={colors.body}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        {/* Snake belly stripe */}
        <path
          d={pathD}
          fill="none"
          stroke={colors.belly}
          strokeWidth="0.75"
          strokeLinecap="round"
        />
        {/* Vintage spot/scale pattern */}
        <path
          d={pathD}
          fill="none"
          stroke={colors.pattern}
          strokeWidth="0.4"
          strokeDasharray="1.2,1.8"
          strokeLinecap="round"
        />
        {/* Retro Snake Head */}
        <g transform={`translate(${x1}, ${y1}) rotate(${Math.atan2(uy, ux) * 180 / Math.PI})`}>
          {/* Head shadow */}
          <ellipse cx="0.5" cy="0" rx="1.9" ry="1.5" fill="#1e293b" />
          {/* Head base */}
          <ellipse cx="0.5" cy="0" rx="1.5" ry="1.1" fill={colors.body} />
          {/* Snout patch */}
          <path d="M 0 -0.8 Q 1 -1.1 1.6 -0.2 Q 1.3 0 0.8 -0.2" fill={colors.belly} opacity="0.65" />
          {/* Retro white eyes */}
          <circle cx="0.6" cy="0.4" r="0.4" fill="#fff" />
          <circle cx="0.6" cy="-0.4" r="0.4" fill="#fff" />
          <circle cx="0.8" cy="0.4" r="0.2" fill="#000" />
          <circle cx="0.8" cy="-0.4" r="0.2" fill="#000" />
          {/* Snake red wavy tongue */}
          <path d="M 1.5 0 C 2.1 0.4, 2.3 -0.4, 2.8 0 L 3.1 -0.2 M 2.8 0 L 3.1 0.2" fill="none" stroke="#dc2626" strokeWidth="0.22" strokeLinecap="round" />
        </g>
        {/* Retro Tail */}
        <circle cx={x2} cy={y2} r="0.5" fill="#1e293b" />
        <circle cx={x2} cy={y2} r="0.3" fill={colors.pattern} />
      </g>
    )
  }

  return (
    <g>
      {/* Snake body shadow outline */}
      <path
        d={pathD}
        fill="none"
        stroke="#000000"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Snake body base */}
      <path
        d={pathD}
        fill="none"
        stroke={colors.body}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Snake belly / inner highlight */}
      <path
        d={pathD}
        fill="none"
        stroke={colors.belly}
        strokeWidth="0.5"
        strokeLinecap="round"
      />
      {/* Snake scale spine pattern */}
      <path
        d={pathD}
        fill="none"
        stroke={colors.pattern}
        strokeWidth="0.2"
        strokeDasharray="1,1.8"
        strokeLinecap="round"
      />
      {/* Snake head outline */}
      <circle cx={x1} cy={y1} r="1.7" fill="#000" />
      {/* Snake head body */}
      <circle cx={x1} cy={y1} r="1.3" fill={colors.body} />
      <circle cx={x1} cy={y1} r="0.7" fill={colors.belly} />
      {/* Snake eyes */}
      <circle cx={x1 - ux * 0.4 + nx * 0.35} cy={y1 - uy * 0.4 + ny * 0.35} r="0.22" fill="#fff" />
      <circle cx={x1 - ux * 0.4 - nx * 0.35} cy={y1 - uy * 0.4 - ny * 0.35} r="0.22" fill="#fff" />
      <circle cx={x1 - ux * 0.4 + nx * 0.35} cy={y1 - uy * 0.4 + ny * 0.35} r="0.1" fill="#000" />
      <circle cx={x1 - ux * 0.4 - nx * 0.35} cy={y1 - uy * 0.4 - ny * 0.35} r="0.1" fill="#000" />
      {/* Snake tongue */}
      <line x1={x1} y1={y1} x2={x1 + ux * 1.6} y2={y1 + uy * 1.6} stroke="#dc2626" strokeWidth="0.25" strokeLinecap="round" />
      {/* Snake tail */}
      <circle cx={x2} cy={y2} r="0.4" fill="#000" />
      <circle cx={x2} cy={y2} r="0.25" fill={colors.body} />
    </g>
  )
}

function LadderPath({ start, end, theme }: { start: number; end: number; theme: 'arcade' | 'retro' }) {
  const p1 = getCellCoords(start)
  const p2 = getCellCoords(end)
  const x1 = p1.c * 10 + 5
  const y1 = p1.r * 10 + 5
  const x2 = p2.c * 10 + 5
  const y2 = p2.r * 10 + 5

  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  const ux = dx / len
  const uy = dy / len
  const nx = -uy
  const ny = ux
  const w = theme === 'retro' ? 1.5 : 1.3 // slightly wider wooden rails

  const rungsCount = Math.max(3, Math.floor(len / 4.5))
  const rungs = []
  for (let i = 1; i < rungsCount; i++) {
    const t = i / rungsCount
    const rx = x1 + dx * t
    const ry = y1 + dy * t
    rungs.push({
      x1: rx + nx * w,
      y1: ry + ny * w,
      x2: rx - nx * w,
      y2: ry - ny * w
    })
  }

  if (theme === 'retro') {
    return (
      <g>
        {/* Wooden rails outline */}
        <line x1={x1 + nx * w} y1={y1 + ny * w} x2={x2 + nx * w} y2={y2 + ny * w} stroke="#451a03" strokeWidth="1.2" strokeLinecap="round" />
        <line x1={x1 - nx * w} y1={y1 - ny * w} x2={x2 - nx * w} y2={y2 - ny * w} stroke="#451a03" strokeWidth="1.2" strokeLinecap="round" />
        
        {/* Wooden rails body */}
        <line x1={x1 + nx * w} y1={y1 + ny * w} x2={x2 + nx * w} y2={y2 + ny * w} stroke="#d97706" strokeWidth="0.6" strokeLinecap="round" />
        <line x1={x1 - nx * w} y1={y1 - ny * w} x2={x2 - nx * w} y2={y2 - ny * w} stroke="#d97706" strokeWidth="0.6" strokeLinecap="round" />
        
        {/* Rungs */}
        {rungs.map((rung, i) => (
          <g key={i}>
            {/* Rung outline */}
            <line x1={rung.x1} y1={rung.y1} x2={rung.x2} y2={rung.y2} stroke="#451a03" strokeWidth="0.95" strokeLinecap="round" />
            {/* Rung yellow inner */}
            <line x1={rung.x1} y1={rung.y1} x2={rung.x2} y2={rung.y2} stroke="#fbbf24" strokeWidth="0.4" strokeLinecap="round" />
          </g>
        ))}
      </g>
    )
  }

  return (
    <g>
      {/* Rails outline */}
      <line x1={x1 + nx * w} y1={y1 + ny * w} x2={x2 + nx * w} y2={y2 + ny * w} stroke="#000" strokeWidth="0.95" strokeLinecap="round" />
      <line x1={x1 - nx * w} y1={y1 - ny * w} x2={x2 - nx * w} y2={y2 - ny * w} stroke="#000" strokeWidth="0.95" strokeLinecap="round" />
      
      {/* Rails inner wood texture */}
      <line x1={x1 + nx * w} y1={y1 + ny * w} x2={x2 + nx * w} y2={y2 + ny * w} stroke="#334155" strokeWidth="0.4" strokeLinecap="round" />
      <line x1={x1 - nx * w} y1={y1 - ny * w} x2={x2 - nx * w} y2={y2 - ny * w} stroke="#334155" strokeWidth="0.4" strokeLinecap="round" />
      
      {/* Rungs */}
      {rungs.map((rung, i) => (
        <g key={i}>
          {/* Rung outline */}
          <line x1={rung.x1} y1={rung.y1} x2={rung.x2} y2={rung.y2} stroke="#000" strokeWidth="0.75" strokeLinecap="round" />
          {/* Rung inner */}
          <line x1={rung.x1} y1={rung.y1} x2={rung.x2} y2={rung.y2} stroke="#475569" strokeWidth="0.25" strokeLinecap="round" />
        </g>
      ))}
    </g>
  )
}

function SnakeLadderContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Get active names from URL params
  const p1 = decodeURIComponent(searchParams.get('p1') || 'Player 1')
  const p2 = decodeURIComponent(searchParams.get('p2') || 'Player 2')
  const p3 = decodeURIComponent(searchParams.get('p3') || '')
  const p4 = decodeURIComponent(searchParams.get('p4') || '')

  const activeNames = [p1, p2, p3, p4].filter(Boolean)
  const playerCount = activeNames.length

  // Select configurations based on lobby count
  const activePlayers = PLAYERS_CONFIG.slice(0, playerCount).map((cfg, idx) => ({
    ...cfg,
    displayName: activeNames[idx]
  }))

  const [boardTheme, setBoardTheme] = useState<'arcade' | 'retro'>('arcade')

  // Player positions map (playerId -> cell number 0..100). 0 is starting yard before cell 1
  const [playerPositions, setPlayerPositions] = useState<{ [playerId: string]: number }>(() => {
    const initial: { [playerId: string]: number } = {}
    activePlayers.forEach(p => {
      initial[p.id] = 0 // Start in yard (before square 1)
    })
    return initial
  })

  const mode = searchParams.get('mode')?.trim() === 'bot'
  const isOnline = searchParams.get('mode')?.trim() === 'online'
  const room = searchParams.get('room')?.trim()?.toUpperCase()
  const role = searchParams.get('role')?.trim()

  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0)
  const [diceVal, setDiceVal] = useState<number | null>(null)
  const [isRolling, setIsRolling] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [logs, setLogs] = useState<string[]>(['Welcome to Snakes & Ladders!', 'Roll the dice to start the climb!'])
  const [winner, setWinner] = useState<string | null>(null)
  const [isBotThinking, setIsBotThinking] = useState(false)
  const [isMoveInFlight, setIsMoveInFlight] = useState(false)

  // Online status states
  const [onlineStatus, setOnlineStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')
  const [isLoadingHistory, setIsLoadingHistory] = useState(isOnline)
  const connectionRef = useRef<any>(null)
  const processedIdsRef = useRef<Set<string>>(new Set())

  const myRoleIdx = role === 'host' ? 0 : role ? parseInt(role.replace('guest', '')) : -1
  const isMyTurn = !isOnline || (currentPlayerIdx === myRoleIdx)

  // Auto roll for bot
  useEffect(() => {
    if (!mode || winner || isRolling || isMoving) return
    const isBotTurn = activePlayers[currentPlayerIdx]?.displayName === 'Bot'
    if (isBotTurn) {
      setIsBotThinking(true)
      const delay = Math.floor(Math.random() * 400) + 300 // 300 to 700 ms
      const timer = setTimeout(() => {
        setIsBotThinking(false)
        rollDice()
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [currentPlayerIdx, isRolling, isMoving, winner, mode])

  const activeSnakes: { [key: number]: number } = boardTheme === 'retro' ? RETRO_THEME.snakes : ARCADE_THEME.snakes
  const activeLadders: { [key: number]: number } = boardTheme === 'retro' ? RETRO_THEME.ladders : ARCADE_THEME.ladders
  const font = boardTheme === 'retro' ? "Georgia, 'Times New Roman', serif" : "'Courier New', monospace"

  const currentPlayer = activePlayers[currentPlayerIdx]

  function addLog(msg: string) {
    setLogs(prev => [msg, ...prev].slice(0, 5))
  }

  function passTurn() {
    if (winner) return
    setCurrentPlayerIdx(prev => (prev + 1) % playerCount)
  }

  async function executeMovementAnimation(targetState: any) {
    const player = activePlayers[currentPlayerIdx]
    const startPos = playerPositions[player.id]
    const endPos = targetState.playerPositions[player.id]

    setIsMoving(true)
    setLogs(targetState.logs)

    if (endPos > startPos) {
      let intermediate = endPos
      for (let x = startPos + 1; x <= 100; x++) {
        if (activeLadders[x] === endPos || activeSnakes[x] === endPos) {
          intermediate = x
          break
        }
      }

      for (let p = startPos + 1; p <= intermediate; p++) {
        setPlayerPositions(prev => ({ ...prev, [player.id]: p }))
        await new Promise(resolve => setTimeout(resolve, 250))
      }

      if (intermediate !== endPos) {
        await new Promise(resolve => setTimeout(resolve, 800))
        setPlayerPositions(prev => ({ ...prev, [player.id]: endPos }))
      }
    } else {
      setPlayerPositions(prev => ({ ...prev, [player.id]: endPos }))
    }

    setIsMoving(false)
    
    // Reconcile complete state
    setPlayerPositions(targetState.playerPositions)
    setCurrentPlayerIdx(targetState.currentPlayerIdx)
    setWinner(targetState.winner)
  }

  function rollDice(incomingRoll?: number, targetState?: any) {
    if (isRolling || isMoving || winner || isMoveInFlight) return

    if (isOnline && incomingRoll === undefined && !isMyTurn) return

    setIsRolling(true)
    let rollInterval = setInterval(() => {
      setDiceVal(Math.floor(Math.random() * 6) + 1)
    }, 80)

    setTimeout(async () => {
      clearInterval(rollInterval)
      const finalVal = incomingRoll !== undefined ? incomingRoll : Math.floor(Math.random() * 6) + 1
      setDiceVal(finalVal)
      setIsRolling(false)

      if (isOnline) {
        if (incomingRoll === undefined) {
          // Compute the next state
          const player = activePlayers[currentPlayerIdx]
          const currentPos = playerPositions[player.id]
          
          let nextPositions = { ...playerPositions }
          let nextPlayerIdx = currentPlayerIdx
          let nextWinner = null
          let nextLogs = [...logs]

          const addLogOffline = (msg: string) => {
            nextLogs = [msg, ...nextLogs].slice(0, 5)
          }

          addLogOffline(`🎲 ${player.displayName} rolled a ${finalVal}!`)

          if (currentPos + finalVal > 100) {
            addLogOffline(`⚠️ Roll too high! ${player.displayName} needs exactly ${100 - currentPos} to win.`)
            nextPlayerIdx = (currentPlayerIdx + 1) % playerCount
          } else {
            let pos = currentPos + finalVal
            let didClimb = false
            let didSlide = false
            let intermediate = pos

            if (activeLadders[pos]) {
              pos = activeLadders[pos]
              didClimb = true
            } else if (activeSnakes[pos]) {
              pos = activeSnakes[pos]
              didSlide = true
            }

            nextPositions[player.id] = pos

            if (didClimb) {
              addLogOffline(`🪜 Climb! ${player.displayName} climbed a ladder from ${intermediate} to ${pos}!`)
            } else if (didSlide) {
              addLogOffline(`🐍 Slide! ${player.displayName} was bitten by a snake at ${intermediate} and slid to ${pos}!`)
            }

            if (pos === 100) {
              nextWinner = player.displayName
              addLogOffline(`🏆 ${player.displayName} reached 100 and WON THE GAME!`)
            } else {
              if (finalVal !== 6) {
                nextPlayerIdx = (currentPlayerIdx + 1) % playerCount
              } else {
                addLogOffline(`🎲 Extra Roll! ${player.displayName} gets another turn for rolling a 6!`)
              }
            }
          }

          const nextState = {
            playerPositions: nextPositions,
            currentPlayerIdx: nextPlayerIdx,
            winner: nextWinner,
            logs: nextLogs,
            diceVal: finalVal
          }

          console.log('[SNAKES-LADDERS] Outgoing state update:', nextState)
          setIsMoveInFlight(true)
          publishEvent(room!, 'state_update', { state: nextState, roll: finalVal })
            .catch(() => setIsMoveInFlight(false))
        } else if (targetState) {
          await executeMovementAnimation(targetState)
        }
      } else {
        // Offline gameplay
        await handlePlayerMove(finalVal)
      }
    }, 800)
  }

  async function handlePlayerMove(roll: number) {
    const player = activePlayers[currentPlayerIdx]
    const currentPos = playerPositions[player.id]

    addLog(`🎲 ${player.displayName} rolled a ${roll}!`)

    if (currentPos + roll > 100) {
      addLog(`⚠️ Roll too high! ${player.displayName} needs exactly ${100 - currentPos} to win.`)
      await new Promise(resolve => setTimeout(resolve, 1500))
      passTurn()
      return
    }

    setIsMoving(true)

    let pos = currentPos
    for (let i = 1; i <= roll; i++) {
      pos++
      setPlayerPositions(prev => ({ ...prev, [player.id]: pos }))
      await new Promise(resolve => setTimeout(resolve, 250))
    }

    if (activeLadders[pos]) {
      const endPos = activeLadders[pos]
      addLog(`🪜 Climb! ${player.displayName} climbed a ladder from ${pos} to ${endPos}!`)
      await new Promise(resolve => setTimeout(resolve, 800))
      setPlayerPositions(prev => ({ ...prev, [player.id]: endPos }))
      pos = endPos
    } else if (activeSnakes[pos]) {
      const endPos = activeSnakes[pos]
      addLog(`🐍 Oh no! ${player.displayName} was bitten by a snake at ${pos} and slid to ${endPos}!`)
      await new Promise(resolve => setTimeout(resolve, 800))
      setPlayerPositions(prev => ({ ...prev, [player.id]: endPos }))
      pos = endPos
    }

    if (pos === 100) {
      setWinner(player.displayName)
      addLog(`🏆 ${player.displayName} reached 100 and WON THE GAME!`)
      setIsMoving(false)
      return
    }

    setIsMoving(false)

    if (roll === 6) {
      addLog(`🎲 Extra Roll! ${player.displayName} gets another turn for rolling a 6!`)
    } else {
      passTurn()
    }
  }

  function resetGame(isIncoming = false) {
    if (isOnline) {
      const initial: { [playerId: string]: number } = {}
      activePlayers.forEach(p => {
        initial[p.id] = 0
      })
      const initialState = {
        playerPositions: initial,
        currentPlayerIdx: 0,
        diceVal: null,
        winner: null,
        logs: ['Game reset! Roll to start the climb.']
      }
      console.log('[SNAKES-LADDERS] Outgoing reset state:', initialState)
      setIsMoveInFlight(true)
      publishEvent(room!, 'state_update', { state: initialState })
        .catch(() => setIsMoveInFlight(false))
    } else {
      const initial: { [playerId: string]: number } = {}
      activePlayers.forEach(p => {
        initial[p.id] = 0
      })
      setPlayerPositions(initial)
      setCurrentPlayerIdx(0)
      setDiceVal(null)
      setWinner(null)
      setLogs(['Game reset! Roll to start the climb.'])
    }
  }

  useEffect(() => {
    if (!isOnline || !room) return

    const processedIds = new Set<string>()
    processedIdsRef.current = processedIds

    async function initOnline() {
      setIsLoadingHistory(true)
      const history = await fetchEventHistory(room!)
      console.log('[SNAKES-LADDERS] Fetched history:', history)

      const stateUpdateEvents = history.filter(e => e.type === 'state_update')
      let initialRoomStateApplied = false

      if (stateUpdateEvents.length > 0) {
        const latestEvent = stateUpdateEvents[stateUpdateEvents.length - 1]
        const state = latestEvent.payload.state
        console.log('[SNAKES-LADDERS] Reconstructed state from history:', state)

        setPlayerPositions(state.playerPositions)
        setCurrentPlayerIdx(state.currentPlayerIdx)
        setDiceVal(state.diceVal)
        setWinner(state.winner)
        setLogs(state.logs)
        initialRoomStateApplied = true
      }

      if (!initialRoomStateApplied && role === 'host') {
        const initial: { [playerId: string]: number } = {}
        activePlayers.forEach(p => {
          initial[p.id] = 0
        })
        const initialState = {
          playerPositions: initial,
          currentPlayerIdx: 0,
          diceVal: null,
          winner: null,
          logs: ['Game reset! Roll to start the climb.']
        }
        console.log('[SNAKES-LADDERS] Host publishing initial room state:', initialState)
        publishEvent(room!, 'state_update', { state: initialState })

        setPlayerPositions(initialState.playerPositions)
        setCurrentPlayerIdx(initialState.currentPlayerIdx)
        setDiceVal(initialState.diceVal)
        setWinner(initialState.winner)
        setLogs(initialState.logs)
      }

      for (const event of history) {
        processedIds.add(event.id)
      }

      setIsLoadingHistory(false)

      const conn = new OnlineConnection(
        room!,
        (event) => {
          console.log('[SNAKES-LADDERS] Live event callback:', event)
          if (event.type === 'state_update') {
            const { state, roll } = event.payload
            setIsMoveInFlight(false)
            if (roll !== undefined) {
              if (event.sender === getSessionPlayerId()) {
                // We already rolled locally, just run movement animation directly
                setDiceVal(state.diceVal)
                executeMovementAnimation(state)
              } else {
                console.log('[SNAKES-LADDERS] Roll received, playing animation:', roll, state)
                rollDice(roll, state)
              }
            } else {
              console.log('[SNAKES-LADDERS] Reset received, applying state:', state)
              setPlayerPositions(state.playerPositions)
              setCurrentPlayerIdx(state.currentPlayerIdx)
              setDiceVal(state.diceVal)
              setWinner(state.winner)
              setLogs(state.logs)
            }
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

  // Render 100 cells on the board
  const cells = []
  for (let r = 0; r < 10; r++) {
    const rowFromBottom = 9 - r
    for (let c = 0; c < 10; c++) {
      const col = rowFromBottom % 2 === 0 ? c : 9 - c
      const cellNum = rowFromBottom * 10 + col + 1
      cells.push({ cellNum, r, c })
    }
  }

  // Group cells by their number for easy lookup in layout
  // Ensure top row is rendered first by sorting row indices descending
  const sortedCells = [...cells].sort((a, b) => {
    if (a.r !== b.r) return a.r - b.r
    return a.c - b.c
  })

  return (
    <main style={{
      minHeight: '100dvh',
      background: boardTheme === 'retro' ? '#e7e5e4' : '#0a0a1a',
      fontFamily: font,
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
      transition: 'background 0.5s ease, font-family 0.5s ease',
    }}>

      {/* Header Info */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <h1 style={{
          fontSize: 20,
          fontWeight: 900,
          color: boardTheme === 'retro' ? '#78350f' : '#fff',
          letterSpacing: 4,
          textShadow: boardTheme === 'retro' ? 'none' : '0 0 16px #f43f5e',
          margin: '0 0 4px 0',
          transition: 'color 0.5s ease',
        }}>SNAKES & LADDERS</h1>
        {!winner && (
          <div style={{
            fontSize: 11,
            color: currentPlayer.color,
            letterSpacing: 2,
            fontWeight: 'bold',
            textTransform: 'uppercase',
            textShadow: boardTheme === 'retro' ? '0.5px 0.5px 1px rgba(0,0,0,0.1)' : `0 0 8px ${currentPlayer.color}88`,
          }}>
            ● {currentPlayer.displayName}'s turn
          </div>
        )}
      </div>

      {/* Online Status Header */}
      {isOnline && (
        <div style={{
          background: boardTheme === 'retro' ? '#fafaf9' : '#11112b',
          border: `1px solid ${onlineStatus === 'connected' ? '#00ff88' : '#ef4444'}`,
          borderRadius: 14, padding: '8px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: `0 0 10px ${onlineStatus === 'connected' ? '#00ff8822' : '#ef444422'}`,
          width: '100%', maxWidth: 380, boxSizing: 'border-box'
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: onlineStatus === 'connected' ? '#00ff88' : '#ef4444',
            boxShadow: `0 0 8px ${onlineStatus === 'connected' ? '#00ff88' : '#ef4444'}`
          }} />
          <span style={{ color: boardTheme === 'retro' ? '#444' : '#fff', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 'bold' }}>
            {onlineStatus === 'connected' ? `ONLINE (ROOM: ${room})` : 'RECONNECTING...'}
          </span>
          <span style={{ color: '#666', fontSize: 10, marginLeft: 'auto', textTransform: 'uppercase', fontWeight: 'bold' }}>
            {role === 'host' ? 'P1 (HOST)' : `GUEST ${myRoleIdx}`}
          </span>
        </div>
      )}

      {/* Theme Selector Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: boardTheme === 'retro' ? '#fafaf9' : '#12122b',
        border: boardTheme === 'retro' ? '2px solid #78350f' : '1px solid #1a1a3a',
        borderRadius: 20,
        padding: '2px 4px',
        marginBottom: 12,
        width: '100%',
        maxWidth: 380,
        boxSizing: 'border-box',
        justifyContent: 'space-between',
        position: 'relative',
        boxShadow: boardTheme === 'retro' ? '0 2px 4px rgba(0,0,0,0.1)' : '0 0 10px #00f0ff11',
        transition: 'all 0.5s ease',
      }}>
        <button
          onClick={() => {
            setBoardTheme('arcade')
            addLog('📺 Board Theme switched to ARCADE NEON!')
          }}
          className="btn-touch"
          style={{
            flex: 1,
            padding: '8px 12px',
            background: boardTheme === 'arcade' ? 'linear-gradient(135deg, #00f0ff, #ff00ff)' : 'transparent',
            color: boardTheme === 'arcade' ? '#ffffff' : '#64748b',
            border: 'none',
            borderRadius: 18,
            fontSize: 10,
            fontWeight: 'bold',
            letterSpacing: 2,
            cursor: 'pointer',
            fontFamily: font,
            transition: 'all 0.3s ease',
            outline: 'none',
            boxShadow: boardTheme === 'arcade' ? '0 0 8px rgba(0, 240, 255, 0.4)' : 'none',
          }}
        >
          🕹️ ARCADE NEON
        </button>
        <button
          onClick={() => {
            setBoardTheme('retro')
            addLog('📜 Board Theme switched to CLASSIC RETRO!')
          }}
          className="btn-touch"
          style={{
            flex: 1,
            padding: '8px 12px',
            background: boardTheme === 'retro' ? '#78350f' : 'transparent',
            color: boardTheme === 'retro' ? '#fefbf3' : '#64748b',
            border: 'none',
            borderRadius: 18,
            fontSize: 10,
            fontWeight: 'bold',
            letterSpacing: 2,
            cursor: 'pointer',
            fontFamily: font,
            transition: 'all 0.3s ease',
            outline: 'none',
            boxShadow: boardTheme === 'retro' ? '0 2px 4px rgba(0, 0, 0, 0.2)' : 'none',
          }}
        >
          📜 CLASSIC RETRO
        </button>
      </div>

      {/* Console Log display */}
      <div style={{
        background: boardTheme === 'retro' ? '#fafaf9' : '#12122b',
        border: boardTheme === 'retro' ? '2px solid #78350f' : '1px solid #1a1a3a',
        borderRadius: boardTheme === 'retro' ? 12 : 8,
        padding: '8px 12px',
        width: '100%',
        maxWidth: 380,
        height: 80,
        overflowY: 'hidden',
        color: boardTheme === 'retro' ? '#44403c' : '#a1a1aa',
        fontSize: 11,
        marginBottom: 14,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column-reverse',
        justifyContent: 'flex-start',
        gap: 4,
        boxShadow: boardTheme === 'retro' ? 'inset 0 2px 4px rgba(0,0,0,0.05)' : 'none',
        transition: 'all 0.5s ease',
      }}>
        {logs.map((logStr, idx) => (
          <div key={idx} style={{
            opacity: idx === 0 ? 1 : 0.4,
            color: idx === 0 && logStr.includes('🏆') ? '#eab308' :
                   idx === 0 && logStr.includes('🐍') ? (boardTheme === 'retro' ? '#b91c1c' : '#ef4444') :
                   idx === 0 && logStr.includes('🪜') ? (boardTheme === 'retro' ? '#d97706' : '#00ffff') : 
                   boardTheme === 'retro' ? '#44403c' : '#a1a1aa',
            textShadow: idx === 0 && logStr.includes('🏆') ? '0 0 8px #eab308' : 'none',
            transition: 'all 0.2s'
          }}>
            &gt; {logStr}
          </div>
        ))}
      </div>

      {/* 10x10 Board container */}
      <div style={{
        width: '100%',
        maxWidth: 380,
        aspectRatio: '1',
        background: boardTheme === 'retro' ? '#fefbf3' : '#0a0a20',
        border: boardTheme === 'retro' ? '8px solid #78350f' : '3px solid #000000',
        borderRadius: boardTheme === 'retro' ? 8 : 14,
        padding: boardTheme === 'retro' ? 2 : 4,
        boxSizing: 'border-box',
        position: 'relative',
        boxShadow: boardTheme === 'retro' 
          ? '0 10px 25px rgba(0, 0, 0, 0.25), inset 0 2px 10px rgba(0,0,0,0.1)' 
          : '0 0 24px rgba(255, 255, 255, 0.05)',
        marginBottom: 44, // Expanded bottom margin to make space for the Starting Yard box
        transition: 'all 0.5s ease',
      }}>
        {/* Winding 10x10 grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gridTemplateRows: 'repeat(10, 1fr)',
          width: '100%',
          height: '100%',
          gap: 0,
        }}>
          {sortedCells.map(({ cellNum, r, c }) => {
            const isGoal = cellNum === 100
            
            // Generate exact vertical and horizontal 5-color stagger pattern
            const rowFromBottom = 9 - r
            const colorIndex = (c + (rowFromBottom * 3)) % 5
            const activeGridColors = boardTheme === 'retro' ? RETRO_THEME.gridColors : ARCADE_THEME.gridColors
            const cellColor = activeGridColors[colorIndex]
            
            return (
              <div
                key={cellNum}
                style={{
                  background: cellColor,
                  border: boardTheme === 'retro' ? '1.5px solid #292524' : '1px solid #000000',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  transition: 'background 0.5s ease, border 0.5s ease',
                }}
              >
                {/* Cell Number in bold black text at top-left corner */}
                <span style={{
                  position: 'absolute',
                  top: 2,
                  left: 3,
                  fontSize: boardTheme === 'retro' ? 9 : 8,
                  fontWeight: 'bold',
                  color: boardTheme === 'retro' ? '#292524' : '#000000',
                  fontFamily: font,
                }}>
                  {cellNum}
                </span>

                {/* Yellow Star at center of goal cell 100 */}
                {isGoal && (
                  <div style={{
                    fontSize: 16,
                    color: '#ffde00',
                    textShadow: '0 0.5px 1.5px rgba(0,0,0,0.5)',
                    animation: 'pulse-goal 1s infinite alternate',
                    zIndex: 2,
                    marginTop: 4
                  }}>
                    ★
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Vector SVG overlay for drawing Snakes & Ladders */}
        <svg
          viewBox="0 0 100 100"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 5
          }}
        >
          {/* Render Ladders */}
          {Object.entries(activeLadders).map(([startStr, end]) => (
            <LadderPath key={`l-${startStr}`} start={Number(startStr)} end={end} theme={boardTheme} />
          ))}

          {/* Render Snakes */}
          {Object.entries(activeSnakes).map(([startStr, end]) => (
            <SnakePath key={`s-${startStr}`} start={Number(startStr)} end={end} theme={boardTheme} />
          ))}
        </svg>

        {/* Starting Zone Box rendered below the grid */}
        <div style={{
          position: 'absolute',
          bottom: boardTheme === 'retro' ? -35 : -32,
          left: boardTheme === 'retro' ? 2 : 6,
          width: 80,
          height: 24,
          background: boardTheme === 'retro' ? '#fafaf9' : '#11112b',
          border: boardTheme === 'retro' ? '2px solid #78350f' : '1px solid #334155',
          borderRadius: boardTheme === 'retro' ? 4 : 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9,
          color: boardTheme === 'retro' ? '#78350f' : '#94a3b8',
          fontWeight: 'bold',
          zIndex: 6,
          boxShadow: boardTheme === 'retro' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
          transition: 'all 0.5s ease',
        }}>
          START 🏁
        </div>

        {/* HTML Absolute Overlay for Player Tokens */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10
        }}>
          {activePlayers.map((player, idx) => {
            const pos = playerPositions[player.id]
            const coords = getCellCoords(pos)

            // Calculate player overlaps to offset tokens slightly
            const listAtPos = activePlayers.filter(p => playerPositions[p.id] === pos)
            const playerIdxInList = listAtPos.findIndex(p => p.id === player.id)
            const count = listAtPos.length

            // If token is at position 0, place in Start Zone at bottom-left
            const cellCenter = pos === 0
              ? { x: 12, y: 105 }
              : { x: coords.c * 10 + 5, y: coords.r * 10 + 5 }

            let dx = 0
            let dy = 0
            if (count === 2) {
              dx = playerIdxInList === 0 ? -1.8 : 1.8
              dy = playerIdxInList === 0 ? -1.8 : 1.8
            } else if (count === 3) {
              if (playerIdxInList === 0) { dx = -2; dy = -2 }
              else if (playerIdxInList === 1) { dx = 2; dy = -2 }
              else if (playerIdxInList === 2) { dx = 0; dy = 2 }
            } else if (count === 4) {
              if (playerIdxInList === 0) { dx = -2; dy = -2 }
              else if (playerIdxInList === 1) { dx = 2; dy = -2 }
              else if (playerIdxInList === 2) { dx = -2; dy = 2 }
              else if (playerIdxInList === 3) { dx = 2; dy = 2 }
            }

            return (
              <div
                key={player.id}
                style={{
                  position: 'absolute',
                  left: `${cellCenter.x + dx}%`,
                  top: `${cellCenter.y + dy}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: player.color,
                  border: '2px solid #ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  boxShadow: `0 0 12px ${player.color}`,
                  zIndex: 20 + idx,
                  transition: 'left 0.3s cubic-bezier(0.25, 1, 0.5, 1), top 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
                  pointerEvents: 'none'
                }}
              >
                {player.emoji}
              </div>
            )
          })}
        </div>
      </div>

      {/* Control panel & active player list */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
        width: '100%',
        maxWidth: 380,
        marginBottom: 16
      }}>
        {activePlayers.map((player) => {
          const isTurn = currentPlayer.id === player.id && !winner
          const pos = playerPositions[player.id]
          const isPlayerRolling = isTurn && isRolling
          const isPlayerTurnToRoll = isTurn && !isRolling && !isMoving

          return (
            <div
              key={player.id}
              style={{
                background: boardTheme === 'retro' ? '#fafaf9' : '#11112b',
                border: boardTheme === 'retro'
                  ? `2px solid ${isTurn ? player.color : '#e7e5e4'}`
                  : `2px solid ${isTurn ? player.color : '#1f1f3e'}`,
                boxShadow: isTurn 
                  ? (boardTheme === 'retro' ? `0 4px 10px ${player.color}33` : `0 0 12px ${player.color}44`)
                  : 'none',
                borderRadius: 12,
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: 180,
                height: 62,
                boxSizing: 'border-box',
                transition: 'all 0.3s',
                fontFamily: font,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12 }}>{player.emoji}</span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 'bold',
                    color: boardTheme === 'retro' ? '#292524' : '#fff',
                    maxWidth: 95,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {player.displayName.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 9, color: boardTheme === 'retro' ? '#78350f' : '#64748b' }}>
                  TILE: <b style={{ color: player.color }}>{pos === 0 ? 'START' : pos}</b>
                </div>
              </div>

              {/* Individual Player Dice Roller */}
              <div style={{
                width: 46, height: 46, borderRadius: 10,
                background: isTurn 
                  ? (boardTheme === 'retro' ? '#fafaf9' : '#1f1f3e') 
                  : (boardTheme === 'retro' ? '#fafaf9' : '#15152a'),
                border: boardTheme === 'retro'
                  ? `2px solid ${isTurn ? player.color : '#e7e5e4'}`
                  : `1px solid ${isTurn ? player.color : '#27274a'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {isTurn ? (
                  <button
                    onClick={() => rollDice()}
                    disabled={isRolling || isMoving || isMoveInFlight || (mode && player.displayName === 'Bot')}
                    className="btn-touch"
                    style={{
                      width: '100%', height: '100%',
                      background: isPlayerTurnToRoll && !(mode && player.displayName === 'Bot')
                        ? (boardTheme === 'retro' ? `linear-gradient(135deg, #f59e0b, #d97706)` : `linear-gradient(135deg, ${player.color}, ${player.color}cc)`)
                        : '#ffffff',
                      border: 'none', borderRadius: 9,
                      color: isPlayerTurnToRoll && !(mode && player.displayName === 'Bot') ? '#ffffff' : (boardTheme === 'retro' ? '#78350f' : player.color),
                      fontSize: (isBotThinking || isPlayerRolling) ? 22 : (diceVal ? 30 : 22),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: isRolling || isMoving || isMoveInFlight || (mode && player.displayName === 'Bot') ? 'default' : 'pointer',
                      boxShadow: isPlayerTurnToRoll && !(mode && player.displayName === 'Bot')
                        ? (boardTheme === 'retro' ? '0 3px 6px rgba(217, 119, 6, 0.4)' : `0 0 8px ${player.color}88`) 
                        : 'none',
                      transform: isPlayerRolling ? 'rotate(360deg)' : 'none',
                      transition: isPlayerRolling ? 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none',
                      padding: 0,
                      outline: 'none',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {isBotThinking ? '🤖' : (isPlayerRolling ? '🎲' : (diceVal ? DICE_FACES[diceVal - 1] : '🎲'))}
                  </button>
                ) : (
                  <span style={{ fontSize: 16, color: boardTheme === 'retro' ? '#d6d3d1' : '#374151', opacity: 0.5 }}>🎲</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Winner Overlay dialog */}
      {winner && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: boardTheme === 'retro' ? 'rgba(69, 26, 3, 0.85)' : 'rgba(5, 5, 15, 0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: 16
        }}>
          <div style={{
            background: boardTheme === 'retro' ? '#fefbf3' : '#0d0d20',
            border: boardTheme === 'retro' ? '4px solid #78350f' : '2px solid #eab308',
            borderRadius: 20,
            padding: '32px 24px',
            width: '100%',
            maxWidth: 340,
            textAlign: 'center',
            boxShadow: boardTheme === 'retro' ? '0 10px 30px rgba(0,0,0,0.3)' : '0 0 24px rgba(234, 179, 8, 0.3)',
            boxSizing: 'border-box',
            fontFamily: font,
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
            <h2 style={{ color: boardTheme === 'retro' ? '#78350f' : '#eab308', fontSize: 18, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 8px 0' }}>
              VICTORY!
            </h2>
            <p style={{ color: boardTheme === 'retro' ? '#292524' : '#fff', fontSize: 18, fontWeight: 'bold', margin: '0 0 24px 0' }}>
              {winner.toUpperCase()} IS THE CHAMPION!
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => resetGame(false)} className="btn-touch" style={{
                flex: 1, padding: '14px 12px',
                background: 'transparent',
                border: boardTheme === 'retro' ? '2px solid #78350f' : '2px solid #f43f5e',
                borderRadius: 12,
                color: boardTheme === 'retro' ? '#78350f' : '#f43f5e',
                fontSize: 11, fontWeight: 900,
                letterSpacing: 2, textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: font,
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
                fontFamily: font,
                outline: 'none',
                WebkitTapHighlightColor: 'transparent'
              }}>
                ← LOBBY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Footer */}
      {!winner && (
        <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
          <button onClick={() => resetGame(false)} className="btn-touch" style={{
            background: 'transparent',
            border: boardTheme === 'retro' ? '2px dashed #78350f' : '1px dashed #334155',
            borderRadius: 8, padding: '12px 20px',
            color: boardTheme === 'retro' ? '#78350f' : '#64748b',
            fontSize: 11, letterSpacing: 2, fontWeight: 'bold', cursor: 'pointer',
            fontFamily: font,
            outline: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}>
            ↺ RESET
          </button>
          <button onClick={() => router.back()} className="btn-touch" style={{
            background: 'transparent',
            border: boardTheme === 'retro' ? '2px solid #78350f' : '1px solid #334155',
            borderRadius: 8, padding: '12px 20px',
            color: boardTheme === 'retro' ? '#78350f' : '#475569',
            fontSize: 11, letterSpacing: 2, fontWeight: 'bold', cursor: 'pointer',
            fontFamily: font,
            outline: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}>
            ← QUIT GAME
          </button>
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
        @keyframes pulse-goal {
          from { transform: scale(0.95); text-shadow: 0 0.5px 2px rgba(234, 179, 8, 0.4); }
          to { transform: scale(1.15); text-shadow: 0 1px 6px rgba(234, 179, 8, 0.9); }
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

export default function SnakeLadder() {
  return (
    <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center', marginTop: 100 }}>Loading Snakes & Ladders...</div>}>
      <SnakeLadderContent />
    </Suspense>
  )
}
