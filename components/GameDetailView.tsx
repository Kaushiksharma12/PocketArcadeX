'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import BottomNav from '@/components/BottomNav'

const GAME_DETAILS_CONFIG: Record<string, {
  title: string
  img: '/images/ludo.png' | '/images/chess.png' | '/images/connect4.png' | '/images/snake.png' | '/images/tictactoe.png' | '/images/snakeladder.png'
  category: string
  players: string
  modeTag: string
  description: string
  playHref: string
}> = {
  ludo: {
    title: 'Ludo',
    img: '/images/ludo.png',
    category: 'Board',
    players: '2–4 Players',
    modeTag: 'Classic',
    description: 'A fun and classic board game. Roll the dice, move your tokens and be the first to reach the home.',
    playHref: '/ludo',
  },
  chess: {
    title: 'Chess',
    img: '/images/chess.png',
    category: 'Strategy',
    players: '2 Players',
    modeTag: 'Classic',
    description: 'The ultimate game of strategy. Outsmart your opponent, control the board and deliver checkmate.',
    playHref: '/chess',
  },
  connect4: {
    title: 'Connect 4',
    img: '/images/connect4.png',
    category: 'Strategy',
    players: '2–4 Players',
    modeTag: 'Arcade',
    description: 'Drop your discs into the grid and be the first to connect four in a row horizontally, vertically or diagonally.',
    playHref: '/connect4',
  },
  snake: {
    title: 'Snake',
    img: '/images/snake.png',
    category: 'Arcade',
    players: 'Solo',
    modeTag: 'Retro',
    description: 'Navigate the snake to eat food, grow longer and avoid crashing into walls or your own tail.',
    playHref: '/snake',
  },
  tictactoe: {
    title: 'Tic-Tac-Toe',
    img: '/images/tictactoe.png',
    category: 'Classic',
    players: '2 Players',
    modeTag: 'Quick',
    description: 'A timeless 3x3 grid game. Line up three of your marks to achieve victory.',
    playHref: '/tictactoe',
  },
  snakeladder: {
    title: 'Snakes & Ladders',
    img: '/images/snakeladder.png',
    category: 'Board',
    players: '2–4 Players',
    modeTag: 'Classic',
    description: 'Climb ladders, avoid slippery snakes and race to tile 100 in this traditional board game.',
    playHref: '/snakeladder',
  },
}

