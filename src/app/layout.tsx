import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'NIRMAAN — Personal Reconstruction OS',
  description: 'Rebuild yourself. Skill by skill. Day by day. NIRMAAN is your personal OS for reconstructing self, skill, and career.',
  keywords: ['productivity', 'personal growth', 'tasks', 'journal', 'learning', 'AI'],
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'NIRMAAN' },
  openGraph: {
    title: 'NIRMAAN — Personal Reconstruction OS',
    description: 'Your personal OS for reconstructing self, skill, and career.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#0A0B0D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AuthProvider>
          {children}
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                borderRadius: 'var(--radius)',
                fontFamily: 'Inter, sans-serif',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
