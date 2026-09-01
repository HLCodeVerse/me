'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { initPWAAutoUpdate, autoPromptNotificationPermission } from '@/lib/push-notifications'
import AppHeader from './AppHeader'
import DesktopSidebar from './DesktopSidebar'
import BottomNav from './BottomNav'
import GlobalMediaPlayer from '@/components/media/GlobalMediaPlayer'
import SplashScreen from '@/components/common/SplashScreen'
import { initDoubleBackToExit } from '@/lib/back-button-handler'
import { requestAllPermissions } from '@/lib/permissions-handler'
import {
  LayoutDashboard, CheckSquare, ListTodo, BookOpen, Bot, Flame,
  StickyNote, Bell, Target, GraduationCap, BarChart2, Settings, X, ShieldCheck, Activity, Zap, Disc
} from 'lucide-react'

interface AppShellProps {
  children: ReactNode
  header?: ReactNode
  noPadding?: boolean
}

const ALL_MODULES = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',   color: '#7C3AED' },
  { href: '/tasks',     icon: CheckSquare,     label: 'Tasks',       color: '#F59E0B' },
  { href: '/todos',     icon: ListTodo,        label: 'Todos',       color: '#3B82F6' },
  { href: '/habits',    icon: Flame,           label: 'Habits',      color: '#EF4444' },
  { href: '/health',    icon: Activity,        label: 'Health',      color: '#10B981' },
  { href: '/player',    icon: Disc,            label: 'Media Player',color: '#7C3AED' },
  { href: '/notes',     icon: StickyNote,      label: 'Notes',       color: '#06B6D4' },
  { href: '/reminders', icon: Bell,            label: 'Reminders',   color: '#F59E0B' },
  { href: '/journal',   icon: BookOpen,        label: 'Journal',     color: '#8B5CF6' },
  { href: '/goals',     icon: Target,          label: 'Goals',       color: '#10B981' },
  { href: '/analytics', icon: BarChart2,       label: 'Analytics',   color: '#3B82F6' },
  { href: '/learn',     icon: GraduationCap,   label: 'Learning hub',color: '#8B5CF6' },
  { href: '/ai',        icon: Bot,             label: 'AI chat OS',  color: '#7C3AED' },
  { href: '/mcp',       icon: ShieldCheck,     label: 'MCP connect', color: '#10B981' },
  { href: '/settings',  icon: Settings,        label: 'Settings',    color: '#6B7280' },
]

export default function AppShell({ children, header, noPadding }: AppShellProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [showDrawer, setShowDrawer] = useState(false)

  useEffect(() => {
    initPWAAutoUpdate()
    requestAllPermissions()
    if (user?.id) {
      autoPromptNotificationPermission(user.id)
    }
    const cleanupBack = initDoubleBackToExit(pathname)
    return () => {
      if (cleanupBack) cleanupBack()
    }
  }, [user, pathname])

  return (
    <div className="app-layout">
      {/* Animated SplashScreen on First Mount */}
      <SplashScreen />
      {/* Desktop Sidebar (≥768px) */}
      <DesktopSidebar />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh' }}>
        {header ? header : <AppHeader onOpenMobileDrawer={() => setShowDrawer(true)} />}
        
        <main style={{
          flex: 1,
          padding: noPadding ? 0 : '24px',
          maxWidth: noPadding ? '100%' : 1440,
          width: '100%',
          margin: '0 auto',
          paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))',
        }}>
          {children}
        </main>
      </div>

      {/* Persistent Global Floating Media Player */}
      <GlobalMediaPlayer />

      {/* Off-Canvas Navigation Drawer for Mobile (<768px) */}
      {showDrawer && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(17, 24, 39, 0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
            }}
            onClick={() => setShowDrawer(false)}
          />
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 110,
            background: 'var(--surface)',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTop: '1px solid var(--border)',
            padding: '20px 20px 36px',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-float)',
          }} className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
                  <Zap size={16} fill="#FFF" />
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>NIRMAAN Navigation</span>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="btn-ghost btn-icon"
                style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)' }}
              >
                <X size={18} color="var(--text-secondary)" />
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      background: isActive ? 'rgba(124, 58, 237, 0.08)' : 'var(--surface-2)',
                      border: `1px solid ${isActive ? '#7C3AED' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-btn)',
                      textDecoration: 'none',
                    }}
                  >
                    <Icon size={18} color={color} />
                    <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? '#7C3AED' : 'var(--text-primary)' }}>
                      {label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Bottom Nav for Mobile */}
      <BottomNav />
    </div>
  )
}
