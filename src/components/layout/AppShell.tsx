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
import { initNativeHardware, triggerHapticFeedback } from '@/lib/native-hardware'
import {
  LayoutDashboard, CheckSquare, ListTodo, BookOpen, Bot, Flame,
  StickyNote, Bell, Target, GraduationCap, BarChart2, Settings, X, ShieldCheck, Activity, Zap, Disc
} from 'lucide-react'
import BrowserPermissionBanner from '../common/BrowserPermissionBanner'

interface AppShellProps {
  children: ReactNode
  header?: ReactNode
  noPadding?: boolean
}

const ALL_MODULES = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',    color: '#FFD700' },
  { href: '/tasks',     icon: CheckSquare,     label: 'Tasks',        color: '#EF4444' },
  { href: '/todos',     icon: ListTodo,        label: 'Todos',        color: '#FACC15' },
  { href: '/habits',    icon: Flame,           label: 'Habits',       color: '#EF4444' },
  { href: '/health',    icon: Activity,        label: 'Health',       color: '#10B981' },
  { href: '/player',    icon: Disc,            label: 'Media Player', color: '#F59E0B' },
  { href: '/notes',     icon: StickyNote,      label: 'Notes',        color: '#FACC15' },
  { href: '/reminders', icon: Bell,            label: 'Reminders',    color: '#EF4444' },
  { href: '/journal',   icon: BookOpen,        label: 'Journal',      color: '#10B981' },
  { href: '/goals',     icon: Target,          label: 'Goals',        color: '#10B981' },
  { href: '/analytics', icon: BarChart2,       label: 'Analytics',    color: '#FACC15' },
  { href: '/learn',     icon: GraduationCap,   label: 'Learning hub', color: '#FFD700' },
  { href: '/ai',        icon: Bot,             label: 'AI chat OS',   color: '#FFD700' },
  { href: '/mcp',       icon: ShieldCheck,     label: 'MCP connect',  color: '#10B981' },
  { href: '/settings',  icon: Settings,        label: 'Settings',     color: '#FFFFFF' },
]

export default function AppShell({ children, header, noPadding }: AppShellProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [showDrawer, setShowDrawer] = useState(false)

  useEffect(() => {
    initNativeHardware()
    initPWAAutoUpdate()
    requestAllPermissions()
    if (user?.id) {
      autoPromptNotificationPermission(user.id)
    }

    // Add haptic feedback to all button/link taps on mobile native platform
    function handleGlobalTap(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.closest('button') || target.closest('a') || target.closest('.btn')) {
        triggerHapticFeedback('light')
      }
    }

    window.addEventListener('click', handleGlobalTap)
    const cleanupBack = initDoubleBackToExit(pathname)
    return () => {
      window.removeEventListener('click', handleGlobalTap)
      if (cleanupBack) cleanupBack()
    }
  }, [user, pathname])

  return (
    <div className="app-layout">
      {/* Interactive Browser Permission Prompt Banner */}
      <BrowserPermissionBanner />

      {/* Animated SplashScreen on First Mount */}
      <SplashScreen />
      {/* Desktop Sidebar (≥1024px) */}
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

      {/* Off-Canvas Navigation Drawer for Mobile (<1024px) */}
      {showDrawer && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(6px)',
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
            background: '#0A0B0D',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTop: '1px solid rgba(245, 158, 11, 0.35)',
            padding: '20px 20px 36px',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.9)',
          }} className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #FFD700, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                  <Zap size={18} fill="#000" color="#000" />
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF' }}>NIRMAAN OS Navigation</span>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="btn-ghost btn-icon"
                style={{ border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-btn)' }}
              >
                <X size={18} color="#FFFFFF" />
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
                      background: isActive ? 'rgba(245, 158, 11, 0.15)' : '#121318',
                      border: `1px solid ${isActive ? '#F59E0B' : 'rgba(245, 158, 11, 0.2)'}`,
                      borderRadius: 'var(--radius-btn)',
                      textDecoration: 'none',
                    }}
                  >
                    <Icon size={18} color={color} />
                    <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? '#FFD700' : '#FFFFFF' }}>
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

