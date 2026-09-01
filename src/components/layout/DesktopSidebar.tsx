'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, CheckSquare, ListTodo, BookOpen,
  Target, GraduationCap, Bot, Settings, Zap, Bell,
  StickyNote, Flame, ChevronRight, BarChart2, ShieldCheck, Activity
} from 'lucide-react'

const NAV_GROUPS = [
  {
    title: 'Daily OS',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',   color: '#7C3AED' },
      { href: '/tasks',     icon: CheckSquare,     label: 'Tasks',       color: '#F59E0B' },
      { href: '/todos',     icon: ListTodo,        label: 'Todos',       color: '#3B82F6' },
      { href: '/habits',    icon: Flame,           label: 'Habits',      color: '#EF4444' },
      { href: '/health',    icon: Activity,        label: 'Health',      color: '#10B981' },
      { href: '/notes',     icon: StickyNote,      label: 'Notes',       color: '#06B6D4' },
      { href: '/reminders', icon: Bell,            label: 'Reminders',   color: '#F59E0B' },
      { href: '/journal',   icon: BookOpen,        label: 'Journal',     color: '#8B5CF6' },
    ]
  },
  {
    title: 'Growth & vision',
    items: [
      { href: '/goals',     icon: Target,          label: 'Goals',       color: '#10B981' },
      { href: '/analytics', icon: BarChart2,       label: 'Analytics',   color: '#3B82F6' },
      { href: '/learn',     icon: GraduationCap,   label: 'Learning hub',color: '#8B5CF6' },
    ]
  },
  {
    title: 'Intelligence',
    items: [
      { href: '/ai',        icon: Bot,             label: 'AI chat OS',  color: '#7C3AED' },
      { href: '/mcp',       icon: ShieldCheck,     label: 'MCP connect', color: '#10B981' },
      { href: '/settings',  icon: Settings,        label: 'Settings',    color: '#6B7280' },
    ]
  }
]

export default function DesktopSidebar() {
  const pathname = usePathname()
  const { profile } = useAuth()

  const lifeScore = profile?.life_score ?? 85
  const name = profile?.display_name || profile?.username || 'Builder'

  return (
    <aside style={{
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: 260,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      zIndex: 40,
      padding: '16px 12px',
    }} className="hidden md:flex">
      
      {/* Top: Logo & Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--primary-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            flexShrink: 0,
          }}>
            <Zap size={20} fill="#FFFFFF" />
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
              NIRMAAN
            </h1>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>
              Personal Reconstruction OS
            </p>
          </div>
        </div>

        {/* Navigation Groups */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
          {NAV_GROUPS.map(group => (
            <div key={group.title}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-muted)',
                padding: '0 12px 8px',
                letterSpacing: '0.04em',
              }}>
                {group.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {group.items.map(({ href, icon: Icon, label, color }) => {
                  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                  return (
                    <Link
                      key={href}
                      href={href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-btn)',
                        textDecoration: 'none',
                        position: 'relative',
                        background: isActive ? `${color}14` : 'transparent',
                        color: isActive ? color : 'var(--text-secondary)',
                        fontWeight: isActive ? 600 : 500,
                        transition: 'all 150ms ease',
                      }}
                    >
                      {/* Active item left accent bar */}
                      {isActive && (
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 6,
                          bottom: 6,
                          width: 3,
                          borderRadius: '0 4px 4px 0',
                          background: color,
                        }} />
                      )}
                      
                      <Icon size={18} color={isActive ? color : 'var(--text-secondary)'} />
                      <span style={{ fontSize: 13, flex: 1 }}>{label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer: MCP Pill & User Card */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* MCP Status Pill */}
        <Link href="/mcp" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderRadius: 99,
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          textDecoration: 'none',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', flex: 1 }}>MCP Connected</span>
          <ChevronRight size={14} color="#059669" />
        </Link>

        {/* User Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          borderRadius: 'var(--radius-btn)',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
        }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'var(--primary-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: 13,
          }}>
            {name[0]?.toUpperCase() ?? 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Lvl 12 • {lifeScore} XP
            </div>
          </div>
          <Link href="/settings" style={{ color: 'var(--text-muted)' }}>
            <Settings size={16} />
          </Link>
        </div>
      </div>
    </aside>
  )
}
