'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import BottomNav from '@/components/BottomNav'

export default function Profile() {
  const router = useRouter()
  const {
    themeMode,
    setThemeMode,
    effectiveTheme,
    soundEnabled,
    setSoundEnabled,
    hapticsEnabled,
    setHapticsEnabled
  } = useTheme()

  const isDark = effectiveTheme === 'dark'
  const [showAboutModal, setShowAboutModal] = useState(false)

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
        justifyContent: 'flex-end',
        marginBottom: 16,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
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

      {/* User Profile Header Box */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        {/* Avatar with Glowing Ring */}
        <div style={{
          position: 'relative',
          width: 84,
          height: 84,
          borderRadius: '50%',
          padding: 3,
          background: 'linear-gradient(135deg, #a855f7, #3b82f6, #ff3b30)',
          boxShadow: isDark ? '0 0 20px rgba(168, 85, 247, 0.4)' : '0 4px 16px rgba(0,0,0,0.1)',
          marginBottom: 12,
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            overflow: 'hidden',
            background: '#121217',
          }}>
            <Image
              src="/images/avatar.png"
              alt="User Avatar"
              fill
              style={{ objectFit: 'cover' }}
            />
          </div>
        </div>

        {/* User Name */}
        <h2 style={{
          fontSize: 20,
          fontWeight: 800,
          margin: '0 0 4px 0',
          color: isDark ? '#ffffff' : '#111827',
          letterSpacing: -0.3,
        }}>
          Kaushik
        </h2>

        {/* Subtitle */}
        <p style={{
          fontSize: 12,
          fontWeight: 600,
          color: isDark ? '#9ca3af' : '#6b7280',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          Gamer for Fun <span style={{ fontSize: 13 }}>👑</span>
        </p>
      </div>

      {/* Settings Options Card Container */}
      <div style={{
        background: isDark ? '#17171c' : '#ffffff',
        borderRadius: 24,
        border: `1px solid ${isDark ? '#272730' : '#f0f0f4'}`,
        overflow: 'hidden',
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* 1. My Games */}
        <div
          onClick={() => router.push('/games')}
          className="btn-touch"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${isDark ? '#22222b' : '#f3f4f6'}`,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="2" y="6" width="20" height="12" rx="4" />
                <path d="M6 12h4m-2-2v4" />
                <circle cx="15" cy="11" r="1" fill="currentColor" />
                <circle cx="18" cy="13" r="1" fill="currentColor" />
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: isDark ? '#ffffff' : '#111827' }}>
              My Games
            </span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#6b7280' : '#9ca3af'} strokeWidth="2.5" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        {/* 2. Theme Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: `1px solid ${isDark ? '#22222b' : '#f3f4f6'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: isDark ? '#ffffff' : '#111827' }}>
              Theme
            </span>
          </div>

          {/* Segmented Control Pill Switcher */}
          <div style={{
            display: 'flex',
            background: isDark ? '#0d0d12' : '#f3f4f6',
            borderRadius: 12,
            padding: 3,
            gap: 2,
          }}>
            {(['dark', 'light', 'system'] as const).map((mode) => {
              const active = themeMode === mode
              return (
                <button
                  key={mode}
                  onClick={() => setThemeMode(mode)}
                  className="btn-touch"
                  style={{
                    padding: '5px 12px',
                    borderRadius: 9,
                    border: 'none',
                    background: active
                      ? (isDark ? '#242430' : '#ffffff')
                      : 'transparent',
                    color: active
                      ? (isDark ? '#ffffff' : '#111827')
                      : (isDark ? '#6b7280' : '#8e8e93'),
                    fontSize: 12,
                    fontWeight: active ? 700 : 600,
                    cursor: 'pointer',
                    boxShadow: active
                      ? (isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 6px rgba(0,0,0,0.08)')
                      : 'none',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {mode === 'dark' ? 'Dark' : mode === 'light' ? 'Light' : 'System'}
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. Sound Effects Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: `1px solid ${isDark ? '#22222b' : '#f3f4f6'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: isDark ? '#ffffff' : '#111827' }}>
              Sound Effects
            </span>
          </div>

          <div
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="btn-touch"
            style={{
              width: 46,
              height: 26,
              borderRadius: 9999,
              background: soundEnabled ? '#34c759' : (isDark ? '#2b2b36' : '#e5e7eb'),
              padding: 2,
              boxSizing: 'border-box',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: '#ffffff',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              transform: soundEnabled ? 'translateX(20px)' : 'translateX(0px)',
              transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }} />
          </div>
        </div>

        {/* 4. Haptics Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: `1px solid ${isDark ? '#22222b' : '#f3f4f6'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="5" y="2" width="14" height="20" rx="3" />
                <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: isDark ? '#ffffff' : '#111827' }}>
              Haptics
            </span>
          </div>

          <div
            onClick={() => setHapticsEnabled(!hapticsEnabled)}
            className="btn-touch"
            style={{
              width: 46,
              height: 26,
              borderRadius: 9999,
              background: hapticsEnabled ? '#007aff' : (isDark ? '#2b2b36' : '#e5e7eb'),
              padding: 2,
              boxSizing: 'border-box',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: '#ffffff',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              transform: hapticsEnabled ? 'translateX(20px)' : 'translateX(0px)',
              transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }} />
          </div>
        </div>

        {/* 5. Language */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${isDark ? '#22222b' : '#f3f4f6'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: isDark ? '#ffffff' : '#111827' }}>
              Language
            </span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#9ca3af' : '#6b7280' }}>
            English ›
          </span>
        </div>

        {/* 6. About PocketArcadeX */}
        <div
          onClick={() => setShowAboutModal(true)}
          className="btn-touch"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${isDark ? '#22222b' : '#f3f4f6'}`,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: isDark ? '#ffffff' : '#111827' }}>
              About PocketArcadeX
            </span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#6b7280' : '#9ca3af'} strokeWidth="2.5" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        {/* 7. App Version */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: isDark ? '#ffffff' : '#111827' }}>
              App Version
            </span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#6b7280' : '#9ca3af' }}>
            v1.0.0
          </span>
        </div>

      </div>

      {/* About Modal */}
      {showAboutModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20
        }} onClick={() => setShowAboutModal(false)}>
          <div style={{
            background: isDark ? '#17171c' : '#ffffff', borderRadius: 24, padding: 24,
            maxWidth: 360, width: '100%', textAlign: 'center', boxSizing: 'border-box'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎮</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px 0' }}>PocketArcadeX</h3>
            <p style={{ fontSize: 13, color: isDark ? '#9ca3af' : '#6b7280', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              PocketArcadeX is a local arcade gaming platform designed for offline touch gameplay on mobile and PWA.
            </p>
            <button
              onClick={() => setShowAboutModal(false)}
              className="btn-touch"
              style={{
                width: '100%', padding: '14px', borderRadius: 14,
                background: isDark ? '#ff453a' : '#ff3b30', border: 'none',
                color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}
