'use client'
import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import BottomNav from '@/components/BottomNav'

const GAMES_DATA = [
  {
    id: 'chess',
    title: 'Chess',
    category: 'Strategy',
    players: '2 Players',
    img: '/images/chess.png',
    detailHref: '/games/chess/detail',
    playHref: '/chess',
  },
  {
    id: 'connect4',
    title: 'Connect 4',
    category: 'Strategy',
    players: '2–4 Players',
    img: '/images/connect4.png',
    detailHref: '/games/connect4/detail',
    playHref: '/connect4',
  },
  {
    id: 'ludo',
    title: 'Ludo',
    category: 'Board',
    players: '2–4 Players',
    img: '/images/ludo.png',
    detailHref: '/games/ludo/detail',
    playHref: '/ludo',
  },
  {
    id: 'snake',
    title: 'Snake',
    category: 'Arcade',
    players: 'Solo',
    img: '/images/snake.png',
    detailHref: '/snake',
    playHref: '/snake',
  },
  {
    id: 'tictactoe',
    title: 'Tic-Tac-Toe',
    category: 'Classic',
    players: '2 Players',
    img: '/images/tictactoe.png',
    detailHref: '/games/tictactoe/detail',
    playHref: '/tictactoe',
  },
  {
    id: 'snakeladder',
    title: 'Snakes & Ladders',
    category: 'Board',
    players: '2–4 Players',
    img: '/images/snakeladder.png',
    detailHref: '/games/snakeladder/detail',
    playHref: '/snakeladder',
  },
]

function GamesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { effectiveTheme } = useTheme()
  const isDark = effectiveTheme === 'dark'

  const initialCat = searchParams.get('cat') || 'All'
  const initialQuery = searchParams.get('search') || ''

  const [activeFilter, setActiveFilter] = useState(initialCat)
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [isSearching, setIsSearching] = useState(Boolean(initialQuery))

  const categories = ['All', 'Strategy', 'Board', 'Puzzle', 'Arcade']

  const filteredGames = GAMES_DATA.filter((game) => {
    const matchesFilter = activeFilter === 'All' || game.category === activeFilter
    const matchesSearch = !searchQuery || game.title.toLowerCase().includes(searchQuery.toLowerCase()) || game.category.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

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

      {/* Top Bar Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => router.push('/')}
            className="btn-touch"
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: isDark ? '#1a1a24' : '#ffffff',
              border: `1px solid ${isDark ? '#272736' : '#e5e7eb'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#f9fafb' : '#111827',
              cursor: 'pointer',
              boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="16" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <h1 style={{
            fontSize: 22,
            fontWeight: 800,
            margin: 0,
            letterSpacing: -0.4,
            color: isDark ? '#ffffff' : '#111827',
          }}>
            Games
          </h1>
        </div>

        <button
          onClick={() => setIsSearching(!isSearching)}
          className="btn-touch"
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: isSearching ? (isDark ? '#ff453a22' : '#ff3b3015') : (isDark ? '#1a1a24' : '#ffffff'),
            border: `1px solid ${isSearching ? (isDark ? '#ff453a' : '#ff3b30') : (isDark ? '#272736' : '#e5e7eb')}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isSearching ? (isDark ? '#ff453a' : '#ff3b30') : (isDark ? '#9ca3af' : '#6b7280'),
            cursor: 'pointer',
            boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </header>

      {/* Expandable Search Input */}
      {isSearching && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: isDark ? '#17171c' : '#ffffff',
            borderRadius: 16,
            border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`,
            padding: '8px 14px',
          }}>
            <input
              type="text"
              placeholder="Search by game name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: isDark ? '#f9fafb' : '#111827',
                fontSize: 14,
                fontFamily: 'inherit',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isDark ? '#9ca3af' : '#6b7280',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Category Filter Chips Horizontal Bar */}
      <div className="no-scrollbar" style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        marginBottom: 20,
        paddingBottom: 4,
      }}>
        {categories.map((cat) => {
          const isActive = activeFilter === cat
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className="btn-touch"
              style={{
                padding: '8px 18px',
                borderRadius: 9999,
                background: isActive
                  ? (isDark ? 'linear-gradient(135deg, #ff453a, #ff6347)' : 'linear-gradient(135deg, #ff3b30, #ff5e36)')
                  : (isDark ? '#17171c' : '#ffffff'),
                color: isActive ? '#ffffff' : (isDark ? '#9ca3af' : '#4b5563'),
                border: isActive
                  ? 'none'
                  : `1px solid ${isDark ? '#272730' : '#e5e7eb'}`,
                fontSize: 13,
                fontWeight: isActive ? 700 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: isActive
                  ? (isDark ? '0 4px 12px rgba(255, 69, 58, 0.35)' : '0 4px 12px rgba(255, 59, 48, 0.3)')
                  : 'none',
              }}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {/* 2-Column Game Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 14,
      }}>
        {filteredGames.map((game) => (
          <Link
            key={game.id}
            href={game.detailHref}
            className="btn-touch"
            style={{
              background: isDark ? '#17171c' : '#ffffff',
              borderRadius: 22,
              border: `1px solid ${isDark ? '#272730' : '#f0f0f4'}`,
              overflow: 'hidden',
              textDecoration: 'none',
              boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s ease',
            }}
          >
            {/* 3D Artwork Thumbnail Container */}
            <div style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1.25',
              background: isDark ? '#121217' : '#f4f5f8',
              overflow: 'hidden',
            }}>
              <Image
                src={game.img}
                alt={game.title}
                fill
                style={{ objectFit: 'cover' }}
              />
            </div>

            {/* Content & Action Arrow */}
            <div style={{
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <h3 style={{
                  fontSize: 15,
                  fontWeight: 800,
                  margin: '0 0 2px 0',
                  color: isDark ? '#ffffff' : '#111827',
                }}>
                  {game.title}
                </h3>
                <p style={{
                  fontSize: 11,
                  fontWeight: 600,
                  margin: 0,
                  color: isDark ? '#9ca3af' : '#6b7280',
                }}>
                  {game.category} · {game.players}
                </p>
              </div>

              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: isDark ? '#242430' : '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? '#ffffff' : '#111827',
                flexShrink: 0,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <BottomNav />
    </main>
  )
}

export default function Games() {
  return (
    <Suspense fallback={<div style={{ color: '#888', textAlign: 'center', marginTop: 100 }}>Loading Games...</div>}>
      <GamesContent />
    </Suspense>
  )
}