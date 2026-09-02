'use client'

import { Search, Bell, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getGreeting } from '@/lib/utils'

interface AppHeaderProps {
  onOpenMobileDrawer?: () => void
  isSidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}

export default function AppHeader({ onOpenMobileDrawer, isSidebarCollapsed, onToggleSidebar }: AppHeaderProps) {
  const { profile } = useAuth()
  const name = profile?.display_name?.split(' ')[0] ?? profile?.username ?? 'Builder'

  return (
    <header style={{
      minHeight: 72,
      paddingTop: 'env(safe-area-inset-top, 0px)',
      background: '#000000',
      borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
      paddingLeft: 24,
      paddingRight: 24,
      paddingBottom: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      width: '100%',
    }}>
      {/* Left: Menu Toggle & Greeting */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Mobile Hamburger Button (visible on <1024px) */}
        <button
          onClick={onOpenMobileDrawer}
          className="btn-ghost btn-icon lg:hidden"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: 'var(--radius-btn)',
            width: 40,
            height: 40,
            cursor: 'pointer',
            background: 'rgba(245, 158, 11, 0.1)',
          }}
          aria-label="Open Mobile Navigation Menu"
        >
          <Menu size={20} color="#FFD700" />
        </button>

        {/* Desktop Sidebar Toggle Button (visible on ≥1024px) */}
        <button
          onClick={onToggleSidebar}
          className="btn-ghost btn-icon hidden lg:inline-flex"
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: 'var(--radius-btn)',
            width: 40,
            height: 40,
            cursor: 'pointer',
            background: 'rgba(245, 158, 11, 0.1)',
          }}
          title={isSidebarCollapsed ? 'Expand Sidebar Menu' : 'Hide Sidebar Menu'}
          aria-label="Toggle Desktop Sidebar Menu"
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={20} color="#FFD700" /> : <PanelLeftClose size={20} color="#FFD700" />}
        </button>

        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            {getGreeting()}, {name}! 👋
          </h2>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: '2px 0 0' }}>
            Let&apos;s make today count and build your best life.
          </p>
        </div>
      </div>

      {/* Right: Search, Notifications, Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Search Bar */}
        <div style={{ position: 'relative', width: 240 }} className="hidden md:block">
          <Search size={16} color="#F59E0B" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search anything..."
            style={{
              paddingLeft: 36,
              height: 38,
              fontSize: 13,
              borderRadius: 'var(--radius-btn)',
              background: '#121318',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: '#FFFFFF',
            }}
          />
        </div>

        {/* Search Icon button for small screens */}
        <button className="btn-ghost btn-icon md:hidden" style={{ border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-btn)', width: 38, height: 38 }}>
          <Search size={18} color="#F59E0B" />
        </button>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button className="btn-ghost btn-icon" style={{ border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-btn)', width: 38, height: 38, position: 'relative' }}>
            <Bell size={18} color="#FFFFFF" />
            <span style={{
              position: 'absolute',
              top: 4,
              right: 4,
              background: '#EF4444',
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: 800,
              width: 16,
              height: 16,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #0A0B0D',
            }}>
              3
            </span>
          </button>
        </div>

        {/* Avatar with Online Dot */}
        <div style={{ position: 'relative', width: 38, height: 38 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFD700, #F59E0B)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000000',
            fontSize: 14,
            fontWeight: 800,
            overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(245, 158, 11, 0.4)',
          }}>
            {name[0]?.toUpperCase() ?? 'U'}
          </div>
          {/* Online green indicator dot */}
          <span style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#10B981',
            border: '2px solid #0A0B0D',
            boxShadow: '0 0 6px #10B981',
          }} />
        </div>
      </div>
    </header>
  )
}
