'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, CheckSquare, BookOpen, Brain, Compass,
  ListTodo, Target, BarChart2, Settings, Link2, Flame
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  { href: '/dashboard',  icon: Home,        label: 'Dashboard',       section: 'main' },
  { href: '/tasks',      icon: CheckSquare, label: 'Tasks',           section: 'main' },
  { href: '/todos',      icon: ListTodo,    label: 'Todos',           section: 'main' },
  { href: '/journal',    icon: BookOpen,    label: 'Journal',         section: 'main' },
  { href: '/goals',      icon: Target,      label: 'Goals',           section: 'growth' },
  { href: '/learn',      icon: Compass,     label: 'Learn',           section: 'growth' },
  { href: '/ai',         icon: Brain,       label: 'AI Companion',    section: 'tools' },
  { href: '/analytics',  icon: BarChart2,   label: 'Analytics',       section: 'tools' },
  { href: '/mcp',        icon: Link2,       label: 'MCP Connect',     section: 'tools' },
  { href: '/settings',   icon: Settings,    label: 'Settings',        section: 'settings' },
]

const SECTIONS: Record<string, string> = {
  main: 'WORKSPACE',
  growth: 'GROWTH',
  tools: 'TOOLS',
  settings: 'SYSTEM',
}

export default function DesktopSidebar() {
  const pathname = usePathname()
  const { profile } = useAuth()

  const grouped: Record<string, typeof navItems> = {}
  for (const item of navItems) {
    if (!grouped[item.section]) grouped[item.section] = []
    grouped[item.section].push(item)
  }

  return (
    <aside className="desktop-sidebar">
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '0 8px' }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'var(--growth)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 900, color: '#0A0B0D', flexShrink: 0,
          boxShadow: '0 0 16px rgba(52,211,153,0.3)',
        }}>N</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.03em' }}>NIRMAAN</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.05em' }}>निर्माण</div>
        </div>
      </div>

      {/* User info */}
      {profile && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
          padding: '10px 12px', background: 'var(--surface-2)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: 'var(--growth)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#0A0B0D', flexShrink: 0,
          }}>
            {(profile.display_name || profile.username || 'U')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.display_name || profile.username}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Flame size={10} color="var(--focus)" />
              {profile.current_streak || 0}d · Score {profile.life_score || 0}
            </div>
          </div>
        </div>
      )}

      {/* Nav sections */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Object.entries(grouped).map(([section, items]) => (
          <div key={section}>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-dim)', letterSpacing: '0.08em', padding: '0 10px', marginBottom: 4 }}>
              {SECTIONS[section]}
            </div>
            {items.map(({ href, icon: Icon, label }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 'var(--radius-sm)',
                    textDecoration: 'none', fontSize: 13, fontWeight: active ? 700 : 500,
                    color: active ? 'var(--growth)' : 'var(--text-muted)',
                    background: active ? 'rgba(52,211,153,0.08)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(52,211,153,0.15)' : 'transparent'}`,
                    transition: 'all 150ms ease',
                  }}
                >
                  <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
                  {label}
                  {active && (
                    <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: 'var(--growth)', boxShadow: '0 0 8px rgba(52,211,153,0.6)' }} />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'center', padding: '0 8px' }}>
          NIRMAAN v1.0 · निर्माण
        </div>
      </div>
    </aside>
  )
}
