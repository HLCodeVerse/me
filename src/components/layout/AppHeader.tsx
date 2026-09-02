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
      minHeight: 68,
      paddingTop: 'env(safe-area-inset-top, 0px)',
      background: 'rgba(8, 17, 38, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(124, 58, 237, 0.2)',
      paddingLeft: 20,
      paddingRight: 20,
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
            border: '1px solid rgba(124, 58, 237, 0.3)',
            borderRadius: 'var(--radius-btn)',
            width: 38,
            height: 38,
            cursor: 'pointer',
            background: 'rgba(124, 58, 237, 0.1)',
          }}
          aria-label="Open Mobile Navigation Menu"
        >
          <Menu size={18} color="#8B5CF6" />
        </button>

        {/* Desktop Sidebar Toggle Button (visible on ≥1024px) */}
        <button
          onClick={onToggleSidebar}
          className="btn-ghost btn-icon hidden lg:inline-flex"
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            borderRadius: 'var(--radius-btn)',
            width: 38,
            height: 38,
            cursor: 'pointer',
            background: 'rgba(124, 58, 237, 0.1)',
          }}
          title={isSidebarCollapsed ? 'Expand Sidebar Menu' : 'Hide Sidebar Menu'}
          aria-label="Toggle Desktop Sidebar Menu"
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={18} color="#8B5CF6" /> : <PanelLeftClose size={18} color="#8B5CF6" />}
        </button>

        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            {getGreeting()}, {name}! 👋
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '1px 0 0' }}>
            Your personal operating system is synced.
          </p>
        </div>
      </div>

      {/* Right: Search, Notifications, Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Search Bar */}
        <div style={{ position: 'relative', width: 220 }} className="hidden md:block">
          <Search size={15} color="#8B5CF6" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search anything..."
            style={{
              paddingLeft: 34,
              height: 36,
              fontSize: 12,
              borderRadius: 'var(--radius-btn)',
              background: 'var(--surface-2)',
              border: '1px solid rgba(124, 58, 237, 0.25)',
              color: '#FFFFFF',
            }}
          />
        </div>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button className="btn-ghost btn-icon" style={{ border: '1px solid rgba(124, 58, 237, 0.25)', borderRadius: 'var(--radius-btn)', width: 36, height: 36, position: 'relative' }}>
            <Bell size={16} color="var(--text-secondary)" />
            <span style={{
              position: 'absolute',
              top: 3,
              right: 3,
              background: '#FF4F81',
              color: '#FFFFFF',
              fontSize: 9,
              fontWeight: 800,
              width: 14,
              height: 14,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #081126',
            }}>
              3
            </span>
          </button>
        </div>

        {/* Avatar with Online Dot */}
        <div style={{ position: 'relative', width: 36, height: 36 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7C3AED, #6366F1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 800,
            overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(124, 58, 237, 0.4)',
          }}>
            {name[0]?.toUpperCase() ?? 'U'}
          </div>
          {/* Online green indicator dot */}
          <span style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: '#10B981',
            border: '2px solid #081126',
            boxShadow: '0 0 6px #10B981',
          }} />
        </div>
      </div>
    </header>
  )
}
