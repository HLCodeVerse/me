'use client'

import { ReactNode } from 'react'
import BottomNav from './BottomNav'
import DesktopSidebar from './DesktopSidebar'

interface AppShellProps {
  children: ReactNode
  header?: ReactNode
  noPadding?: boolean
}

export default function AppShell({ children, header, noPadding }: AppShellProps) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <DesktopSidebar />
      <div className="app-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
        {header && (
          <header
            className="app-header"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 40,
              background: 'rgba(10, 11, 13, 0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderBottom: '1px solid var(--border)',
              padding: '0 16px',
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              width: '100%',
            }}
          >
            {header}
          </header>
        )}
        <main
          className="pb-nav"
          style={{
            flex: 1,
            padding: noPadding ? 0 : '0 16px',
            width: '100%',
          }}
        >
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
