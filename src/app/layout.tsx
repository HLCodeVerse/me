import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'NIRMAAN — Personal Growth & Reconstruction OS',
  description: 'Simplify your day. Skill by skill. Day by day. NIRMAAN is your personal AI operating system for tasks, habits, health, and growth.',
  keywords: ['productivity', 'personal assistant', 'tasks', 'habits', 'health', 'journal', 'AI'],
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'NIRMAAN OS' },
  openGraph: {
    title: 'NIRMAAN — Personal Growth & Reconstruction OS',
    description: 'Your personal AI operating system for tasks, habits, health, and growth.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#7C3AED',
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
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-btn)',
                  fontFamily: 'inherit',
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
