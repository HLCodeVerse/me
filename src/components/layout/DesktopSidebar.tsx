'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, CheckSquare, ListTodo, BookOpen,
  Target, GraduationCap, Bot, Settings, Zap, Bell,
  StickyNote, Flame, ChevronRight, BarChart2, ShieldCheck, Activity, Disc,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react'

const NAV_GROUPS = [
  {
    title: 'DAILY OS',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',    color: '#FFD700' },
      { href: '/tasks',     icon: CheckSquare,     label: 'Tasks',        color: '#EF4444' },
      { href: '/todos',     icon: ListTodo,        label: 'Todos',        color: '#FACC15' },
      { href: '/habits',    icon: Flame,           label: 'Habits',       color: '#EF4444' },
      { href: '/health',    icon: Activity,        label: 'Health',       color: '#10B981' },
      { href: '/player',    icon: Disc,            label: 'Media Player', color: '#F59E0B' },
      { href: '/notes',     icon: StickyNote,      label: 'Notes',        color: '#FACC15' },
      { href: '/reminders', icon: Bell,            label: 'Reminders',    color: '#EF4444' },
      { href: '/journal',   icon: BookOpen,        label: 'Journal',      color: '#10B981' },
    ]
  },
  {
    title: 'GROWTH & VISION',
    items: [
      { href: '/goals',     icon: Target,          label: 'Goals',        color: '#10B981' },
      { href: '/analytics', icon: BarChart2,       label: 'Analytics',    color: '#FACC15' },
      { href: '/learn',     icon: GraduationCap,   label: 'Learning Hub', color: '#FFD700' },
    ]
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { href: '/ai',        icon: Bot,             label: 'AI Chat OS',   color: '#FFD700' },
      { href: '/mcp',       icon: ShieldCheck,     label: 'MCP Connect',  color: '#10B981' },
      { href: '/settings',  icon: Settings,        label: 'Settings',     color: '#FFFFFF' },
    ]
  }
]

interface DesktopSidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export default function DesktopSidebar({ isCollapsed, onToggleCollapse }: DesktopSidebarProps) {
  const pathname = usePathname()
  const { profile } = useAuth()
  const [isMobile, setIsMobile] = useState(true)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // STRICT GUARANTEE: Never render desktop sidebar on mobile screens (<1024px)
  if (isMobile) {
    return null
  }

  const lifeScore = profile?.life_score ?? 85
  const name = profile?.display_name || profile?.username || 'Builder'
  const sidebarWidth = isCollapsed ? 74 : 260

  return (
    <aside
      className="desktop-sidebar hidden lg:flex flex-col"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: sidebarWidth,
        background: 'linear-gradient(180deg, #000000 0%, #0A0B0D 50%, #121318 100%)',
        borderRight: '1px solid rgba(245, 158, 11, 0.3)',
        justifyContent: 'space-between',
        zIndex: 40,
        padding: isCollapsed ? '18px 8px' : '18px 14px',
        boxShadow: '4px 0 24px rgba(0,0,0,0.8)',
        transition: 'width 250ms cubic-bezier(0.4, 0, 0.2, 1), padding 250ms ease',
        overflow: 'hidden',
      }}
    >
      {/* Top: Brand Header & Toggle Button */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          padding: isCollapsed ? '4px 0 16px' : '4px 4px 16px',
          borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #FFD700, #F59E0B)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000000',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.5)',
            }}>
              <Zap size={20} fill="#000000" color="#000000" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                  NIRMAAN <span style={{ color: '#F59E0B', fontSize: 11 }}>OS</span>
                </h1>
                <p style={{ fontSize: 10, color: '#D1D5DB', margin: 0, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  Personal Reconstruction
                </p>
              </div>
            )}
          </div>

          {/* Sidebar Collapse Toggle Icon */}
          <button
            onClick={onToggleCollapse}
            style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#FFD700',
              transition: 'all 150ms ease',
              flexShrink: 0,
              marginTop: isCollapsed ? 8 : 0,
            }}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {/* Navigation Groups */}
        <div style={{
          marginTop: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 210px)',
          scrollbarWidth: 'none',
        }}>
          {NAV_GROUPS.map(group => (
            <div key={group.title}>
              {!isCollapsed && (
                <div style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: '#F59E0B',
                  padding: '0 8px 6px',
                  letterSpacing: '0.08em',
                  whiteSpace: 'nowrap',
                }}>
                  {group.title}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {group.items.map(({ href, icon: Icon, label, color }) => {
                  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={isCollapsed ? label : undefined}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        gap: 12,
                        padding: isCollapsed ? '10px 0' : '9px 12px',
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
                          top: 6,
                          bottom: 6,
                          width: 4,
                          borderRadius: '0 4px 4px 0',
                          background: color,
                          boxShadow: `0 0 10px ${color}`,
                        }} />
                      )}
                      
                      <Icon size={18} color={isActive ? color : '#9CA3AF'} style={{ flexShrink: 0 }} />
                      {!isCollapsed && <span style={{ fontSize: 13, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
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
        {/* MCP Status Pill */}
        {!isCollapsed ? (
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
            <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', flex: 1, whiteSpace: 'nowrap' }}>MCP Connected</span>
            <ChevronRight size={13} color="#10B981" />
          </Link>
        ) : (
          <Link href="/mcp" style={{ display: 'flex', justifyContent: 'center', padding: '6px' }} title="MCP Connected">
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 8px #10B981' }} className="animate-pulse" />
          </Link>
        )}

        {/* User Profile Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: 10,
          padding: isCollapsed ? '8px 0' : '10px 12px',
          borderRadius: 12,
          background: '#0A0B0D',
          border: '1px solid rgba(245, 158, 11, 0.3)',
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFD700, #F59E0B)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000000',
            fontWeight: 800,
            fontSize: 12,
            boxShadow: '0 2px 10px rgba(245, 158, 11, 0.4)',
            flexShrink: 0,
          }}>
            {name[0]?.toUpperCase() ?? 'U'}
          </div>
          {!isCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </div>
              <div style={{ fontSize: 10.5, color: '#FFD700', fontWeight: 700 }}>
                Score: {lifeScore}
              </div>
            </div>
          )}
          {!isCollapsed && (
            <Link href="/settings" style={{ color: '#F59E0B' }}>
              <Settings size={15} />
            </Link>
          )}
        </div>
      </div>
    </aside>
  )
}
