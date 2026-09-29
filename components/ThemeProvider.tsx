'use client'
import React, { createContext, useContext, useEffect, useState } from 'react'

type ThemeMode = 'dark' | 'light' | 'system'

interface ThemeContextType {
  themeMode: ThemeMode
  effectiveTheme: 'dark' | 'light'
  setThemeMode: (mode: ThemeMode) => void
  soundEnabled: boolean
  setSoundEnabled: (val: boolean) => void
  hapticsEnabled: boolean
  setHapticsEnabled: (val: boolean) => void
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  effectiveTheme: 'light',
  setThemeMode: () => {},
  soundEnabled: true,
  setSoundEnabled: () => {},
  hapticsEnabled: true,
  setHapticsEnabled: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system')
  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>('light')
  const [soundEnabled, setSoundEnabledState] = useState(true)
  const [hapticsEnabled, setHapticsEnabledState] = useState(true)

  // Initialize preferences on client mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('pa_theme') as ThemeMode | null
    if (savedTheme && ['dark', 'light', 'system'].includes(savedTheme)) {
      setThemeModeState(savedTheme)
    }

    const savedSound = localStorage.getItem('pa_sound')
    if (savedSound !== null) {
      setSoundEnabledState(savedSound === 'true')
    }

    const savedHaptics = localStorage.getItem('pa_haptics')
    if (savedHaptics !== null) {
      setHapticsEnabledState(savedHaptics === 'true')
    }
    // eslint-disable-next-deps
  }, [])

  // Calculate effective theme & update DOM
  useEffect(() => {
    function updateTheme() {
      let resolved: 'dark' | 'light' = 'light'
      if (themeMode === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      } else {
        resolved = themeMode
      }
      setEffectiveTheme(resolved)

      // Apply root attributes & body class for CSS selectors
      const root = document.documentElement
      if (resolved === 'dark') {
        root.classList.add('dark')
        root.setAttribute('data-theme', 'dark')
        document.body.style.backgroundColor = '#0b0b0e'
        document.body.style.color = '#f9fafb'
      } else {
        root.classList.remove('dark')
        root.setAttribute('data-theme', 'light')
        document.body.style.backgroundColor = '#f8f9fa'
        document.body.style.color = '#111827'
      }
    }

    updateTheme()

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = (e: MediaQueryListEvent) => {
        setEffectiveTheme(e.matches ? 'dark' : 'light')
        if (e.matches) {
          document.documentElement.classList.add('dark')
          document.documentElement.setAttribute('data-theme', 'dark')
          document.body.style.backgroundColor = '#0b0b0e'
          document.body.style.color = '#f9fafb'
        } else {
          document.documentElement.classList.remove('dark')
          document.documentElement.setAttribute('data-theme', 'light')
          document.body.style.backgroundColor = '#f8f9fa'
          document.body.style.color = '#111827'
        }
      }
      mediaQuery.addEventListener('change', listener)
      return () => mediaQuery.removeEventListener('change', listener)
    }
  }, [themeMode])

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode)
    localStorage.setItem('pa_theme', mode)
  }

  const setSoundEnabled = (val: boolean) => {
    setSoundEnabledState(val)
    localStorage.setItem('pa_sound', String(val))
  }

  const setHapticsEnabled = (val: boolean) => {
    setHapticsEnabledState(val)
    localStorage.setItem('pa_haptics', String(val))
  }

  return (
    <ThemeContext.Provider value={{
      themeMode,
      effectiveTheme,
      setThemeMode,
      soundEnabled,
      setSoundEnabled,
      hapticsEnabled,
      setHapticsEnabled
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
