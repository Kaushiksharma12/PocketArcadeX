'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  generateRoomCode,
  getSessionPlayerId,
  publishEvent,
  OnlineConnection
} from './lib/online'

const playerColors = [
  { border: '#00f0ff', emoji: '🎮' },
  { border: '#ff00ff', emoji: '🕹️' },
  { border: '#00ff88', emoji: '👾' },
  { border: '#ffaa00', emoji: '🏆' },
]

export default function Home() {
  const [gameMode, setGameMode] = useState<'local' | 'bot' | 'online'>('local')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [firstTurn, setFirstTurn] = useState<'player' | 'bot' | 'random'>('player')
  const [playerCount, setPlayerCount] = useState(2)
  const [names, setNames] = useState(['', '', '', ''])

  // Online states
  const [onlineSubMode, setOnlineSubMode] = useState<'menu' | 'waiting_create' | 'waiting_join'>('menu')
  const [roomCode, setRoomCode] = useState('')
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [onlinePlayers, setOnlinePlayers] = useState<string[]>([])
  const [onlineStatus, setOnlineStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')
  const connectionRef = useRef<any>(null)
  const processedIdsRef = useRef<Set<string>>(new Set())

  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const joinParam = urlParams.get('join')
      if (joinParam) {
        const trimmedCode = joinParam.trim().toUpperCase()
        if (trimmedCode.length === 6) {
          setGameMode('online')
          setJoinCodeInput(trimmedCode)
        }
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (connectionRef.current) {
        connectionRef.current.disconnect()
      }
    }
  }, [])

  function handleCreateRoom() {
    if (connectionRef.current) {
      connectionRef.current.disconnect()
    }
    const hostName = names[0].trim() || 'Player 1'
    const code = generateRoomCode()
    setRoomCode(code)
    setOnlinePlayers([hostName])
    setOnlineSubMode('waiting_create')

    const processedIds = new Set<string>()
    processedIdsRef.current = processedIds

    const conn = new OnlineConnection(
      code,
      (event) => {
        if (event.type === 'join') {
          setOnlinePlayers(prev => {
            const guestName = event.payload.name || `Player ${prev.length + 1}`
            const nextPlayers = [...prev, guestName]
            
            if (nextPlayers.length >= playerCount) {
              publishEvent(code, 'start_lobby', { players: nextPlayers })
              setTimeout(() => {
                conn.disconnect()
                const q = nextPlayers.map((n, i) => `p${i+1}=${encodeURIComponent(n)}`).join('&') + `&mode=online&room=${code}&role=host`
                router.push(`/games?${q}`)
              }, 500)
            } else {
              publishEvent(code, 'lobby_update', { players: nextPlayers })
            }
            return nextPlayers
          })
        }
      },
      (status) => setOnlineStatus(status),
      processedIds
    )

    connectionRef.current = conn
    conn.connect()
  }

  function handleJoinRoom() {
    if (connectionRef.current) {
      connectionRef.current.disconnect()
    }
    const guestName = names[0].trim() || 'Player 2'
    const code = joinCodeInput.trim().toUpperCase()
    if (code.length !== 6) {
      alert('Please enter a valid 6-character room code.')
      return
    }
    setRoomCode(code)
    setOnlinePlayers([guestName])
    setOnlineSubMode('waiting_join')

    const processedIds = new Set<string>()
    processedIdsRef.current = processedIds

    let hasJoined = false

    const conn = new OnlineConnection(
      code,
      (event) => {
        if (event.type === 'lobby_update') {
          setOnlinePlayers(event.payload.players)
        } else if (event.type === 'start_lobby') {
          const nextPlayers = event.payload.players
          const myIdx = nextPlayers.indexOf(guestName)
          const role = myIdx >= 0 ? `guest${myIdx}` : 'guest1'
          
          conn.disconnect()
          const q = nextPlayers.map((n: string, i: number) => `p${i+1}=${encodeURIComponent(n)}`).join('&') + `&mode=online&room=${code}&role=${role}`
          router.push(`/games?${q}`)
        }
      },
      async (status) => {
        setOnlineStatus(status)
        if (status === 'connected' && !hasJoined) {
          hasJoined = true
          await publishEvent(code, 'join', { name: guestName })
        }
      },
      processedIds
    )

    connectionRef.current = conn
    conn.connect()
  }

  function updateName(i: number, val: string) {
    const u = [...names]; u[i] = val; setNames(u)
  }

  function startGame() {
    console.log("startGame called, gameMode:", gameMode, "playerCount:", playerCount)
    try {
      if (gameMode === 'local') {
        const active = names.slice(0, playerCount).map((n, i) => {
          const trimmed = typeof n === 'string' ? n.trim() : ''
          return trimmed || `Player ${i+1}`
        })
        const q = active.map((n, i) => `p${i+1}=${encodeURIComponent(n)}`).join('&')
        router.push(`/games?${q}`)
      } else {
        const p1Name = names[0].trim() || 'Player 1'
        const isBotFirst = firstTurn === 'bot' || (firstTurn === 'random' && Math.random() < 0.5)
        const p1NameParam = isBotFirst ? 'Bot' : p1Name
        const p2NameParam = isBotFirst ? p1Name : 'Bot'
        const q = `p1=${encodeURIComponent(p1NameParam)}&p2=${encodeURIComponent(p2NameParam)}&mode=bot&difficulty=${difficulty}&first=${firstTurn}`
        router.push(`/games?${q}`)
      }
    } catch (err) {
      console.error("Error in startGame:", err)
    }
  }

  return (
    <main style={{
      minHeight: '100dvh',
      background: '#0a0a1a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px 16px',
      fontFamily: "'Courier New', monospace",
      boxSizing: 'border-box',
      overflowX: 'hidden',
    }}>

      {/* Background glows */}
      <div style={{ position:'fixed', top:-100, left:-100, width:300, height:300, borderRadius:'50%', background:'#00f0ff', opacity:0.05, filter:'blur(80px)', pointerEvents:'none' }}/>
      <div style={{ position:'fixed', bottom:-100, right:-100, width:300, height:300, borderRadius:'50%', background:'#ff00ff', opacity:0.05, filter:'blur(80px)', pointerEvents:'none' }}/>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: '#0d0d20',
        border: '2px solid #00f0ff',
        borderRadius: 20,
        padding: '28px 20px',
        boxShadow: '0 0 30px #00f0ff22',
        boxSizing: 'border-box',
      }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🎮</div>
          <h1 style={{
            fontSize: 26, fontWeight:900, color:'#fff',
            letterSpacing:5, textTransform:'uppercase',
            textShadow:'0 0 20px #00f0ff',
            margin:0,
          }}>POCKETARCADE X</h1>
          <div style={{ height:1, background:'linear-gradient(to right, transparent, #00f0ff, transparent)', marginTop:10 }}/>
        </div>
        {/* Game Mode Selector */}
        <div style={{ display:'flex', border:'1px solid #333', borderRadius:14, padding:4, gap:4, marginBottom:20 }}>
          <button type="button" onClick={() => { setGameMode('local'); setOnlineSubMode('menu'); }} style={{
            flex:1, padding:'10px 0', borderRadius:10, border:'none',
            background: gameMode === 'local' ? '#00f0ff22' : 'transparent',
            color: gameMode === 'local' ? '#00f0ff' : '#666',
            fontWeight: 900, fontSize:10, cursor:'pointer', letterSpacing:1,
            transition:'all 0.2s', outline:'none',
            fontFamily:"'Courier New', monospace",
          }}>
            👥 LOCAL
          </button>
          <button type="button" onClick={() => { setGameMode('bot'); setOnlineSubMode('menu'); }} style={{
            flex:1, padding:'10px 0', borderRadius:10, border:'none',
            background: gameMode === 'bot' ? '#ff00ff22' : 'transparent',
            color: gameMode === 'bot' ? '#ff00ff' : '#666',
            fontWeight: 900, fontSize:10, cursor:'pointer', letterSpacing:1,
            transition:'all 0.2s', outline:'none',
            fontFamily:"'Courier New', monospace",
          }}>
            🤖 BOT
          </button>
          <button type="button" onClick={() => setGameMode('online')} style={{
            flex:1, padding:'10px 0', borderRadius:10, border:'none',
            background: gameMode === 'online' ? '#00ff8822' : 'transparent',
            color: gameMode === 'online' ? '#00ff88' : '#666',
            fontWeight: 900, fontSize:10, cursor:'pointer', letterSpacing:1,
            transition:'all 0.2s', outline:'none',
            fontFamily:"'Courier New', monospace",
          }}>
            🌐 ONLINE
          </button>
        </div>

        {gameMode === 'local' && (
          <>
            {/* Player count */}
            <p style={{ color:'#666', fontSize:10, letterSpacing:4, textTransform:'uppercase', textAlign:'center', marginBottom:12 }}>
              NUMBER OF PLAYERS
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'center', marginBottom:24 }}>
              {[1,2,3,4].map(n => (
                <button key={n} type="button" onClick={()=>setPlayerCount(n)} style={{
                  width: 64, height: 64,
                  borderRadius: 14,
                  border: `2px solid ${playerCount===n ? '#00f0ff' : '#333'}`,
                  background: playerCount===n ? '#00f0ff22' : 'transparent',
                  color: playerCount===n ? '#00f0ff' : '#555',
                  fontSize: 22, fontWeight:900,
                  cursor:'pointer',
                  boxShadow: playerCount===n ? '0 0 16px #00f0ff44' : 'none',
                  transition:'all 0.2s',
                  WebkitTapHighlightColor:'transparent',
                  fontFamily:"'Courier New', monospace",
                }}>{n}</button>
              ))}
            </div>

            {/* Divider */}
            <div style={{ borderTop:'1px solid #1a1a3a', marginBottom:20 }}/>

            {/* Name inputs */}
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:20 }}>
              {Array.from({ length: playerCount }).map((_,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{
                    width:40, height:40, borderRadius:10, flexShrink:0,
                    border:`2px solid ${playerColors[i].border}`,
                    background:`${playerColors[i].border}11`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:18,
                  }}>
                    {playerColors[i].emoji}
                  </div>
                  <input
                    type="text"
                    placeholder={i === 0 ? "🎮 Player 1" : `👤 Player ${i+1}`}
                    value={names[i]}
                    onChange={e=>updateName(i,e.target.value)}
                    style={{
                      flex:1,
                      background:'#111',
                      border:`1px solid #333`,
                      borderRadius:10,
                      padding:'13px 14px',
                      color:'#fff',
                      fontSize:14,
                      letterSpacing:1,
                      outline:'none',
                      fontFamily:"'Courier New', monospace",
                      WebkitAppearance:'none',
                      boxSizing:'border-box',
                    }}
                    onFocus={e=>e.target.style.borderColor=playerColors[i].border}
                    onBlur={e=>e.target.style.borderColor='#333'}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {gameMode === 'bot' && (
          <>
            {/* Player name input (only 1) */}
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{
                  width:40, height:40, borderRadius:10, flexShrink:0,
                  border:`2px solid ${playerColors[0].border}`,
                  background:`${playerColors[0].border}11`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:18,
                }}>
                  {playerColors[0].emoji}
                </div>
                <input
                  type="text"
                  placeholder="🎮 Player 1"
                  value={names[0]}
                  onChange={e=>updateName(0,e.target.value)}
                  style={{
                    flex:1,
                    background:'#111',
                    border:`1px solid #333`,
                    borderRadius:10,
                    padding:'13px 14px',
                    color:'#fff',
                    fontSize:14,
                    letterSpacing:1,
                    outline:'none',
                    fontFamily:"'Courier New', monospace",
                    WebkitAppearance:'none',
                    boxSizing:'border-box',
                  }}
                  onFocus={e=>e.target.style.borderColor=playerColors[0].border}
                  onBlur={e=>e.target.style.borderColor='#333'}
                />
              </div>
            </div>

            {/* Bot Difficulty */}
            <p style={{ color:'#666', fontSize:10, letterSpacing:4, textTransform:'uppercase', textAlign:'center', marginBottom:12 }}>
              BOT DIFFICULTY
            </p>
            <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:20 }}>
              {(['easy', 'medium', 'hard'] as const).map(d => {
                const diffColors = {
                  easy: { border: '#22c55e', bg: '#22c55e22', text: '#22c55e', label: '🟢 EASY' },
                  medium: { border: '#eab308', bg: '#eab30822', text: '#eab308', label: '🟡 MEDIUM' },
                  hard: { border: '#ef4444', bg: '#ef444422', text: '#ef4444', label: '🔴 HARD' }
                }
                const active = difficulty === d
                return (
                  <button key={d} type="button" onClick={()=>setDifficulty(d)} style={{
                    flex: 1, height: 44,
                    borderRadius: 12,
                    border: `2px solid ${active ? diffColors[d].border : '#333'}`,
                    background: active ? diffColors[d].bg : 'transparent',
                    color: active ? diffColors[d].text : '#555',
                    fontSize: 10, fontWeight:900, letterSpacing: 2,
                    cursor:'pointer',
                    transition:'all 0.2s',
                    WebkitTapHighlightColor:'transparent',
                    fontFamily:"'Courier New', monospace",
                  }}>{diffColors[d].label}</button>
                )
              })}
            </div>

            {/* Who Goes First? */}
            <p style={{ color:'#666', fontSize:10, letterSpacing:4, textTransform:'uppercase', textAlign:'center', marginBottom:12 }}>
              WHO GOES FIRST?
            </p>
            <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:24 }}>
              {(['player', 'bot', 'random'] as const).map(f => {
                const firstLabels = {
                  player: '👤 PLAYER',
                  bot: '🤖 BOT',
                  random: '🎲 RANDOM'
                }
                const active = firstTurn === f
                const activeColor = f === 'player' ? '#00f0ff' : f === 'bot' ? '#ff00ff' : '#00ff88'
                return (
                  <button key={f} type="button" onClick={()=>setFirstTurn(f)} style={{
                    flex: 1, height: 44,
                    borderRadius: 12,
                    border: `2px solid ${active ? activeColor : '#333'}`,
                    background: active ? `${activeColor}22` : 'transparent',
                    color: active ? activeColor : '#555',
                    fontSize: 10, fontWeight:900, letterSpacing: 1,
                    cursor:'pointer',
                    transition:'all 0.2s',
                    WebkitTapHighlightColor:'transparent',
                    fontFamily:"'Courier New', monospace",
                  }}>{firstLabels[f]}</button>
                )
              })}
            </div>
          </>
        )}

        {gameMode === 'online' && onlineSubMode === 'menu' && (
          <div>
            {/* Player name */}
            <p style={{ color:'#666', fontSize:10, letterSpacing:4, textTransform:'uppercase', textAlign:'center', marginBottom:12 }}>
              YOUR NAME
            </p>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <div style={{
                width:40, height:40, borderRadius:10, flexShrink:0,
                border:`2px solid #00ff88`,
                background:`#00ff8811`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:18,
              }}>
                🎮
              </div>
              <input
                type="text"
                placeholder="🎮 Player 1"
                value={names[0]}
                onChange={e=>updateName(0,e.target.value)}
                style={{
                  flex:1,
                  background:'#111',
                  border:`1px solid #333`,
                  borderRadius:10,
                  padding:'13px 14px',
                  color:'#fff',
                  fontSize:14,
                  letterSpacing:1,
                  outline:'none',
                  fontFamily:"'Courier New', monospace",
                  WebkitAppearance:'none',
                  boxSizing:'border-box',
                }}
                onFocus={e=>e.target.style.borderColor='#00ff88'}
                onBlur={e=>e.target.style.borderColor='#333'}
              />
            </div>

            <div style={{ borderTop:'1px solid #1a1a3a', margin:'20px 0' }}/>

            {/* Create Room Section */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ color:'#666', fontSize:10, letterSpacing:4, textTransform:'uppercase', textAlign:'center', marginBottom:12 }}>
                CREATE A ROOM
              </p>
              <div style={{ display:'flex', gap:10, justifyContent:'center', marginBottom:16 }}>
                {[2,3,4].map(n => (
                  <button key={n} type="button" onClick={()=>setPlayerCount(n)} style={{
                    width: 50, height: 50,
                    borderRadius: 12,
                    border: `2px solid ${playerCount===n ? '#00ff88' : '#333'}`,
                    background: playerCount===n ? '#00ff8822' : 'transparent',
                    color: playerCount===n ? '#00ff88' : '#555',
                    fontSize: 18, fontWeight:900,
                    cursor:'pointer',
                    boxShadow: playerCount===n ? '0 0 12px #00ff8844' : 'none',
                    transition:'all 0.2s',
                    WebkitTapHighlightColor:'transparent',
                    fontFamily:"'Courier New', monospace",
                  }}>{n}</button>
                ))}
              </div>
              <button onClick={handleCreateRoom} style={{
                width:'100%',
                padding:'14px',
                background:'linear-gradient(135deg, #00ff88, #00b3ff)',
                border:'none',
                borderRadius:12,
                color:'#111',
                fontSize:12,
                fontWeight:900,
                letterSpacing:3,
                textTransform:'uppercase',
                cursor:'pointer',
                fontFamily:"'Courier New', monospace",
                WebkitTapHighlightColor:'transparent',
                boxShadow:'0 4px 15px #00ff8833',
              }}>
                CREATE ROOM
              </button>
            </div>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, margin:'20px 0' }}>
              <div style={{ flex:1, height:1, background:'#1a1a3a' }}/>
              <span style={{ color:'#444', fontSize:10, letterSpacing:2 }}>OR</span>
              <div style={{ flex:1, height:1, background:'#1a1a3a' }}/>
            </div>

            {/* Join Room Section */}
            <div>
              <p style={{ color:'#666', fontSize:10, letterSpacing:4, textTransform:'uppercase', textAlign:'center', marginBottom:12 }}>
                JOIN EXISTING ROOM
              </p>
              <div style={{ display:'flex', gap:10, marginBottom:12 }}>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="ROOM CODE"
                  value={joinCodeInput}
                  onChange={e=>setJoinCodeInput(e.target.value.toUpperCase())}
                  style={{
                    flex:1,
                    background:'#111',
                    border:`1px solid #333`,
                    borderRadius:10,
                    padding:'13px 14px',
                    color:'#fff',
                    fontSize:14,
                    letterSpacing:3,
                    textAlign:'center',
                    outline:'none',
                    fontFamily:"'Courier New', monospace",
                    WebkitAppearance:'none',
                    boxSizing:'border-box',
                  }}
                  onFocus={e=>e.target.style.borderColor='#ffaa00'}
                  onBlur={e=>e.target.style.borderColor='#333'}
                />
              </div>
              <button onClick={handleJoinRoom} style={{
                width:'100%',
                padding:'14px',
                background:'linear-gradient(135deg, #ffaa00, #ff5500)',
                border:'none',
                borderRadius:12,
                color:'#111',
                fontSize:12,
                fontWeight:900,
                letterSpacing:3,
                textTransform:'uppercase',
                cursor:'pointer',
                fontFamily:"'Courier New', monospace",
                WebkitTapHighlightColor:'transparent',
                boxShadow:'0 4px 15px #ffaa0033',
              }}>
                JOIN ROOM
              </button>
            </div>
          </div>
        )}

        {gameMode === 'online' && onlineSubMode !== 'menu' && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>
              {onlineSubMode === 'waiting_create' ? '📡' : '🔗'}
            </div>
            
            <h2 style={{
              fontSize: 14, color: '#fff', letterSpacing: 3,
              textTransform: 'uppercase', margin: '0 0 6px 0'
            }}>
              {onlineSubMode === 'waiting_create' ? 'ROOM CREATED' : 'JOINING ROOM'}
            </h2>
            
            <div style={{
              background: '#111',
              border: '1px solid #333',
              borderRadius: 14,
              padding: '16px',
              margin: '16px 0',
              position: 'relative'
            }}>
              <p style={{ color: '#666', fontSize: 9, letterSpacing: 2, margin: '0 0 6px 0', textTransform: 'uppercase' }}>
                ROOM CODE
              </p>
              <h3 style={{
                color: '#00ff88', fontSize: 32, fontWeight: 900,
                letterSpacing: 6, margin: 0, textShadow: '0 0 15px #00ff8888'
              }}>
                {roomCode}
              </h3>
              
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    const shareUrl = `${window.location.origin}/?join=${roomCode}`
                    navigator.clipboard.writeText(shareUrl)
                    alert('Share link copied to clipboard!')
                  }
                }}
                style={{
                  background: 'transparent', border: '1px solid #00ff8844',
                  borderRadius: 10, color: '#00ff88', fontSize: 9,
                  letterSpacing: 2, padding: '6px 12px', marginTop: 12,
                  cursor: 'pointer', fontFamily: "'Courier New', monospace"
                }}
              >
                📋 COPY SHARE LINK
              </button>
            </div>

            <p style={{
              color: '#aaa', fontSize: 11, letterSpacing: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              margin: '0 0 20px 0'
            }}>
              <span className="dot-pulse" />
              {onlineStatus === 'connecting' ? (
                'CONNECTING TO NETWORK...'
              ) : onlineSubMode === 'waiting_create' ? (
                `WAITING FOR PLAYERS (${onlinePlayers.length}/${playerCount})...`
              ) : (
                'WAITING FOR HOST TO START...'
              )}
            </p>

            {/* List joined players */}
            {onlinePlayers.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ color: '#444', fontSize: 9, letterSpacing: 2, margin: '0 0 8px 0', textTransform: 'uppercase', textAlign: 'left' }}>
                  PLAYERS IN ROOM:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {onlinePlayers.map((name, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: '#12122b', border: '1px solid #1a1a3a',
                      borderRadius: 8, padding: '8px 12px'
                    }}>
                      <span style={{ fontSize: 12 }}>👤</span>
                      <span style={{
                        color: idx === 0 ? '#00f0ff' : '#ff00ff',
                        fontSize: 12, fontWeight: 'bold', letterSpacing: 1
                      }}>
                        {name} {idx === 0 ? '(HOST)' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                if (connectionRef.current) {
                  connectionRef.current.disconnect()
                }
                setOnlineSubMode('menu')
              }}
              style={{
                width: '100%',
                padding: '12px',
                background: 'transparent',
                border: '1px solid #ef4444',
                borderRadius: 12,
                color: '#ef4444',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 2,
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: "'Courier New', monospace"
              }}
            >
              CANCEL
            </button>
          </div>
        )}

        {/* Start button */}
        {gameMode !== 'online' && (
          <button onClick={startGame} style={{
            width:'100%',
            padding:'16px',
            background:'linear-gradient(135deg, #7c3aed, #db2777)',
            border:'none',
            borderRadius:14,
            color:'#fff',
            fontSize:15,
            fontWeight:900,
            letterSpacing:4,
            textTransform:'uppercase',
            cursor:'pointer',
            fontFamily:"'Courier New', monospace",
            WebkitTapHighlightColor:'transparent',
            boxShadow:'0 4px 20px #7c3aed44',
          }}>
            START PLAYING →
          </button>
        )}

        <p style={{ color:'#222', fontSize:10, letterSpacing:2, textAlign:'center', marginTop:16, textTransform:'uppercase' }}>
          Tic Tac Toe · Connect 4 · Chess · Snake · Ludo · Snakes & Ladders
        </p>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .dot-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #00ff88;
          display: inline-block;
          animation: pulse 1.5s infinite ease-in-out;
        }
      `}</style>
    </main>
  )
}