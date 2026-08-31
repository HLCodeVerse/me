'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CheckSquare, ListTodo, BookOpen, Bot, Flame, StickyNote, Bell } from 'lucide-react'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home',     color: '#10B981' },
  { href: '/tasks',     icon: CheckSquare,     label: 'Tasks',    color: '#F59E0B' },
  { href: '/habits',    icon: Flame,           label: 'Habits',   color: '#F43F5E' },
  { href: '/notes',     icon: StickyNote,      label: 'Notes',    color: '#06B6D4' },
  { href: '/todos',     icon: ListTodo,        label: 'Todos',    color: '#818CF8' },
  { href: '/journal',   icon: BookOpen,        label: 'Journal',  color: '#A78BFA' },
  { href: '/reminders', icon: Bell,            label: 'Remind',   color: '#F59E0B' },
  { href: '/ai',        icon: Bot,             label: 'AI',       color: '#818CF8' },
]

function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!r) return '255,255,255'
  return `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}`
}

export default function BottomNav() {
  const pathname = usePathname()
  // Show 5 items max on small screens, 8 on wider
  const visibleNav = NAV.slice(0, 5)

  return (
    <nav className="bottom-nav" style={{
      background: 'rgba(14,17,23,0.88)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingTop: 6,
      paddingLeft: 4,
      paddingRight: 4,
    }}>
      {visibleNav.map(({ href, icon: Icon, label, color }) => {
        const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '6px 12px',
              borderRadius: 12,
              textDecoration: 'none',
              transition: 'all 150ms',
              flex: 1,
              background: isActive ? `rgba(${hexToRgb(color)},0.1)` : 'transparent',
              border: `1px solid ${isActive ? `rgba(${hexToRgb(color)},0.2)` : 'transparent'}`,
              position: 'relative',
              minWidth: 0,
            }}
          >
            {isActive && (
              <div style={{
                position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
                width: 24, height: 2, borderRadius: 99,
                background: color, boxShadow: `0 0 8px ${color}`,
              }} />
            )}
            <Icon
              size={20}
              color={isActive ? color : 'var(--text-dim)'}
              strokeWidth={isActive ? 2.5 : 1.8}
              style={{ transition: 'all 150ms' }}
            />
            <span style={{
              fontSize: 10,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? color : 'var(--text-dim)',
              lineHeight: 1,
              transition: 'color 150ms',
            }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
