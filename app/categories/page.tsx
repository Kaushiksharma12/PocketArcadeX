'use client'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import BottomNav from '@/components/BottomNav'

const CATEGORIES_DATA = [
  {
    id: 'strategy',
    title: 'Strategy',
    count: '3 Games',
    img: '/images/cat_strategy.png',
    href: '/games?cat=Strategy',
    gradientLight: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
    gradientDark: 'linear-gradient(135deg, #ea580c 0%, #d97706 100%)',
    boxShadow: '0 8px 24px rgba(249, 115, 22, 0.25)',
  },
  {
    id: 'board',
    title: 'Board Games',
    count: '4 Games',
    img: '/images/cat_board.png',
    href: '/games?cat=Board',
    gradientLight: 'linear-gradient(135deg, #fb7185 0%, #f97316 100%)',
    gradientDark: 'linear-gradient(135deg, #e11d48 0%, #ea580c 100%)',
    boxShadow: '0 8px 24px rgba(251, 113, 133, 0.25)',
  },
  {
    id: 'puzzle',
    title: 'Puzzle',
    count: '3 Games',
    img: '/images/cat_puzzle.png',
    href: '/games?cat=Puzzle',
    gradientLight: 'linear-gradient(135deg, #38bdf8 0%, #14b8a6 100%)',
    gradientDark: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
    boxShadow: '0 8px 24px rgba(56, 189, 248, 0.25)',
  },
  {
    id: 'arcade',
    title: 'Arcade',
    count: '2 Games',
    img: '/images/cat_arcade.png',
    href: '/games?cat=Arcade',
    gradientLight: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
    gradientDark: 'linear-gradient(135deg, #9333ea 0%, #4f46e5 100%)',
    boxShadow: '0 8px 24px rgba(168, 85, 247, 0.25)',
  },
]

export default function Categories() {
  const router = useRouter()
  const { effectiveTheme } = useTheme()
  const isDark = effectiveTheme === 'dark'

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

      {/* Header Bar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
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
            Categories
          </h1>
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

      {/* Vertical Stacked Category Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {CATEGORIES_DATA.map((cat) => (
          <Link
            key={cat.id}
            href={cat.href}
            className="btn-touch"
            style={{
              position: 'relative',
              width: '100%',
              height: 125,
              borderRadius: 24,
              background: isDark ? cat.gradientDark : cat.gradientLight,
              padding: '20px 24px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              textDecoration: 'none',
              overflow: 'hidden',
              boxShadow: cat.boxShadow,
            }}
          >
            {/* Title & Count */}
            <div style={{ position: 'relative', zIndex: 2 }}>
              <h2 style={{
                color: '#ffffff',
                fontSize: 22,
                fontWeight: 800,
                margin: '0 0 2px 0',
                letterSpacing: -0.4,
              }}>
                {cat.title}
              </h2>
              <p style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: 13,
                fontWeight: 600,
                margin: 0,
              }}>
                {cat.count}
              </p>
            </div>

            {/* Action Arrow Button */}
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>

            {/* 3D Image Artwork positioned at right side */}
            <div style={{
              position: 'absolute',
              right: 12,
              bottom: 4,
              top: 4,
              width: 140,
              pointerEvents: 'none',
              zIndex: 1,
            }}>
              <Image src={cat.img} alt={cat.title} fill style={{ objectFit: 'contain' }} />
            </div>
          </Link>
        ))}
      </div>

      <BottomNav />
    </main>
  )
}
