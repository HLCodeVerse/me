'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, CheckSquare, ListTodo, BookOpen,
  Target, GraduationCap, Bot, Settings, Zap, Bell,
  StickyNote, Flame, ChevronRight
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',   color: '#10B981' },
  { href: '/tasks',     icon: CheckSquare,     label: 'Tasks',       color: '#F59E0B' },
  { href: '/todos',     icon: ListTodo,        label: 'Todos',       color: '#818CF8' },
  { href: '/habits',    icon: Flame,           label: 'Habits',      color: '#F43F5E' },
  { href: '/notes',     icon: StickyNote,      label: 'Notes',       color: '#06B6D4' },
  { href: '/journal',   icon: BookOpen,        label: 'Journal',     color: '#A78BFA' },
  { href: '/goals',     icon: Target,          label: 'Goals',       color: '#10B981' },
  { href: '/reminders', icon: Bell,            label: 'Reminders',   color: '#F59E0B' },
  { href: '/learn',     icon: GraduationCap,   label: 'Learn',       color: '#60A5FA' },
  { href: '/ai',        icon: Bot,             label: 'AI Chat',     color: '#818CF8' },
]

export default function DesktopSidebar() {
  const pathname = usePathname()
  const { profile } = useAuth()

  const lifeScore = profile?.life_score ?? 0
  const streakCount = profile?.current_streak ?? 0

  return (
    <nav className="desktop-sidebar" style={{ justifyContent: 'space-between', overflow: 'hidden' }}>
      {/* Logo */}
      <div style={{ padding: '4px 8px 16px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(16,185,129,0.3)',
            flexShrink: 0,
          }}>
            <Zap size={18} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.01em', color: 'var(--text)' }}>
              NIRMAAN
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Personal OS
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {NAV_ITEMS.map(({ href, icon: Icon, label, color }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                borderRadius: 10,
                textDecoration: 'none',
                transition: 'all 150ms',
                background: isActive ? `rgba(${hexToRgb(color)},0.1)` : 'transparent',
                border: `1px solid ${isActive ? `rgba(${hexToRgb(color)},0.2)` : 'transparent'}`,
                position: 'relative',
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: isActive ? `rgba(${hexToRgb(color)},0.15)` : 'var(--surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 150ms',
              }}>
                <Icon size={15} color={isActive ? color : 'var(--text-muted)'} />
              </div>
              <span style={{
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? color : 'var(--text-muted)',
                flex: 1,
                transition: 'color 150ms',
              }}>
                {label}
              </span>
              {isActive && (
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0 }} />
              )}
            </Link>
          )
        })}
      </div>

      {/* MCP Status */}
      <Link href="/mcp" style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', borderRadius: 10,
        background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
        textDecoration: 'none', marginBottom: 8,
        transition: 'all 150ms',
      }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#10B981', animation: 'ping 1.5s infinite' }} />
        </div>
        <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>MCP Connected</span>
        <ChevronRight size={12} color="var(--text-dim)" style={{ marginLeft: 'auto' }} />
      </Link>

      {/* Profile card */}
      <Link href="/settings" style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 10px', borderRadius: 12,
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        textDecoration: 'none', transition: 'all 150ms',
      }}>
        {/* Avatar */}
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #818CF8, #10B981)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: 'white',
        }}>
          {(profile?.display_name || profile?.username || 'U')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile?.display_name || profile?.username || 'Builder'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            {lifeScore} pts · {streakCount}d streak
          </div>
        </div>
        <Settings size={14} color="var(--text-dim)" />
      </Link>
    </nav>
  )
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '255,255,255'
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
}
