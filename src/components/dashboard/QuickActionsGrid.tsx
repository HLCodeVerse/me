'use client'

import Link from 'next/link'
import { PlusSquare, CheckSquare, FileText, HeartPulse } from 'lucide-react'

export default function QuickActionsGrid() {
  const actions = [
    { label: 'Add Task',   href: '/tasks',   icon: PlusSquare, strokeColor: '#7C3AED', bgColor: 'rgba(124, 58, 237, 0.08)', borderColor: 'rgba(124, 58, 237, 0.2)' },
    { label: 'Add Todo',   href: '/todos',   icon: CheckSquare, strokeColor: '#10B981', bgColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.2)' },
    { label: 'New Note',   href: '/notes',   icon: FileText,   strokeColor: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.2)' },
    { label: 'Log Health', href: '/health',  icon: HeartPulse, strokeColor: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.08)',  borderColor: 'rgba(239, 68, 68, 0.2)' },
  ]

  return (
    <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
        Quick Actions
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {actions.map(({ label, href, icon: Icon, strokeColor, bgColor, borderColor }) => (
          <Link
            key={label}
            href={href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 'var(--radius-btn)',
              background: bgColor,
              border: `1px solid ${borderColor}`,
              textDecoration: 'none',
              transition: 'transform 150ms ease, box-shadow 150ms ease',
            }}
            className="hover:scale-[1.02]"
          >
            <Icon size={18} color={strokeColor} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
