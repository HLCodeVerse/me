'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CheckSquare, ListTodo, BookOpen, Bot, Flame,
  StickyNote, Bell, Target, GraduationCap, BarChart2, Settings, Menu, X, ShieldCheck
} from 'lucide-react'

const QUICK_NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home',   color: '#10B981' },
  { href: '/tasks',     icon: CheckSquare,     label: 'Tasks',  color: '#F59E0B' },
  { href: '/ai',        icon: Bot,             label: 'AI OS',  color: '#818CF8' },
  { href: '/habits',    icon: Flame,           label: 'Habits', color: '#F43F5E' },
]

const ALL_MODULES = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',   color: '#10B981', category: 'Daily OS' },
  { href: '/tasks',     icon: CheckSquare,     label: 'Tasks',       color: '#F59E0B', category: 'Daily OS' },
  { href: '/todos',     icon: ListTodo,        label: 'Todos',       color: '#818CF8', category: 'Daily OS' },
  { href: '/habits',    icon: Flame,           label: 'Habits',      color: '#F43F5E', category: 'Daily OS' },
  { href: '/notes',     icon: StickyNote,      label: 'Notes',       color: '#06B6D4', category: 'Daily OS' },
  { href: '/reminders', icon: Bell,            label: 'Reminders',   color: '#F59E0B', category: 'Daily OS' },
  { href: '/journal',   icon: BookOpen,        label: 'Journal',     color: '#A78BFA', category: 'Daily OS' },
  { href: '/goals',     icon: Target,          label: 'Goals',       color: '#10B981', category: 'Growth & Vision' },
  { href: '/analytics', icon: BarChart2,       label: 'Analytics',   color: '#10B981', category: 'Growth & Vision' },
  { href: '/learn',     icon: GraduationCap,   label: 'Learn Hub',   color: '#60A5FA', category: 'Growth & Vision' },
  { href: '/ai',        icon: Bot,             label: 'AI Chat OS',  color: '#818CF8', category: 'Intelligence' },
  { href: '/mcp',       icon: ShieldCheck,     label: 'MCP Connect', color: '#10B981', category: 'Intelligence' },
  { href: '/settings',  icon: Settings,        label: 'Settings',    color: '#8892A4', category: 'Intelligence' },
]

function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!r) return '255,255,255'
  return `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}`
}

export default function BottomNav() {
  const pathname = usePathname()
  const [showDrawer, setShowDrawer] = useState(false)

  return (
    <>
      <nav className="bottom-nav" style={{
        background: 'rgba(10,11,13,0.92)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingTop: 6,
        paddingLeft: 6,
        paddingRight: 6,
        boxShadow: '0 -8px 32px rgba(0,0,0,0.6)',
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
                padding: '6px 10px',
                borderRadius: 12,
                textDecoration: 'none',
                transition: 'all 150ms',
                flex: 1,
                background: isActive ? `rgba(${hexToRgb(color)},0.12)` : 'transparent',
                border: `1px solid ${isActive ? `rgba(${hexToRgb(color)},0.25)` : 'transparent'}`,
                position: 'relative',
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)',
                  width: 20, height: 2, borderRadius: 99,
                  background: color, boxShadow: `0 0 10px ${color}`,
                }} />
              )}
              <Icon
                size={19}
                color={isActive ? color : 'var(--text-dim)'}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span style={{
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? color : 'var(--text-dim)',
                lineHeight: 1,
              }}>
                {label}
              </span>
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
            padding: '6px 10px',
            borderRadius: 12,
            background: showDrawer ? 'rgba(167,139,250,0.15)' : 'transparent',
            border: `1px solid ${showDrawer ? 'rgba(167,139,250,0.3)' : 'transparent'}`,
            cursor: 'pointer',
            flex: 1,
          }}
        >
          <Menu size={19} color={showDrawer ? '#A78BFA' : 'var(--text-dim)'} />
          <span style={{ fontSize: 10, fontWeight: showDrawer ? 700 : 500, color: showDrawer ? '#A78BFA' : 'var(--text-dim)' }}>
            More
          </span>
        </button>
      </nav>

      {/* Slide-Up Navigation Drawer */}
      {showDrawer && (
        <>
          <div className="overlay" onClick={() => setShowDrawer(false)} style={{ zIndex: 120 }} />
          <div className="animate-slide-up" style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 130,
            background: 'rgba(14,17,23,0.96)', backdropFilter: 'blur(24px)',
            borderTop: '1px solid var(--border-2)',
            borderRadius: '24px 24px 0 0', padding: '20px 18px 36px',
            maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>All App Modules</span>
                <span className="badge badge-purple" style={{ fontSize: 10 }}>12 Apps</span>
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
                      background: isActive ? `rgba(${hexToRgb(color)},0.15)` : 'var(--surface-2)',
                      border: `1px solid ${isActive ? `rgba(${hexToRgb(color)},0.3)` : 'var(--border)'}`,
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
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
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