export default function GameDetailView({ gameId }: { gameId: string }) {
  const router = useRouter()
  const game = GAME_DETAILS_CONFIG[gameId] || GAME_DETAILS_CONFIG['ludo']
  const { effectiveTheme } = useTheme()
  const isDark = effectiveTheme === 'dark'

  const [isFavorite, setIsFavorite] = useState(false)
  const [activeModal, setActiveModal] = useState<'how' | 'rules' | 'tips' | null>(null)

  return (
    <main style={{
      minHeight: '100dvh',
      maxWidth: 500,
      margin: '0 auto',
      background: isDark ? '#0b0b0e' : '#f8f9fa',
      color: isDark ? '#f9fafb' : '#111827',
      paddingBottom: 84,
      boxSizing: 'border-box',
      position: 'relative',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      transition: 'background-color 0.3s ease, color 0.3s ease',
    }}>

      {/* Hero Image Container */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: 250,
        background: isDark ? '#121217' : '#e5e7eb',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
        boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.08)',
      }}>
        <Image
          src={game.img}
          alt={game.title}
          fill
          priority
          style={{ objectFit: 'cover' }}
        />

        {/* Floating Top Controls */}
        <div style={{
          position: 'absolute',
          top: 'calc(12px + env(safe-area-inset-top, 0px))',
          left: 16,
          right: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10,
        }}>
          <button
            onClick={() => router.back()}
            className="btn-touch"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: isDark ? 'rgba(18, 18, 23, 0.8)' : 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#ffffff' : '#111827',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>

          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="btn-touch"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: isDark ? 'rgba(18, 18, 23, 0.8)' : 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isFavorite ? '#ff3b30' : (isDark ? '#ffffff' : '#111827'),
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorite ? '#ff3b30' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Details Body */}
      <div style={{ padding: '20px 16px 0 16px' }}>

        {/* Title */}
        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          margin: '0 0 12px 0',
          letterSpacing: -0.5,
          color: isDark ? '#ffffff' : '#111827',
        }}>
          {game.title}
        </h1>

        {/* Tags / Chips Row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <span style={{
            padding: '6px 14px',
            borderRadius: 9999,
            background: isDark ? '#3d2315' : '#ffedd5',
            color: isDark ? '#fdba74' : '#c2410c',
            fontSize: 12,
            fontWeight: 700,
          }}>
            {game.category}
          </span>
          <span style={{
            padding: '6px 14px',
            borderRadius: 9999,
            background: isDark ? '#1a2e3b' : '#e0f2fe',
            color: isDark ? '#7dd3fc' : '#0369a1',
            fontSize: 12,
            fontWeight: 700,
          }}>
            {game.players}
          </span>
          <span style={{
            padding: '6px 14px',
            borderRadius: 9999,
            background: isDark ? '#1f2029' : '#f3f4f6',
            color: isDark ? '#9ca3af' : '#4b5563',
            fontSize: 12,
            fontWeight: 700,
          }}>
            {game.modeTag}
          </span>
        </div>

        {/* Description */}
        <p style={{
          fontSize: 14,
          lineHeight: 1.5,
          color: isDark ? '#9ca3af' : '#4b5563',
          margin: '0 0 24px 0',
          fontWeight: 400,
        }}>
          {game.description}
        </p>

        {/* Play Buttons Row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {/* Play Solo */}
          <button
            onClick={() => router.push(`${game.playHref}?p1=Player%201&p2=Player%202`)}
            className="btn-touch"
            style={{
              flex: 1,
              padding: '16px',
              borderRadius: 18,
              background: isDark ? '#17171c' : '#ffffff',
              border: `1.5px solid ${isDark ? '#272730' : '#e5e7eb'}`,
              color: isDark ? '#ffffff' : '#111827',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.04)',
            }}
          >
            Play Solo
          </button>

          {/* Play Local Multiplayer */}
          <button
            onClick={() => router.push(`${game.playHref}?p1=Player%201&p2=Player%202&p3=Player%203&p4=Player%204`)}
            className="btn-touch"
            style={{
              flex: 1.5,
              padding: '16px',
              borderRadius: 18,
              background: isDark
                ? 'linear-gradient(135deg, #ff453a, #ff6347)'
                : 'linear-gradient(135deg, #ff3b30, #ff5e36)',
              border: 'none',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: isDark ? '0 6px 20px rgba(255, 69, 58, 0.4)' : '0 6px 20px rgba(255, 59, 48, 0.35)',
              letterSpacing: -0.2,
            }}
          >
            Play Local Multiplayer
          </button>
        </div>

        {/* Feature / Guide Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          marginBottom: 24,
        }}>
          {[
            {
              id: 'how',
              title: 'How to Play',
              sub: 'Easy to learn',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              ),
            },
            {
              id: 'rules',
              title: 'Rules',
              sub: 'Standard rules',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              ),
            },
            {
              id: 'tips',
              title: 'Tips',
              sub: 'Winning moves',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M8.5 14.5A6 6 0 1 1 15.5 14.5L14 18H10z" />
                  <line x1="10" y1="21" x2="14" y2="21" />
                </svg>
              ),
            },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveModal(item.id as 'how' | 'rules' | 'tips')}
              className="btn-touch"
              style={{
                background: isDark ? '#17171c' : '#ffffff',
                border: `1px solid ${isDark ? '#272730' : '#f0f0f4'}`,
                borderRadius: 18,
                padding: '14px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                boxShadow: isDark ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ marginBottom: 6 }}>{item.icon}</div>
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: isDark ? '#ffffff' : '#111827',
                marginBottom: 2,
              }}>
                {item.title}
              </div>
              <div style={{
                fontSize: 9,
                fontWeight: 500,
                color: isDark ? '#9ca3af' : '#6b7280',
              }}>
                {item.sub}
              </div>
            </button>
          ))}
        </div>

        {/* Modal Info Drawer */}
        {activeModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 10000,
          }} onClick={() => setActiveModal(null)}>
            <div style={{
              background: isDark ? '#17171c' : '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: '24px 20px',
              width: '100%',
              maxWidth: 500,
              boxSizing: 'border-box',
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                  {activeModal === 'how' ? 'How to Play' : activeModal === 'rules' ? 'Rules' : 'Tips'}
                </h3>
                <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: 18, color: '#9ca3af', cursor: 'pointer' }}>✕</button>
              </div>
              <p style={{ fontSize: 14, color: isDark ? '#d1d5db' : '#4b5563', lineHeight: 1.5, margin: 0 }}>
                {activeModal === 'how' && 'Roll the dice on your turn. Move tokens around the track clockwise. Reach the center goal with all 4 tokens to win!'}
                {activeModal === 'rules' && 'Rolling a 6 gives you an extra roll and lets you move a token out of your home base. Capturing an opponent token sends it back to their base.'}
                {activeModal === 'tips' && 'Keep tokens on safe star spots. Spread your tokens to maximize valid moves when dice rolls are low.'}
              </p>
            </div>
          </div>
        )}

        {/* About Section */}
        <div style={{
          background: isDark ? '#17171c' : '#ffffff',
          borderRadius: 20,
          border: `1px solid ${isDark ? '#272730' : '#f0f0f4'}`,
          padding: '16px',
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: 12,
            fontWeight: 600,
            color: isDark ? '#9ca3af' : '#6b7280',
            margin: 0,
          }}>
            Easy to learn, fun to play.
          </p>
        </div>

      </div>

      <BottomNav />
    </main>
  )
}
