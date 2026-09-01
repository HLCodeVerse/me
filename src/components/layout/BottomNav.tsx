'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CheckSquare, ListTodo, BookOpen, Bot, Flame,
  StickyNote, Bell, Target, GraduationCap, BarChart2, Settings, Menu, X, ShieldCheck, Disc
} from 'lucide-react'

const QUICK_NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: '#FFD700' },
  { href: '/tasks',     icon: CheckSquare,     label: 'Tasks',     color: '#EF4444' },
  { href: '/player',    icon: Disc,            label: 'Player',    color: '#F59E0B' },
  { href: '/ai',        icon: Bot,             label: 'AI Chat',   color: '#FFD700' },
]

const ALL_MODULES = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',   color: '#FFD700' },
  { href: '/tasks',     icon: CheckSquare,     label: 'Tasks',       color: '#EF4444' },
  { href: '/todos',     icon: ListTodo,        label: 'Todos',       color: '#FACC15' },
  { href: '/player',    icon: Disc,            label: 'Media Player',color: '#F59E0B' },
  { href: '/habits',    icon: Flame,           label: 'Habits',      color: '#EF4444' },
  { href: '/notes',     icon: StickyNote,      label: 'Notes',       color: '#FACC15' },
  { href: '/reminders', icon: Bell,            label: 'Reminders',   color: '#EF4444' },
  { href: '/journal',   icon: BookOpen,        label: 'Journal',     color: '#10B981' },
  { href: '/goals',     icon: Target,          label: 'Goals',       color: '#10B981' },
  { href: '/analytics', icon: BarChart2,       label: 'Analytics',   color: '#FACC15' },
  { href: '/learn',     icon: GraduationCap,   label: 'Learning hub',color: '#FFD700' },
  { href: '/ai',        icon: Bot,             label: 'AI chat OS',  color: '#FFD700' },
  { href: '/mcp',       icon: ShieldCheck,     label: 'MCP connect', color: '#10B981' },
  { href: '/settings',  icon: Settings,        label: 'Settings',    color: '#FFFFFF' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [showDrawer, setShowDrawer] = useState(false)

  return (
    <>
      <nav className="lg:hidden" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: '#0A0B0D',
        borderTop: '1px solid rgba(245, 158, 11, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 50,
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.8)',
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
                color: isActive ? color : '#9CA3AF',
                fontWeight: isActive ? 700 : 500,
                fontSize: 11,
              }}
            >
              <Icon size={18} color={isActive ? color : '#9CA3AF'} />
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
            color: showDrawer ? '#FFD700' : '#9CA3AF',
            fontSize: 11,
            fontWeight: showDrawer ? 700 : 500,
          }}
        >
          <Menu size={18} color={showDrawer ? '#FFD700' : '#9CA3AF'} />
          <span>More</span>
        </button>
      </nav>

      {/* Slide-Up Navigation Drawer */}
      {showDrawer && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', zIndex: 120, backdropFilter: 'blur(4px)' }}
            onClick={() => setShowDrawer(false)}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 130,
            background: '#0A0B0D',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTop: '1px solid rgba(245, 158, 11, 0.35)',
            padding: '20px 18px 36px',
            maxHeight: '80vh', overflowY: 'auto',
            boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.9)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF' }}>All App Modules</span>
              <button onClick={() => setShowDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FFFFFF' }}>
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
                      background: isActive ? 'rgba(245, 158, 11, 0.15)' : '#121318',
                      border: `1px solid ${isActive ? '#F59E0B' : 'rgba(245, 158, 11, 0.2)'}`,
                      borderRadius: 'var(--radius-btn)', textDecoration: 'none',
                    }}
                  >
                    <Icon size={16} color={color} />
                    <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? '#FFD700' : '#FFFFFF' }}>{label}</span>
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

