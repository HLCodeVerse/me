'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, CheckSquare, Calendar, Target, Layers,
  Flame, BookOpen, GraduationCap, StickyNote, Bot, Bell,
  BarChart2, User, Settings, Code2,
  ChevronRight, PanelLeftClose, PanelLeftOpen,
  Zap, Clock, ListChecks,
} from 'lucide-react'

const NAV_MAIN = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home',         color: '#7C3AED' },
  { href: '/tasks',     icon: CheckSquare,     label: 'Tasks',        color: '#3B82F6' },
  { href: '/calendar',  icon: Calendar,        label: 'Calendar',     color: '#22D3EE' },
  { href: '/goals',     icon: Target,          label: 'Goals',        color: '#FF8A3D' },
  { href: '/life',      icon: Layers,          label: 'Life',         color: '#10B981' },
  { href: '/habits',    icon: Flame,           label: 'Habits',       color: '#FF4F81' },
  { href: '/journal',   icon: BookOpen,        label: 'Journal',      color: '#FBBF24' },
  { href: '/learn',     icon: GraduationCap,   label: 'Learning',     color: '#22D3EE' },
  { href: '/notes',     icon: StickyNote,      label: 'Notes',        color: '#8B5CF6' },
  { href: '/ai',        icon: Bot,             label: 'AI Assistant', color: '#FF4F81' },
  { href: '/reminders', icon: Bell,            label: 'Reminders',    color: '#FBBF24' },
  { href: '/analytics', icon: BarChart2,       label: 'Insights',     color: '#3B82F6' },
]

const NAV_SHORTCUTS = [
  { href: '/dashboard?tab=plan', icon: ListChecks, label: 'Today Plan',  color: '#7C3AED' },
  { href: '/dashboard?focus=1',  icon: Clock,      label: 'Focus Mode',  color: '#22D3EE' },
  { href: '/dashboard?pomo=1',   icon: Zap,        label: 'Pomodoro',    color: '#FF8A3D' },
]

const NAV_BOTTOM = [
  { href: '/settings',  icon: Settings, label: 'Settings',    color: '#8892B0' },
  { href: '/mcp',       icon: Code2,    label: 'Developer',   color: '#10B981' },
]

