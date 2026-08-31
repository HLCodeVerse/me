'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'
import DesktopSidebar from './DesktopSidebar'
import {
  Menu, X, LayoutDashboard, CheckSquare, ListTodo, BookOpen, Bot, Flame,
  StickyNote, Bell, Target, GraduationCap, BarChart2, Settings, ShieldCheck
} from 'lucide-react'

interface AppShellProps {
  children: ReactNode
  header?: ReactNode
  noPadding?: boolean
}

const ALL_MODULES = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',   color: '#10B981' },
  { href: '/tasks',     icon: CheckSquare,     label: 'Tasks',       color: '#F59E0B' },
  { href: '/todos',     icon: ListTodo,        label: 'Todos',       color: '#818CF8' },
  { href: '/habits',    icon: Flame,           label: 'Habits',      color: '#F43F5E' },
  { href: '/notes',     icon: StickyNote,      label: 'Notes',       color: '#06B6D4' },
  { href: '/reminders', icon: Bell,            label: 'Reminders',   color: '#F59E0B' },
  { href: '/journal',   icon: BookOpen,        label: 'Journal',     color: '#A78BFA' },
  { href: '/goals',     icon: Target,          label: 'Goals',       color: '#10B981' },
  { href: '/analytics', icon: BarChart2,       label: 'Analytics',   color: '#10B981' },
  { href: '/learn',     icon: GraduationCap,   label: 'Learn Hub',   color: '#60A5FA' },
  { href: '/ai',        icon: Bot,             label: 'AI Chat OS',  color: '#818CF8' },
  { href: '/mcp',       icon: ShieldCheck,     label: 'MCP Connect', color: '#10B981' },
  { href: '/settings',  icon: Settings,        label: 'Settings',    color: '#8892A4' },
]

export default function AppShell({ children, header, noPadding }: AppShellProps) {
  const pathname = usePathname()
  const [showDrawer, setShowDrawer] = useState(false)

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
              gap: 12,
            }}
          >
            {/* Mobile Top Header Menu Drawer Trigger */}
            <button
              onClick={() => setShowDrawer(true)}
              className="btn-icon"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text)',
                marginRight: 4,
              }}
              title="Open Navigation Menu"
            >
              <Menu size={18} />
            </button>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
              {header}
            </div>
          </header>
        )}
        <main
          className="pb-nav"
          style={{
            flex: 1,
            padding: noPadding ? '0 0 calc(90px + env(safe-area-inset-bottom, 0px))' : '0 16px calc(90px + env(safe-area-inset-bottom, 0px))',
            width: '100%',
          }}
        >
          {children}
        </main>
      </div>

      {/* Slide-Up Navigation Drawer accessible from anywhere */}
      {showDrawer && (
        <>
          <div className="overlay" onClick={() => setShowDrawer(false)} style={{ zIndex: 120 }} />
          <div className="animate-slide-up" style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 130,
            background: 'rgba(14,17,23,0.96)', backdropFilter: 'blur(24px)',
            borderTop: '1px solid var(--border-2)',
            borderRadius: '24px 24px 0 0', padding: '20px 18px 36px',
            maxHeight: '82vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>NIRMAAN Navigation</span>
                <span className="badge badge-emerald" style={{ fontSize: 10 }}>12 Apps</span>
              </div>
              <button onClick={() => setShowDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {ALL_MODULES.map(({ href, icon: Icon, label, color }) => {
                const isActive = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setShowDrawer(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                      background: isActive ? `${color}20` : 'var(--surface-2)',
                      border: `1px solid ${isActive ? color : 'var(--border)'}`,
                      borderRadius: 'var(--radius)', textDecoration: 'none',
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={16} color={color} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? color : 'var(--text)' }}>{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}
