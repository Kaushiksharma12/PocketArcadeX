'use client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

const WINNING_COMBOS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
]

function TicTacToeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const p1 = decodeURIComponent(searchParams.get('p1')||'Player 1')
  const p2 = decodeURIComponent(searchParams.get('p2')||'Player 2')

  const [board,    setBoard]    = useState<(string | null)[]>(Array(9).fill(null))
  const [isX,      setIsX]      = useState(true)
  const [winner,   setWinner]   = useState<string | null>(null)
  const [winCombo, setWinCombo] = useState<number[]>([])
  const [scores,   setScores]   = useState<Record<string, number>>({ X:0, O:0 })
  const [draws,    setDraws]    = useState(0)

  const playerColors: Record<string, string> = { X:'#00f0ff', O:'#ff00ff' }

  function checkWinner(squares: (string | null)[]) {
    for (let combo of WINNING_COMBOS) {
      const [a,b,c] = combo
      if (squares[a] && squares[a]===squares[b] && squares[a]===squares[c])
        return { winner:squares[a], combo }
    }
    if (squares.every(s=>s!==null)) return { winner:'draw', combo:[] }
    return null
  }

  function handleTap(i: number) {
    if (board[i]||winner) return
    const newBoard = [...board]
    newBoard[i] = isX ? 'X' : 'O'
    setBoard(newBoard)
    const result = checkWinner(newBoard)
    if (result) {
      setWinner(result.winner)
      setWinCombo(result.combo)
      if (result.winner==='draw') setDraws(d=>d+1)
      else setScores(prev=>({...prev,[result.winner]:prev[result.winner]+1}))
    } else {
      setIsX(!isX)
    }
  }

  function reset() {
    setBoard(Array(9).fill(null))
    setWinner(null)
    setWinCombo([])
    setIsX(true)
  }

  const currentSymbol = isX ? 'X' : 'O'
  const currentName   = isX ? p1 : p2
  const currentColor  = playerColors[currentSymbol]

  return (
    <main style={{
      minHeight: '100dvh',
      background:'#0a0a1a',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      padding:'20px 16px',
      fontFamily:"'Courier New', monospace",
      boxSizing:'border-box',
      overflowX:'hidden',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none',
      touchAction: 'manipulation',
    }}>

      {/* Title */}
      <h1 style={{
        fontSize:20, fontWeight:900, color:'#fff',
        letterSpacing:6, textTransform:'uppercase',
        textShadow:'0 0 20px #00f0ff',
        marginBottom:20, marginTop:0,
      }}>TIC TAC TOE</h1>

      {/* Scoreboard */}
      <div style={{ display:'flex', gap:10, marginBottom:20, width:'100%', maxWidth:340 }}>
        {[{name:p1,sym:'X'},{name:p2,sym:'O'}].map(({name,sym})=>(
          <div key={sym} style={{
            flex:1,
            border:`2px solid ${playerColors[sym]}`,
            borderRadius:14, padding:'12px 8px',
            textAlign:'center',
            background: !winner&&currentSymbol===sym ? `${playerColors[sym]}15` : 'transparent',
            boxShadow: !winner&&currentSymbol===sym ? `0 0 16px ${playerColors[sym]}44` : 'none',
            transition:'all 0.3s',
          }}>
            <div style={{ color:playerColors[sym], fontSize:10, letterSpacing:2, marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {name.toUpperCase()}
            </div>
            <div style={{ color:'#fff', fontSize:32, fontWeight:900 }}>
              {scores[sym]}
            </div>
            <div style={{ color:playerColors[sym], fontSize:11, marginTop:2 }}>{sym}</div>
          </div>
        ))}
        <div style={{
          width:60, border:'1px solid #333',
          borderRadius:14, padding:'12px 4px',
          textAlign:'center', background:'transparent',
        }}>
          <div style={{ color:'#444', fontSize:9, letterSpacing:1, marginBottom:4 }}>DRAW</div>
          <div style={{ color:'#666', fontSize:28, fontWeight:900 }}>{draws}</div>
        </div>
      </div>

      {/* Turn / Winner Display (In-game Header status) */}
      <div style={{ height:32, display:'flex', alignItems:'center', marginBottom:16 }}>
        {!winner ? (
          <p style={{ color:currentColor, fontSize:11, letterSpacing:3, textTransform:'uppercase', margin:0 }}>
            ▶ {currentName}'S TURN ({currentSymbol})
          </p>
        ) : (
          <p style={{
            color: winner==='draw'?'#ffaa00':playerColors[winner],
            fontSize:14, letterSpacing:3, textTransform:'uppercase',
            margin:0, fontWeight:900,
            textShadow:`0 0 20px ${winner==='draw'?'#ffaa00':playerColors[winner]}`,
          }}>
            {winner==='draw' ? '⚡ DRAW!' : `🏆 ${winner==='X'?p1:p2} WINS!`}
          </p>
        )}
      </div>

      {/* Board */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(3, 1fr)',
        gap:8,
        width:'100%',
        maxWidth:320,
        marginBottom:24,
      }}>
        {board.map((cell,i)=>{
          const isWin = winCombo.includes(i)
          return (
            <div
              key={i}
              onClick={()=>handleTap(i)}
              className={!cell && !winner ? 'btn-touch' : ''}
              style={{
                aspectRatio:'1',
                background: isWin && cell ? `${playerColors[cell]}22` : '#0d0d20',
                border:`2px solid ${isWin && cell ? playerColors[cell] : '#1a1a3a'}`,
                borderRadius:14,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:52, fontWeight:900,
                color: cell ? playerColors[cell] : 'transparent',
                textShadow: cell ? `0 0 20px ${playerColors[cell]}` : 'none',
                boxShadow: isWin && cell ? `0 0 20px ${playerColors[cell]}66` : 'none',
                cursor: cell||winner ? 'default' : 'pointer',
                transition:'all 0.15s',
                WebkitTapHighlightColor:'transparent',
                userSelect:'none',
                outline: 'none',
              }}
            >
              {cell}
            </div>
          )
        })}
      </div>

      {/* Bottom Action Buttons (Hidden when overlay is shown, or kept for reset/exit) */}
      <div style={{ display:'flex', gap:10, width:'100%', maxWidth:320 }}>
        <button onClick={reset} className="btn-touch" style={{
          flex:1, padding:'14px',
          background:'transparent',
          border:'2px solid #00ff88',
          borderRadius:12, color:'#00ff88',
          fontSize:12, fontWeight:900,
          letterSpacing:3, textTransform:'uppercase',
          cursor:'pointer',
          fontFamily:"'Courier New', monospace",
          outline: 'none',
          WebkitTapHighlightColor:'transparent',
        }}>
          ↺ RESET
        </button>
        <button onClick={()=>router.back()} className="btn-touch" style={{
          flex:1, padding:'14px',
          background:'transparent',
          border:'1px solid #333',
          borderRadius:12, color:'#555',
          fontSize:12, fontWeight:900,
          letterSpacing:3, textTransform:'uppercase',
          cursor:'pointer',
          fontFamily:"'Courier New', monospace",
          outline: 'none',
          WebkitTapHighlightColor:'transparent',
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
            border: `2px solid ${winner === 'draw' ? '#ffaa00' : playerColors[winner]}`,
            borderRadius: 20,
            padding: '32px 24px',
            width: '100%',
            maxWidth: 340,
            textAlign: 'center',
            boxShadow: `0 0 24px ${winner === 'draw' ? '#ffaa00' : playerColors[winner]}44`,
            boxSizing: 'border-box'
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {winner === 'draw' ? '⚡' : '🏆'}
            </div>
            <h2 style={{
              color: winner === 'draw' ? '#ffaa00' : playerColors[winner],
              fontSize: 18, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 8px 0'
            }}>
              {winner === 'draw' ? 'DRAW!' : 'VICTORY!'}
            </h2>
            <p style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', margin: '0 0 24px 0' }}>
              {winner === 'draw' ? 'THE GAME IS A DRAW!' : `${winner === 'X' ? p1 : p2} WINS!`}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={reset} className="btn-touch" style={{
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

export default function TicTacToe() {
  return <Suspense><TicTacToeContent/></Suspense>
}