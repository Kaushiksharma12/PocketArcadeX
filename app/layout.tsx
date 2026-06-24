import './globals.css'

export const metadata = {
  title: 'Pocket Arcade',
  description: 'Retro game platform wrapped for mobile touch gameplay.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0a0a1a' }}>
        {children}
      </body>
    </html>
  )
}