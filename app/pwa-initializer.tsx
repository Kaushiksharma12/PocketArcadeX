'use client'
import { useEffect, useState } from 'react'

export default function PWAInitializer() {
  const [showBanner, setShowBanner] = useState(false)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. PWA Standalone and iOS Safari Install Prompt detection
    const isIOS = () => {
      const ua = window.navigator.userAgent.toLowerCase()
      return /iphone|ipad|ipod/.test(ua)
    }

    const isSafari = () => {
      const ua = window.navigator.userAgent.toLowerCase()
      return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium') && !ua.includes('android')
    }

    const isStandalone = () => {
      return (
        (window.navigator as unknown as { standalone: boolean }).standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches
      )
    }

    const checkInstallPrompt = () => {
      const dismissed = localStorage.getItem('pocket_arcade_x_ios_prompt_dismissed') === 'true'
      if (isIOS() && isSafari() && !isStandalone() && !dismissed) {
        setShowInstallPrompt(true)
      }
    }

    checkInstallPrompt()

    // 2. Service Worker Registration and Update handling
    if (!('serviceWorker' in navigator)) return

    let registration: ServiceWorkerRegistration | null = null
    let updateInterval: ReturnType<typeof setInterval> | null = null

    const handleRegister = async () => {
      try {
        registration = await navigator.serviceWorker.register('/sw.js')
        console.log('[PWA] Service worker registered successfully:', registration.scope)

        // Check if there is already a waiting service worker
        if (registration.waiting) {
          setWaitingWorker(registration.waiting)
          setShowBanner(true)
        }

        // Listen for new service worker installs
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration?.installing
          if (!installingWorker) return

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // A newer service worker is waiting!
                setWaitingWorker(installingWorker)
                setShowBanner(true)
              }
            }
          })
        })
      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error)
      }
    }

    // Register when page loads
    if (document.readyState === 'complete') {
      handleRegister()
    } else {
      window.addEventListener('load', handleRegister)
    }

    // Periodically poll for updates (every 5 minutes)
    updateInterval = setInterval(() => {
      if (registration) {
        registration.update().catch(err => {
          console.warn('[PWA] Service worker update check failed:', err)
        })
      }
    }, 5 * 60 * 1000)

    // Listen for controller changes (reload the page when new service worker takes over)
    const handleControllerChange = () => {
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    return () => {
      window.removeEventListener('load', handleRegister)
      if (updateInterval) clearInterval(updateInterval)
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  const handleDismissPrompt = () => {
    setShowInstallPrompt(false)
    localStorage.setItem('pocket_arcade_x_ios_prompt_dismissed', 'true')
  }

  // 1. Show update banner (Green neon) if an update is waiting
  if (showBanner) {
    return (
      <div style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        background: 'rgba(10, 10, 30, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '2px solid #00ff88',
        boxShadow: '0 0 20px rgba(0, 255, 136, 0.4), inset 0 0 10px rgba(0, 255, 136, 0.1)',
        borderRadius: 16,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        fontFamily: "'Courier New', monospace",
        maxWidth: 'calc(100vw - 32px)',
        width: 'max-content',
        boxSizing: 'border-box'
      }}>
        <span style={{
          color: '#fff',
          fontSize: 12,
          fontWeight: 'bold',
          letterSpacing: 1,
          whiteSpace: 'nowrap'
        }}>
          🚀 NEW VERSION AVAILABLE
        </span>
        <button
          onClick={handleUpdate}
          style={{
            background: '#00ff88',
            border: 'none',
            borderRadius: 8,
            color: '#0a0a1a',
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 1.5,
            padding: '8px 16px',
            cursor: 'pointer',
            boxShadow: '0 0 10px #00ff8866',
            outline: 'none',
            transition: 'all 0.2s',
            fontFamily: "'Courier New', monospace",
            textTransform: 'uppercase',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          Update Now
        </button>
      </div>
    )
  }

  // 2. Show iOS safari installation prompt banner (Purple neon) if not standalone
  if (showInstallPrompt) {
    return (
      <div style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        background: 'rgba(10, 10, 30, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '2px solid #ff00ff',
        boxShadow: '0 0 20px rgba(255, 0, 255, 0.4), inset 0 0 10px rgba(255, 0, 255, 0.1)',
        borderRadius: 16,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        fontFamily: "'Courier New', monospace",
        maxWidth: 'calc(100vw - 32px)',
        width: 'max-content',
        boxSizing: 'border-box'
      }}>
        <span style={{
          color: '#fff',
          fontSize: 11,
          fontWeight: 'bold',
          letterSpacing: 0.5,
          lineHeight: '1.4'
        }}>
          📱 To install on iPhone: Tap Share → Add to Home Screen.
        </span>
        <button
          onClick={handleDismissPrompt}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ff00ff',
            fontSize: 18,
            fontWeight: 'bold',
            cursor: 'pointer',
            padding: 0,
            width: 40,
            height: 40,
            minWidth: 40,
            minHeight: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            outline: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          ✕
        </button>
      </div>
    )
  }

  return null
}
