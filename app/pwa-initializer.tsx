'use client'
import { useEffect } from 'react'

export default function PWAInitializer() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const handleRegister = () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('[PWA] Service worker registered successfully:', registration.scope);
          })
          .catch((error) => {
            console.error('[PWA] Service worker registration failed:', error);
          });
      };

      // Register when the page load has completed
      if (document.readyState === 'complete') {
        handleRegister();
      } else {
        window.addEventListener('load', handleRegister);
        return () => window.removeEventListener('load', handleRegister);
      }
    }
  }, []);

  return null;
}
