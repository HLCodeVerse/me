'use client'

import { Flame } from 'lucide-react'

interface StreakBadgeProps {
  count: number
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function StreakBadge({ count, label = 'day streak', size = 'md' }: StreakBadgeProps) {
  const sizes = {
    sm: { icon: 14, text: 12, countFont: 16, padding: '6px 10px', gap: 4 },
    md: { icon: 18, text: 13, countFont: 22, padding: '10px 14px', gap: 6 },
    lg: { icon: 24, text: 15, countFont: 30, padding: '14px 20px', gap: 8 },
  }
  const s = sizes[size]
  const isActive = count > 0

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: s.gap,
      padding: s.padding,
      background: isActive ? 'rgba(245, 158, 11, 0.1)' : 'var(--surface-2)',
      border: `1px solid ${isActive ? 'rgba(245, 158, 11, 0.3)' : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
      boxShadow: isActive ? '0 0 20px rgba(245, 158, 11, 0.1)' : 'none',
    }}>
      <span
        className={isActive ? 'animate-flame' : ''}
        style={{ display: 'flex', alignItems: 'center' }}
      >
        <Flame
          size={s.icon}
          fill={isActive ? '#F59E0B' : 'none'}
          stroke={isActive ? '#F59E0B' : 'var(--text-dim)'}
          strokeWidth={isActive ? 0 : 1.8}
        />
      </span>
      <div>
        <span style={{
          fontSize: s.countFont,
          fontWeight: 800,
          color: isActive ? '#F59E0B' : 'var(--text-muted)',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {count}
        </span>
        <span style={{
          fontSize: s.text,
          color: isActive ? 'rgba(245, 158, 11, 0.7)' : 'var(--text-dim)',
          marginLeft: 4,
          fontWeight: 500,
        }}>
          {label}
        </span>
      </div>
    </div>
  )
}
