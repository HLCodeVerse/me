'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Home, CheckSquare, BookOpen, Brain, Compass
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',  icon: Home,        label: 'Home'    },
  { href: '/tasks',      icon: CheckSquare, label: 'Tasks'   },
  { href: '/journal',    icon: BookOpen,    label: 'Journal' },
  { href: '/learn',      icon: Compass,     label: 'Learn'   },
  { href: '/ai',         icon: Brain,       label: 'AI'      },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav glass">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        height: '72px',
        padding: '0 8px',
      }}>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                transition: 'all 200ms var(--ease-smooth)',
                color: active ? 'var(--growth)' : 'var(--text-dim)',
                textDecoration: 'none',
                minWidth: '56px',
                position: 'relative',
              }}
            >
              {active && (
                <span style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '24px',
                  height: '2px',
                  background: 'var(--growth)',
                  borderRadius: '0 0 4px 4px',
                  boxShadow: 'var(--glow-growth)',
                }} />
              )}
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{
                fontSize: '10px',
                fontWeight: active ? 700 : 500,
                letterSpacing: '0.02em',
              }}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
