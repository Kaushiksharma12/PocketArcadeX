'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const playerColors = [
  { border: '#00f0ff', emoji: '🎮' },
  { border: '#ff00ff', emoji: '🕹️' },
  { border: '#00ff88', emoji: '👾' },
  { border: '#ffaa00', emoji: '🏆' },
]

export default function Home() {
  const [playerCount, setPlayerCount] = useState(2)
  const [names, setNames] = useState(['', '', '', ''])
  const router = useRouter()

  function updateName(i: number, val: string) {
    const u = [...names]; u[i] = val; setNames(u)
  }

  function startGame() {
    const active = names.slice(0, playerCount)
    if (active.every(n => n.trim())) {
      const q = active.map((n, i) => `p${i+1}=${encodeURIComponent(n)}`).join('&')
      router.push(`/games?${q}`)
    } else {
      alert('Please enter all player names!')
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
          }}>POCKET ARCADE</h1>
          <div style={{ height:1, background:'linear-gradient(to right, transparent, #00f0ff, transparent)', marginTop:10 }}/>
        </div>

        {/* Player count */}
        <p style={{ color:'#666', fontSize:10, letterSpacing:4, textTransform:'uppercase', textAlign:'center', marginBottom:12 }}>
          NUMBER OF PLAYERS
        </p>
        <div style={{ display:'flex', gap:10, justifyContent:'center', marginBottom:24 }}>
          {[1,2,3,4].map(n => (
            <button key={n} onClick={()=>setPlayerCount(n)} style={{
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
                placeholder={`Player ${i+1} name`}
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

        {/* Start button */}
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

        <p style={{ color:'#222', fontSize:10, letterSpacing:2, textAlign:'center', marginTop:16, textTransform:'uppercase' }}>
          Tic Tac Toe · Connect 4 · Chess · Snake · Ludo · Snakes & Ladders
        </p>
      </div>
    </main>
  )
}