interface DesktopSidebarProps {
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export default function DesktopSidebar({ isCollapsed = false, onToggleCollapse }: DesktopSidebarProps) {
  const pathname = usePathname()
  const { profile } = useAuth()
  const [isMobile, setIsMobile] = useState(true)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (isMobile) return null

  const lifeScore = profile?.life_score ?? 0
  const name = profile?.display_name || profile?.username || 'User'
  const initial = name[0]?.toUpperCase() ?? 'U'
  const sidebarWidth = isCollapsed ? 74 : 260

  function NavItem({ href, icon: Icon, label, color }: { href: string; icon: typeof LayoutDashboard; label: string; color: string }) {
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href.split('?')[0]))
    return (
      <Link
        href={href}
        title={isCollapsed ? label : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: 10,
          padding: isCollapsed ? '10px 0' : '8px 10px',
          borderRadius: 10,
          textDecoration: 'none',
          position: 'relative',
          background: isActive ? `rgba(${hexToRgb(color)}, 0.12)` : 'transparent',
          border: `1px solid ${isActive ? `rgba(${hexToRgb(color)}, 0.3)` : 'transparent'}`,
          color: isActive ? '#FFFFFF' : 'var(--text-muted)',
          fontWeight: isActive ? 700 : 500,
          fontSize: 13,
          transition: 'all 150ms ease',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
        onMouseEnter={e => {
          if (!isActive) {
            (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'
            ;(e.currentTarget as HTMLElement).style.color = '#FFFFFF'
          }
        }}
        onMouseLeave={e => {
          if (!isActive) {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
          }
        }}
      >
        {/* Active indicator bar */}
        {isActive && (
          <div style={{
            position: 'absolute',
            left: 0,
            top: 6,
            bottom: 6,
            width: 3,
            borderRadius: '0 4px 4px 0',
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }} />
        )}
        <Icon
          size={17}
          color={isActive ? color : 'var(--text-muted)'}
          style={{ flexShrink: 0, marginLeft: isActive ? 6 : 0 }}
        />
        {!isCollapsed && (
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </span>
        )}
      </Link>
    )
  }

  return (
    <aside
      className="desktop-sidebar hidden lg:flex flex-col"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: sidebarWidth,
        background: 'linear-gradient(180deg, #081126 0%, #050816 60%, #081126 100%)',
        borderRight: '1px solid rgba(124, 58, 237, 0.15)',
        justifyContent: 'space-between',
        zIndex: 40,
        padding: isCollapsed ? '18px 8px' : '18px 12px',
        boxShadow: '4px 0 30px rgba(0,0,0,0.6)',
        transition: 'width 250ms cubic-bezier(0.4, 0, 0.2, 1), padding 250ms ease',
        overflow: 'hidden',
      }}
    >
      {/* ─── TOP SECTION ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1, minHeight: 0 }}>

        {/* Brand Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          padding: isCollapsed ? '4px 0 16px' : '4px 2px 16px',
          borderBottom: '1px solid rgba(124, 58, 237, 0.15)',
          marginBottom: 14,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Helpo Logo */}
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #7C3AED 0%, #FF4F81 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              flexShrink: 0,
              boxShadow: '0 4px 16px rgba(124, 58, 237, 0.5)',
              fontWeight: 900,
              fontSize: 18,
              letterSpacing: '-0.04em',
            }}>
              H
            </div>
            {!isCollapsed && (
              <div>
                <h1 style={{ fontSize: 16, fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                  Helpo
                </h1>
                <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: 0, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  Personal OS
                </p>
              </div>
            )}
          </div>

          {!isCollapsed && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              style={{
                background: 'rgba(124, 58, 237, 0.1)',
                border: '1px solid rgba(124, 58, 237, 0.25)',
                borderRadius: 8,
                width: 30,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                transition: 'all 150ms ease',
                flexShrink: 0,
              }}
              title="Collapse Sidebar"
            >
              <PanelLeftClose size={14} />
            </button>
          )}
          {isCollapsed && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              style={{
                background: 'rgba(124, 58, 237, 0.1)',
                border: '1px solid rgba(124, 58, 237, 0.25)',
                borderRadius: 8,
                width: 30,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                transition: 'all 150ms ease',
                marginTop: 8,
              }}
              title="Expand Sidebar"
            >
              <PanelLeftOpen size={14} />
            </button>
          )}
        </div>

        {/* Scrollable Nav */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>
          {/* Main Navigation */}
          <div>
            {!isCollapsed && (
              <div className="section-label" style={{ padding: '0 10px 8px', display: 'block' }}>
                NAVIGATION
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {NAV_MAIN.map(item => <NavItem key={item.href} {...item} />)}
            </div>
          </div>

          {/* Shortcuts */}
          <div>
            {!isCollapsed && (
              <div className="section-label" style={{ padding: '0 10px 8px', display: 'block' }}>
                SHORTCUTS
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {NAV_SHORTCUTS.map(item => <NavItem key={item.href} {...item} />)}
            </div>
          </div>
        </div>
      </div>

      {/* ─── BOTTOM SECTION ─── */}
      <div style={{
        borderTop: '1px solid rgba(124, 58, 237, 0.15)',
        paddingTop: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        flexShrink: 0,
      }}>
        {/* Bottom nav links */}
        {NAV_BOTTOM.map(item => <NavItem key={item.href} {...item} />)}

        {/* Profile Card */}
        <Link
          href="/settings"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: 10,
            padding: isCollapsed ? '8px 0' : '10px 10px',
            borderRadius: 12,
            background: 'rgba(124, 58, 237, 0.08)',
            border: '1px solid rgba(124, 58, 237, 0.2)',
            marginTop: 4,
            textDecoration: 'none',
            transition: 'all 150ms ease',
          }}
          title={isCollapsed ? name : undefined}
        >
          {/* Avatar with Life Score ring */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7C3AED, #FF4F81)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: 13,
            }}>
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : initial}
            </div>
          </div>
          {!isCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600 }}>
                Life Score: <span style={{ color: '#7C3AED' }}>{lifeScore}</span>
              </div>
            </div>
          )}
          {!isCollapsed && (
            <ChevronRight size={13} color="var(--text-dim)" />
          )}
        </Link>
      </div>
    </aside>
  )
}

/** Convert hex color to "r, g, b" string for rgba() usage */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '124, 58, 237'
}
