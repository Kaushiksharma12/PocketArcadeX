'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from './ThemeProvider'

export default function BottomNav() {
  const pathname = usePathname()
  const { effectiveTheme } = useTheme()
  const isDark = effectiveTheme === 'dark'

  const navItems = [
    {
      name: 'Home',
      href: '/',
      activeExact: true,
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? '2.2' : '2'} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    },
    {
      name: 'Games',
      href: '/games',
      activeExact: false,
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? '2.2' : '2'} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="4" />
          <path d="M6 12h4m-2-2v4" />
          <circle cx="15" cy="11" r="1" fill={active ? '#fff' : 'currentColor'} />
          <circle cx="18" cy="13" r="1" fill={active ? '#fff' : 'currentColor'} />
        </svg>
      )
    },
    {
      name: 'Categories',
      href: '/categories',
      activeExact: false,
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? '2.2' : '2'} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
        </svg>
      )
    },
    {
      name: 'Profile',
      href: '/profile',
      activeExact: false,
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? '2.2' : '2'} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    }
  ]

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 'calc(62px + env(safe-area-inset-bottom, 0px))',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      background: isDark ? '#121217' : '#ffffff',
      borderTop: `1px solid ${isDark ? '#22222c' : '#f0f0f3'}`,
      boxShadow: isDark ? '0 -4px 20px rgba(0,0,0,0.5)' : '0 -4px 20px rgba(0,0,0,0.05)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 9999,
      maxWidth: 500,
      margin: '0 auto',
      transition: 'background-color 0.3s ease, border-color 0.3s ease',
      WebkitTapHighlightColor: 'transparent',
    }}>
      {navItems.map((item) => {
        const isActive = item.activeExact
          ? pathname === item.href
          : pathname.startsWith(item.href)

        const activeColor = isDark ? '#ff453a' : '#ff3b30'
        const inactiveColor = isDark ? '#8e8e93' : '#8e8e93'

        return (
          <Link
            key={item.name}
            href={item.href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: isActive ? activeColor : inactiveColor,
              textDecoration: 'none',
              transition: 'color 0.2s ease, transform 0.1s ease',
              cursor: 'pointer',
            }}
          >
            <div style={{ marginBottom: 2 }}>
              {item.icon(isActive)}
            </div>
            <span style={{
              fontSize: 10,
              fontWeight: isActive ? '700' : '500',
              letterSpacing: 0.2,
            }}>
              {item.name}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
