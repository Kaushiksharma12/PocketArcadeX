import type { Viewport } from 'next'
import './globals.css'
import PWAInitializer from './pwa-initializer'
import { ThemeProvider } from '@/components/ThemeProvider'

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
  themeColor: '#ff3b30',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{
        margin: 0,
        padding: 0,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        WebkitFontSmoothing: 'antialiased',
      }}>
        <ThemeProvider>
          <PWAInitializer />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}