'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CheckSquare, ListTodo, BookOpen, Bot, Flame,
  StickyNote, Bell, Target, GraduationCap, BarChart2, Settings, Menu, X, ShieldCheck, Disc
} from 'lucide-react'

const QUICK_NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: '#7C3AED' },
  { href: '/tasks',     icon: CheckSquare,     label: 'Tasks',     color: '#F59E0B' },
  { href: '/player',    icon: Disc,            label: 'Player',    color: '#7C3AED' },
  { href: '/ai',        icon: Bot,             label: 'AI Chat',   color: '#7C3AED' },
]

const ALL_MODULES = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',   color: '#7C3AED' },
  { href: '/tasks',     icon: CheckSquare,     label: 'Tasks',       color: '#F59E0B' },
  { href: '/todos',     icon: ListTodo,        label: 'Todos',       color: '#3B82F6' },
  { href: '/player',    icon: Disc,            label: 'Media Player',color: '#7C3AED' },
  { href: '/habits',    icon: Flame,           label: 'Habits',      color: '#EF4444' },
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

export default function BottomNav() {
  const pathname = usePathname()
  const [showDrawer, setShowDrawer] = useState(false)

  return (
    <>
      <nav className="md:hidden" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 50,
        boxShadow: 'var(--shadow-hero)',
        padding: '0 8px',
      }}>
        {QUICK_NAV.map(({ href, icon: Icon, label, color }) => {
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
                borderRadius: 'var(--radius-btn)',
                textDecoration: 'none',
                color: isActive ? color : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: 11,
              }}
            >
              <Icon size={18} color={isActive ? color : 'var(--text-secondary)'} />
              <span>{label}</span>
            </Link>
          )
        })}

        {/* More Menu Drawer Trigger */}
        <button
          onClick={() => setShowDrawer(p => !p)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            padding: '6px 12px',
            borderRadius: 'var(--radius-btn)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: showDrawer ? '#7C3AED' : 'var(--text-secondary)',
            fontSize: 11,
            fontWeight: showDrawer ? 600 : 500,
          }}
        >
          <Menu size={18} color={showDrawer ? '#7C3AED' : 'var(--text-secondary)'} />
          <span>More</span>
        </button>
      </nav>

      {/* Slide-Up Navigation Drawer */}
      {showDrawer && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(17, 24, 39, 0.4)', zIndex: 120 }}
            onClick={() => setShowDrawer(false)}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 130,
            background: 'var(--surface)',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTop: '1px solid var(--border)',
            padding: '20px 18px 36px',
            maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>All App Modules</span>
              <button onClick={() => setShowDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
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
                      background: isActive ? 'rgba(124, 58, 237, 0.08)' : 'var(--surface-2)',
                      border: `1px solid ${isActive ? '#7C3AED' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-btn)', textDecoration: 'none',
                    }}
                  >
                    <Icon size={16} color={color} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#7C3AED' : 'var(--text-primary)' }}>{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}
    </>
  )
}
