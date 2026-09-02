import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Helpo — Your Personal AI Operating System',
  description: 'Helpo is your premium personal OS for tasks, habits, goals, learning, journaling, and AI-powered insights. Live intentionally.',
  keywords: ['productivity', 'personal assistant', 'tasks', 'habits', 'goals', 'journal', 'AI', 'life score'],
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Helpo' },
  openGraph: {
    title: 'Helpo — Your Personal AI Operating System',
    description: 'Premium personal OS for tasks, habits, goals, learning, journaling, and AI insights.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#050816',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(regs) {
              for (var r of regs) { r.unregister(); }
            });
          }
          if ('caches' in window) {
            caches.keys().then(function(keys) {
              keys.forEach(function(k) { caches.delete(k); });
            });
          }
        `}} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#101A3A',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  color: '#FFFFFF',
                  borderRadius: '12px',
                  fontFamily: 'inherit',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
