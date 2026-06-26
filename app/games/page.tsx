'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useEffect, useState, useRef } from 'react'
import { publishEvent, OnlineConnection } from '../lib/online'

const games = [
  { id:'tictactoe', name:'TIC TAC TOE',  emoji:'✖️',  description:'Classic 3x3 battle',   players:'2 players',   minPlayers:2, maxPlayers:2, color:'#00f0ff', available:true  },
  { id:'connect4',  name:'CONNECT 4',    emoji:'🔴',  description:'Drop to connect',       players:'2-4 players', minPlayers:2, maxPlayers:4, color:'#ff00ff', available:true  },
  { id:'chess',     name:'CHESS',        emoji:'♟️',  description:'Battle of strategy',    players:'2 players',   minPlayers:2, maxPlayers:2, color:'#a78bfa', available:true  },
  { id:'snake',     name:'SNAKE',        emoji:'🐍',  description:'Grow or die',           players:'1 player',    minPlayers:1, maxPlayers:1, color:'#ffaa00', available:true  },
  { id:'ludo',      name:'LUDO',         emoji:'🎲',  description:'Race to the finish',    players:'2-4 players', minPlayers:2, maxPlayers:4, color:'#00ff88', available:true  },
  { id:'snakeladder', name:'SNAKES & LADDERS', emoji:'🪜', description:'Race to the top (100)!', players:'2-4 players', minPlayers:2, maxPlayers:4, color:'#f43f5e', available:true },
]


function GamesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const players: string[] = []
  for (let i=1;i<=4;i++) {
    const n = searchParams.get(`p${i}`)
    if (n) players.push(n)
  }
  const playerCount = players.length
  const filteredGames   = games.filter(g => playerCount>=g.minPlayers && playerCount<=g.maxPlayers)
  const incompatible    = games.filter(g => playerCount<g.minPlayers  || playerCount>g.maxPlayers)

  const mode = searchParams.get('mode')?.trim()
  const room = searchParams.get('room')?.trim()?.toUpperCase()
  const role = searchParams.get('role')?.trim()
  const isOnline = mode === 'online'

  const [onlineStatus, setOnlineStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')
  const connectionRef = useRef<any>(null)
  const processedIdsRef = useRef<Set<string>>(new Set())

  // Connect to room if online mode
  useEffect(() => {
    if (!isOnline || !room) return

    const processedIds = new Set<string>()
    processedIdsRef.current = processedIds

    // Fetch history first to check if host already selected a game
    const topic = `pocket-arcade-x-room-${room.toUpperCase()}`
    fetch(`https://ntfy.sh/${topic}/json?poll=1&since=all`)
      .then(res => res.text())
      .then(text => {
        if (!text.trim()) return
        const lines = text.split('\n').filter(Boolean)
        for (const line of lines) {
          try {
            const rawMsg = JSON.parse(line)
            if (rawMsg.event === 'message' && rawMsg.message) {
              const parsed = JSON.parse(rawMsg.message)
              if (parsed.type === 'select_game') {
                const gameId = parsed.payload.gameId
                const parts = players.map((n, i) => `p${i+1}=${encodeURIComponent(n)}`)
                parts.push(`mode=online`)
                parts.push(`room=${room}`)
                parts.push(`role=${role}`)
                router.push(`/${gameId}?${parts.join('&')}`)
                return
              }
            }
          } catch (e) {}
        }
      })
      .catch(console.error)

    const conn = new OnlineConnection(
      room,
      (event) => {
        if (event.type === 'select_game') {
          const gameId = event.payload.gameId
          conn.disconnect()
          const parts = players.map((n, i) => `p${i+1}=${encodeURIComponent(n)}`)
          parts.push(`mode=online`)
          parts.push(`room=${room}`)
          parts.push(`role=${role}`)
          router.push(`/${gameId}?${parts.join('&')}`)
        }
      },
      (status) => setOnlineStatus(status),
      processedIds
    )

    connectionRef.current = conn
    conn.connect()

    return () => {
      conn.disconnect()
    }
  }, [isOnline, room, role])

  function pickGame(game: any) {
    if (!game.available) return
    
    if (isOnline) {
      if (role !== 'host') return // Guest cannot click
      
      publishEvent(room!, 'select_game', { gameId: game.id })
      
      setTimeout(() => {
        if (connectionRef.current) connectionRef.current.disconnect()
        const parts = players.map((n, i) => `p${i+1}=${encodeURIComponent(n)}`)
        parts.push(`mode=online`)
        parts.push(`room=${room}`)
        parts.push(`role=host`)
        router.push(`/${game.id}?${parts.join('&')}`)
      }, 500)
    } else {
      const extraParams = ['mode', 'difficulty', 'first']
      const parts = players.map((n, i) => `p${i+1}=${encodeURIComponent(n)}`)
      extraParams.forEach(param => {
        const val = searchParams.get(param)
        if (val) parts.push(`${param}=${encodeURIComponent(val)}`)
      })
      const q = parts.join('&')
      router.push(`/${game.id}?${q}`)
    }
  }

  return (
    <main style={{
      minHeight: '100dvh',
      background:'#0a0a1a',
      fontFamily:"'Courier New', monospace",
      padding:'20px 16px',
      boxSizing:'border-box',
      overflowX:'hidden',
    }}>
      <div style={{ maxWidth:420, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <p style={{ color:'#444', letterSpacing:4, fontSize:10, textTransform:'uppercase', marginBottom:10 }}>
            ▶ PLAYERS READY
          </p>
          <div style={{ display:'flex', justifyContent:'center', gap:8, flexWrap:'wrap', marginBottom:16 }}>
            {players.map((name,i) => {
              const colors = ['#00f0ff','#ff00ff','#00ff88','#ffaa00']
              return (
                <div key={i} style={{
                  border:`1px solid ${colors[i]}`,
                  borderRadius:20, padding:'5px 14px',
                  color:colors[i], fontSize:11, letterSpacing:2,
                  boxShadow:`0 0 8px ${colors[i]}44`,
                }}>
                  {decodeURIComponent(name).toUpperCase()}
                </div>
              )
            })}
          </div>
          <h1 style={{
            fontSize:24, fontWeight:900, color:'#fff',
            letterSpacing:5, textTransform:'uppercase',
            textShadow:'0 0 20px #00f0ff',
            margin:0,
          }}>SELECT GAME</h1>
          <div style={{ height:1, background:'linear-gradient(to right, transparent, #00f0ff, transparent)', marginTop:10 }}/>
        </div>

        {isOnline && (
          <div style={{
            background: '#111',
            border: `1px solid ${role === 'host' ? '#00ff88' : '#ffaa00'}`,
            borderRadius: 12,
            padding: '12px',
            marginBottom: 20,
            textAlign: 'center',
            boxShadow: `0 0 10px ${role === 'host' ? '#00ff8822' : '#ffaa0022'}`,
          }}>
            <p style={{
              color: role === 'host' ? '#00ff88' : '#ffaa00',
              fontSize: 10,
              letterSpacing: 2,
              textTransform: 'uppercase',
              margin: 0,
              fontWeight: 'bold',
              lineHeight: 1.4
            }}>
              {role === 'host'
                ? '🌐 YOU ARE THE HOST. SELECT A GAME TO START!'
                : `🌐 WAITING FOR HOST TO SELECT GAME...`}
            </p>
            <p style={{ color: '#555', fontSize: 8, letterSpacing: 1, margin: '4px 0 0 0', textTransform: 'uppercase' }}>
              ROOM CODE: {room} · STATUS: {onlineStatus.toUpperCase()}
            </p>
          </div>
        )}

        {/* Compatible games */}
        {filteredGames.length>0 && (
          <p style={{ color:'#444', fontSize:10, letterSpacing:3, textTransform:'uppercase', marginBottom:10 }}>
            ▶ AVAILABLE FOR {playerCount} PLAYERS
          </p>
        )}
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
          {filteredGames.map(game => (
            <div
              key={game.id}
              onClick={()=>pickGame(game)}
              style={{
                border:`1px solid ${game.available ? game.color+'66' : '#222'}`,
                borderRadius:14, padding:'16px',
                background: game.available ? `${game.color}08` : '#0d0d0d',
                cursor: game.available ? (isOnline && role !== 'host' ? 'default' : 'pointer') : 'not-allowed',
                display:'flex', alignItems:'center', gap:14,
                opacity: game.available ? 1 : 0.4,
                WebkitTapHighlightColor:'transparent',
                transition:'all 0.15s',
                minHeight:70,
              }}
              onTouchStart={e=>{
                if(game.available) e.currentTarget.style.background=`${game.color}22`
              }}
              onTouchEnd={e=>{
                if(game.available) e.currentTarget.style.background=`${game.color}08`
              }}
            >
              <div style={{ fontSize:32, width:44, textAlign:'center', flexShrink:0 }}>
                {game.emoji}
              </div>
              <div style={{ flex:1 }}>
                <div style={{
                  color: game.available ? game.color : '#444',
                  fontSize:14, fontWeight:900, letterSpacing:3,
                  textShadow: game.available ? `0 0 10px ${game.color}88` : 'none',
                }}>
                  {game.name}
                </div>
                <div style={{ color:'#444', fontSize:11, letterSpacing:1, marginTop:3 }}>
                  {game.description} · {game.players}
                </div>
              </div>
              <div style={{
                fontSize:9, letterSpacing:2, padding:'4px 10px',
                borderRadius:20,
                border:`1px solid ${game.available ? game.color : '#333'}`,
                color: game.available ? game.color : '#444',
                flexShrink:0,
              }}>
                {game.available ? 'PLAY' : 'SOON'}
              </div>
            </div>
          ))}
        </div>

        {/* Incompatible games */}
        {incompatible.length>0 && (
          <>
            <p style={{ color:'#222', fontSize:10, letterSpacing:3, textTransform:'uppercase', marginBottom:10 }}>
              ▶ NEEDS DIFFERENT PLAYER COUNT
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {incompatible.map(game => (
                <div key={game.id} style={{
                  border:'1px solid #1a1a1a', borderRadius:14,
                  padding:'14px 16px', background:'#0a0a0a',
                  display:'flex', alignItems:'center', gap:14,
                  opacity:0.3, cursor:'not-allowed', minHeight:60,
                }}>
                  <div style={{ fontSize:28, width:44, textAlign:'center', flexShrink:0 }}>{game.emoji}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ color:'#333', fontSize:13, fontWeight:900, letterSpacing:3 }}>{game.name}</div>
                    <div style={{ color:'#222', fontSize:10, letterSpacing:1, marginTop:2 }}>{game.players}</div>
                  </div>
                  <div style={{ fontSize:9, letterSpacing:2, padding:'4px 10px', borderRadius:20, border:'1px solid #222', color:'#333', flexShrink:0 }}>
                    {game.minPlayers===game.maxPlayers?`${game.minPlayers}P ONLY`:`${game.minPlayers}-${game.maxPlayers}P`}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Back */}
        <button onClick={()=>router.back()} style={{
          marginTop:24, background:'transparent', border:'none',
          color:'#333', cursor:'pointer', fontSize:11,
          letterSpacing:3, textTransform:'uppercase',
          fontFamily:"'Courier New', monospace",
          display:'block', margin:'24px auto 0',
          padding:'12px 20px',
          WebkitTapHighlightColor:'transparent',
        }}>
          ← BACK TO LOBBY
        </button>
      </div>
    </main>
  )
}

export default function Games() {
  return <Suspense><GamesContent/></Suspense>
}