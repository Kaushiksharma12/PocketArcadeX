'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import BottomNav from '@/components/BottomNav'

export default function Home() {
  const router = useRouter()
  const { effectiveTheme } = useTheme()
  const isDark = effectiveTheme === 'dark'
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/games?search=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      router.push('/games')
    }
  }

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

      {/* Top Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => router.push('/profile')}
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
              color: '#ff3b30',
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: -0.5,
              color: isDark ? '#ffffff' : '#111827',
            }}>
              POCKET
            </span>
            <span style={{
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: -0.5,
              color: isDark ? '#ff453a' : '#ff3b30',
            }}>
              ARCADEX
            </span>
          </div>
        </div>

        <button
          onClick={() => router.push('/games')}
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
            color: isDark ? '#9ca3af' : '#6b7280',
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

      {/* Hero Banner Card */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: 180,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 16,
        boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.08)',
      }}>
        <Image
          src="/images/hero.png"
          alt="Pocket Playground"
          fill
          priority
          style={{ objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0) 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '24px',
          boxSizing: 'border-box',
        }}>
          <h2 style={{
            color: '#ffffff',
            fontSize: 22,
            fontWeight: 800,
            margin: '0 0 4px 0',
            letterSpacing: -0.4,
            maxWidth: '65%',
            lineHeight: 1.2,
          }}>
            Your Pocket Playground
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: 13,
            margin: 0,
            fontWeight: 500,
          }}>
            Simple Games. Real Fun.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} style={{ marginBottom: 20 }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: isDark ? '#17171c' : '#ffffff',
          borderRadius: 9999,
          border: `1px solid ${isDark ? '#272730' : '#e5e7eb'}`,
          padding: '6px 12px 6px 16px',
          boxShadow: isDark ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.04)',
          transition: 'all 0.2s ease',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#6b7280' : '#9ca3af'} strokeWidth="2.2" strokeLinecap="round" style={{ marginRight: 10 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
          <button
            type="submit"
            className="btn-touch"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: isDark ? '#242430' : '#f3f4f6',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#9ca3af' : '#6b7280',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </form>

      {/* Quick Game Shortcuts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 24,
      }}>
        {[
          { name: 'Chess', href: '/games/chess/detail', img: '/images/chess.png' },
          { name: 'Ludo', href: '/games/ludo/detail', img: '/images/ludo.png' },
          { name: 'Snake', href: '/snake', img: '/images/snake.png' },
          { name: 'More', href: '/games', isMore: true }
        ].map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="btn-touch"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textDecoration: 'none',
            }}
          >
            <div style={{
              width: '100%',
              aspectRatio: '1',
              borderRadius: 20,
              background: item.isMore
                ? (isDark ? 'linear-gradient(135deg, #2e1065, #4c1d95)' : 'linear-gradient(135deg, #ede9fe, #ddd6fe)')
                : (isDark ? '#17171c' : '#ffffff'),
              border: `1px solid ${isDark ? '#272730' : '#f0f0f4'}`,
              boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 14px rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: 6,
            }}>
              {item.isMore ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#c084fc' : '#7c3aed'} strokeWidth="2.2">
                    <rect x="2" y="6" width="20" height="12" rx="4" />
                    <path d="M6 12h4m-2-2v4" />
                    <circle cx="15" cy="11" r="1" />
                    <circle cx="18" cy="13" r="1" />
                  </svg>
                  <span style={{ fontSize: 16, fontWeight: 'bold', color: isDark ? '#c084fc' : '#7c3aed' }}>+</span>
                </div>
              ) : (
                <div style={{ position: 'relative', width: '70%', height: '70%' }}>
                  {item.img && <Image src={item.img} alt={item.name} fill style={{ objectFit: 'contain' }} />}
                </div>
              )}
            </div>
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: isDark ? '#d1d5db' : '#374151',
            }}>
              {item.name}
            </span>
          </Link>
        ))}
      </div>

      {/* Categories Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
      }}>
        <h3 style={{
          fontSize: 18,
          fontWeight: 800,
          margin: 0,
          letterSpacing: -0.3,
          color: isDark ? '#ffffff' : '#111827',
        }}>
          Categories
        </h3>
        <Link
          href="/categories"
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: isDark ? '#ff453a' : '#ff3b30',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          See All ›
        </Link>
      </div>

      {/* Category Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
        marginBottom: 16,
      }}>
        {[
          {
            name: 'Strategy',
            count: '3 Games',
            img: '/images/cat_strategy.png',
            href: '/games?cat=Strategy',
            bgLight: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
            bgDark: 'linear-gradient(135deg, #2a1b12, #3d2315)',
            borderColor: isDark ? '#4a2c1b' : '#fed7aa',
            textColor: isDark ? '#fdba74' : '#c2410c',
          },
          {
            name: 'Board',
            count: '4 Games',
            img: '/images/cat_board.png',
            href: '/games?cat=Board',
            bgLight: 'linear-gradient(135deg, #fffbe6, #fef3c7)',
            bgDark: 'linear-gradient(135deg, #2b2512, #3e3416)',
            borderColor: isDark ? '#4c3e1b' : '#fde68a',
            textColor: isDark ? '#fde047' : '#b45309',
          },
          {
            name: 'Puzzle',
            count: '3 Games',
            img: '/images/cat_puzzle.png',
            href: '/games?cat=Puzzle',
            bgLight: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            bgDark: 'linear-gradient(135deg, #12291d, #1a3c2b)',
            borderColor: isDark ? '#234f39' : '#bbf7d0',
            textColor: isDark ? '#86efac' : '#15803d',
          },
          {
            name: 'Arcade',
            count: '2 Games',
            img: '/images/cat_arcade.png',
            href: '/games?cat=Arcade',
            bgLight: 'linear-gradient(135deg, #faf5ff, #f3e8ff)',
            bgDark: 'linear-gradient(135deg, #241434, #361c4f)',
            borderColor: isDark ? '#4a256d' : '#e9d5ff',
            textColor: isDark ? '#c084fc' : '#7e22ce',
          },
        ].map((cat) => (
          <Link
            key={cat.name}
            href={cat.href}
            className="btn-touch"
            style={{
              borderRadius: 20,
              background: isDark ? cat.bgDark : cat.bgLight,
              border: `1px solid ${cat.borderColor}`,
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: 110,
              textDecoration: 'none',
              boxShadow: isDark ? '0 4px 14px rgba(0,0,0,0.3)' : '0 4px 14px rgba(0,0,0,0.04)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#ffffff' : '#111827', margin: 0 }}>
                {cat.name}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: cat.textColor, marginTop: 2 }}>
                {cat.count}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 2 }}>
              <div style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? '#ffffff' : '#111827',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>

            {/* 3D Image Artwork positioned at bottom right */}
            <div style={{
              position: 'absolute',
              right: -4,
              bottom: -4,
              width: 65,
              height: 65,
              pointerEvents: 'none',
              zIndex: 1,
            }}>
              <Image src={cat.img} alt={cat.name} fill style={{ objectFit: 'contain' }} />
            </div>
          </Link>
        ))}
      </div>

      <BottomNav />
    </main>
  )
}