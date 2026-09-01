'use client'

import { Search, Bell, Menu } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getGreeting } from '@/lib/utils'

interface AppHeaderProps {
  onOpenMobileDrawer?: () => void
}

export default function AppHeader({ onOpenMobileDrawer }: AppHeaderProps) {
  const { profile } = useAuth()
  const name = profile?.display_name?.split(' ')[0] ?? profile?.username ?? 'Builder'

  return (
    <header style={{
      height: 72,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      width: '100%',
    }}>
      {/* Left: Mobile Hamburger & Greeting */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Mobile Hamburger Button */}
        <button
          onClick={onOpenMobileDrawer}
          className="btn-ghost btn-icon md:hidden"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-btn)',
            width: 40,
            height: 40,
            cursor: 'pointer',
          }}
          aria-label="Open Navigation Menu"
        >
          <Menu size={20} color="var(--text-primary)" />
        </button>

        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            {getGreeting()}, {name}! 👋
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            Let&apos;s make today count and build your best life.
          </p>
        </div>
      </div>

      {/* Right: Search, Notifications, Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Search Bar */}
        <div style={{ position: 'relative', width: 240 }} className="hidden sm:block">
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search anything..."
            style={{
              paddingLeft: 36,
              height: 38,
              fontSize: 13,
              borderRadius: 'var(--radius-btn)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
            }}
          />
        </div>

        {/* Search Icon button for small screens */}
        <button className="btn-ghost btn-icon sm:hidden" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', width: 38, height: 38 }}>
          <Search size={18} color="var(--text-secondary)" />
        </button>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button className="btn-ghost btn-icon" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', width: 38, height: 38, position: 'relative' }}>
            <Bell size={18} color="var(--text-secondary)" />
            <span style={{
              position: 'absolute',
              top: 4,
              right: 4,
              background: '#EF4444',
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: 700,
              width: 16,
              height: 16,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--surface)',
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
            background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 700,
            overflow: 'hidden',
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
            border: '2px solid var(--surface)',
          }} />
        </div>
      </div>
    </header>
  )
}
