'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, CheckSquare, ListTodo, BookOpen,
  Target, GraduationCap, Bot, Settings, Zap, Bell,
  StickyNote, Flame, ChevronRight, BarChart2, ShieldCheck, Activity, Disc
} from 'lucide-react'

// High-contrast, premium color palette: Black, White, Red, Green, Yellow, Gold
const NAV_GROUPS = [
  {
    title: 'DAILY OS',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',    color: '#FFD700' }, // Metallic Gold
      { href: '/tasks',     icon: CheckSquare,     label: 'Tasks',        color: '#EF4444' }, // Red
      { href: '/todos',     icon: ListTodo,        label: 'Todos',        color: '#FACC15' }, // Yellow
      { href: '/habits',    icon: Flame,           label: 'Habits',       color: '#EF4444' }, // Red
      { href: '/health',    icon: Activity,        label: 'Health',       color: '#10B981' }, // Green
      { href: '/player',    icon: Disc,            label: 'Media Player', color: '#F59E0B' }, // Gold
      { href: '/notes',     icon: StickyNote,      label: 'Notes',        color: '#FACC15' }, // Yellow
      { href: '/reminders', icon: Bell,            label: 'Reminders',    color: '#EF4444' }, // Red
      { href: '/journal',   icon: BookOpen,        label: 'Journal',      color: '#10B981' }, // Green
    ]
  },
  {
    title: 'GROWTH & VISION',
    items: [
      { href: '/goals',     icon: Target,          label: 'Goals',        color: '#10B981' }, // Green
      { href: '/analytics', icon: BarChart2,       label: 'Analytics',    color: '#FACC15' }, // Yellow
      { href: '/learn',     icon: GraduationCap,   label: 'Learning Hub', color: '#FFD700' }, // Gold
    ]
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { href: '/ai',        icon: Bot,             label: 'AI Chat OS',   color: '#FFD700' }, // Gold
      { href: '/mcp',       icon: ShieldCheck,     label: 'MCP Connect',  color: '#10B981' }, // Green
      { href: '/settings',  icon: Settings,        label: 'Settings',     color: '#FFFFFF' }, // White
    ]
  }
]

export default function DesktopSidebar() {
  const pathname = usePathname()
  const { profile } = useAuth()

  const lifeScore = profile?.life_score ?? 85
  const name = profile?.display_name || profile?.username || 'Builder'

  return (
    <aside
      className="desktop-sidebar hidden lg:flex flex-col"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: 260,
        background: 'linear-gradient(180deg, #000000 0%, #0A0B0D 50%, #121318 100%)',
        borderRight: '1px solid rgba(245, 158, 11, 0.3)',
        justifyContent: 'space-between',
        zIndex: 40,
        padding: '18px 14px',
        boxShadow: '4px 0 24px rgba(0,0,0,0.8)',
      }}
    >
      {/* Top: Brand Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 8px 16px', borderBottom: '1px solid rgba(245, 158, 11, 0.2)' }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #FFD700, #F59E0B)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000000',
            flexShrink: 0,
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.5)',
          }}>
            <Zap size={22} fill="#000000" color="#000000" />
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '0.02em' }}>
              NIRMAAN <span style={{ color: '#F59E0B', fontSize: 12 }}>OS</span>
            </h1>
            <p style={{ fontSize: 10.5, color: '#D1D5DB', margin: 0, fontWeight: 600 }}>
              Personal Reconstruction
            </p>
          </div>
        </div>

        {/* Navigation Groups */}
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', maxHeight: 'calc(100vh - 220px)', scrollbarWidth: 'none' }}>
          {NAV_GROUPS.map(group => (
            <div key={group.title}>
              <div style={{
                fontSize: 10,
                fontWeight: 800,
                color: '#F59E0B',
                padding: '0 10px 8px',
                letterSpacing: '0.08em',
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
                        borderRadius: 10,
                        textDecoration: 'none',
                        position: 'relative',
                        background: isActive ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.2), rgba(250, 204, 21, 0.08))' : 'transparent',
                        border: `1px solid ${isActive ? 'rgba(245, 158, 11, 0.4)' : 'transparent'}`,
                        color: isActive ? '#FFFFFF' : '#9CA3AF',
                        fontWeight: isActive ? 700 : 500,
                        transition: 'all 150ms ease',
                        boxShadow: isActive ? '0 4px 14px rgba(245, 158, 11, 0.2)' : 'none',
                      }}
                    >
                      {/* Active item left glowing indicator */}
                      {isActive && (
                        <div style={{
                          position: 'absolute',
                          left: -2,
                          top: 8,
                          bottom: 8,
                          width: 4,
                          borderRadius: '0 4px 4px 0',
                          background: color,
                          boxShadow: `0 0 10px ${color}`,
                        }} />
                      )}
                      
                      <Icon size={18} color={isActive ? color : '#9CA3AF'} />
                      <span style={{ fontSize: 13, flex: 1 }}>{label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer: MCP Connected Pill & User Profile Card */}
      <div style={{ borderTop: '1px solid rgba(245, 158, 11, 0.2)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* MCP Status Pill (Green) */}
        <Link href="/mcp" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 12px',
          borderRadius: 99,
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          textDecoration: 'none',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 8px #10B981' }} className="animate-pulse" />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#10B981', flex: 1 }}>MCP Connected</span>
          <ChevronRight size={13} color="#10B981" />
        </Link>

        {/* User Profile Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          borderRadius: 12,
          background: '#0A0B0D',
          border: '1px solid rgba(245, 158, 11, 0.3)',
        }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFD700, #F59E0B)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000000',
            fontWeight: 800,
            fontSize: 13,
            boxShadow: '0 2px 10px rgba(245, 158, 11, 0.4)',
          }}>
            {name[0]?.toUpperCase() ?? 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </div>
            <div style={{ fontSize: 11, color: '#FFD700', fontWeight: 700 }}>
              Life Score: {lifeScore}
            </div>
          </div>
          <Link href="/settings" style={{ color: '#F59E0B' }}>
            <Settings size={16} />
          </Link>
        </div>
      </div>
    </aside>
  )
}

