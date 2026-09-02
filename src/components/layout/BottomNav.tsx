'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CheckSquare, Flame, Bot, MoreHorizontal,
} from 'lucide-react'

const QUICK_NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home',   color: '#7C3AED' },
  { href: '/tasks',     icon: CheckSquare,     label: 'Tasks',  color: '#3B82F6' },
  { href: '/habits',    icon: Flame,           label: 'Habits', color: '#FF4F81' },
  { href: '/ai',        icon: Bot,             label: 'AI',     color: '#8B5CF6' },
]

interface BottomNavProps {
  onOpenDrawer?: () => void
}

export default function BottomNav({ onOpenDrawer }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="lg:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 68,
        background: 'rgba(8, 17, 38, 0.95)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(124, 58, 237, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 50,
        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.7)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 8,
        paddingRight: 8,
      }}
    >
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
              padding: '6px 16px',
              borderRadius: 14,
              textDecoration: 'none',
              position: 'relative',
              transition: 'all 150ms ease',
              flex: 1,
            }}
          >
            {/* Active background glow */}
            {isActive && (
              <div style={{
                position: 'absolute',
                top: 2,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 40,
                height: 32,
                borderRadius: 10,
                background: `rgba(${colorToRgb(color)}, 0.15)`,
                border: `1px solid rgba(${colorToRgb(color)}, 0.3)`,
              }} />
            )}
            <Icon
              size={20}
              color={isActive ? color : 'var(--text-muted)'}
              style={{ position: 'relative', zIndex: 1 }}
            />
            <span style={{
              fontSize: 10,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? color : 'var(--text-muted)',
              position: 'relative',
              zIndex: 1,
              letterSpacing: '0.01em',
            }}>
              {label}
            </span>
          </Link>
        )
      })}

      {/* More Button */}
      <button
        onClick={onOpenDrawer}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          padding: '6px 16px',
          borderRadius: 14,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          flex: 1,
          transition: 'all 150ms ease',
        }}
      >
        <MoreHorizontal size={20} color="var(--text-muted)" />
        <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)' }}>More</span>
      </button>
    </nav>
  )
}

function colorToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '124, 58, 237'
}
