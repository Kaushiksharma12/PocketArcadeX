import type { Viewport } from 'next'
import './globals.css'
import PWAInitializer from './pwa-initializer'

export const metadata = {
  title: 'PocketArcadeX',
  description: 'Retro game platform wrapped for mobile touch gameplay.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PocketArcadeX',
  },
  icons: {
    apple: '/icon-180.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a1a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0a0a1a' }}>
        <PWAInitializer />
        {children}
      </body>
    </html>
  )
}