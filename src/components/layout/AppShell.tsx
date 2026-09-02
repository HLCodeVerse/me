'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { initPWAAutoUpdate, autoPromptNotificationPermission } from '@/lib/push-notifications'
import AppHeader from './AppHeader'
import DesktopSidebar from './DesktopSidebar'
import BottomNav from './BottomNav'
import SplashScreen from '@/components/common/SplashScreen'
import { initDoubleBackToExit } from '@/lib/back-button-handler'
import { requestAllPermissions } from '@/lib/permissions-handler'
import { initNativeHardware, triggerHapticFeedback } from '@/lib/native-hardware'
import {
  LayoutDashboard, CheckSquare, Calendar, Target, Layers,
  Flame, BookOpen, GraduationCap, StickyNote, Bot, Bell,
  BarChart2, Settings, Code2, Zap, Clock, ListChecks, X,
} from 'lucide-react'
import BrowserPermissionBanner from '../common/BrowserPermissionBanner'

interface AppShellProps {
  children: ReactNode
  header?: ReactNode
  noPadding?: boolean
}

const ALL_MODULES = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home',          color: '#7C3AED' },
  { href: '/tasks',     icon: CheckSquare,     label: 'Tasks',         color: '#3B82F6' },
  { href: '/calendar',  icon: Calendar,        label: 'Calendar',      color: '#22D3EE' },
  { href: '/goals',     icon: Target,          label: 'Goals',         color: '#FF8A3D' },
  { href: '/life',      icon: Layers,          label: 'Life',          color: '#10B981' },
  { href: '/habits',    icon: Flame,           label: 'Habits',        color: '#FF4F81' },
  { href: '/journal',   icon: BookOpen,        label: 'Journal',       color: '#FBBF24' },
  { href: '/learn',     icon: GraduationCap,   label: 'Learning',      color: '#22D3EE' },
  { href: '/notes',     icon: StickyNote,      label: 'Notes',         color: '#8B5CF6' },
  { href: '/ai',        icon: Bot,             label: 'AI Assistant',  color: '#FF4F81' },
  { href: '/reminders', icon: Bell,            label: 'Reminders',     color: '#FBBF24' },
  { href: '/analytics', icon: BarChart2,       label: 'Insights',      color: '#3B82F6' },
  { href: '/dashboard?tab=plan', icon: ListChecks, label: 'Today Plan', color: '#7C3AED' },
  { href: '/dashboard?focus=1',  icon: Clock,      label: 'Focus Mode', color: '#22D3EE' },
  { href: '/dashboard?pomo=1',   icon: Zap,        label: 'Pomodoro',   color: '#FF8A3D' },
  { href: '/settings',  icon: Settings,        label: 'Settings',      color: '#8892B0' },
  { href: '/mcp',       icon: Code2,           label: 'Developer',     color: '#10B981' },
]

export default function AppShell({ children, header, noPadding }: AppShellProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [showDrawer, setShowDrawer] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    initNativeHardware()
    initPWAAutoUpdate()
    requestAllPermissions()
    if (user?.id) {
      autoPromptNotificationPermission(user.id)
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('helpo_sidebar_collapsed')
      if (stored === 'true') {
        setIsSidebarCollapsed(true)
        document.body.classList.add('sidebar-collapsed')
      }
    }

    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (!mobile) setShowDrawer(false)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    function handleGlobalTap(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.closest('button') || target.closest('a') || target.closest('.btn')) {
        triggerHapticFeedback('light')
      }
    }

    window.addEventListener('click', handleGlobalTap)
    const cleanupBack = initDoubleBackToExit(pathname)
    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('click', handleGlobalTap)
      if (cleanupBack) cleanupBack()
    }
  }, [user, pathname])

  function toggleSidebar() {
    setIsSidebarCollapsed(prev => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('helpo_sidebar_collapsed', next ? 'true' : 'false')
        if (next) {
          document.body.classList.add('sidebar-collapsed')
        } else {
          document.body.classList.remove('sidebar-collapsed')
        }
      }
      return next
    })
  }

  const desktopPadding = !isMobile ? (isSidebarCollapsed ? 74 : 260) : 0

  return (
    <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <BrowserPermissionBanner />
      <SplashScreen />

      {/* Desktop Sidebar (≥1024px) */}
      <DesktopSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Main Content with sidebar offset */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minHeight: '100vh',
        paddingLeft: desktopPadding,
        transition: 'padding-left 250ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {header ? header : null}

        <main style={{
          flex: 1,
          padding: noPadding ? 0 : isMobile ? '12px' : '24px',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          maxWidth: noPadding ? '100%' : 1440,
          width: '100%',
          margin: '0 auto',
          paddingBottom: isMobile ? 'calc(84px + env(safe-area-inset-bottom, 0px))' : '40px',
        }}>
          {children}
        </main>
      </div>

      {/* Mobile Off-Canvas Drawer */}
      {isMobile && showDrawer && (
        <>
          <div
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(5, 8, 22, 0.85)',
              backdropFilter: 'blur(8px)',
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
            background: 'linear-gradient(180deg, #0B1430 0%, #081126 100%)',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderTop: '1px solid rgba(124, 58, 237, 0.3)',
            padding: '20px 20px 36px',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 -20px 60px rgba(0, 0, 0, 0.8)',
          }} className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'linear-gradient(135deg, #7C3AED, #FF4F81)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#FFFFFF', fontWeight: 900, fontSize: 16,
                }}>H</div>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF' }}>Helpo Navigation</span>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  width: 36, height: 36,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} color="var(--text-muted)" />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ALL_MODULES.slice(0, 12).map(({ href, icon: Icon, label, color }) => {
                const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href.split('?')[0]))
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
                      background: isActive ? `rgba(124,58,237,0.15)` : 'var(--surface)',
                      border: `1px solid ${isActive ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`,
                      borderRadius: 12,
                      textDecoration: 'none',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <Icon size={18} color={color} />
                    <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? '#FFFFFF' : 'var(--text-secondary)' }}>
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
      <BottomNav onOpenDrawer={() => setShowDrawer(true)} />
    </div>
  )
}
