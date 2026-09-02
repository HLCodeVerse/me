'use client'

import { Sparkles } from 'lucide-react'

interface AIActionButtonProps {
  label: string
  onClick?: () => void
  size?: 'sm' | 'md'
  fullWidth?: boolean
}

export default function AIActionButton({ label, onClick, size = 'md', fullWidth = false }: AIActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="btn btn-ai"
      style={{
        fontSize: size === 'sm' ? 12 : 13,
        padding: size === 'sm' ? '6px 12px' : '8px 16px',
        gap: 6,
        width: fullWidth ? '100%' : 'auto',
      }}
    >
      <Sparkles size={size === 'sm' ? 13 : 15} />
      {label}
    </button>
  )
}

interface AIInsightCardProps {
  title?: string
  content: string
  onAction?: () => void
  actionLabel?: string
  isLoading?: boolean
}

export function AIInsightCard({ title = 'AI Insight', content, onAction, actionLabel, isLoading }: AIInsightCardProps) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(124,58,237,0.1) 100%)',
      border: '1px solid rgba(124,58,237,0.25)',
      borderRadius: 16,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{
          width: 24,
          height: 24,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #6366F1, #7C3AED)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Sparkles size={13} color="#FFFFFF" />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#8B5CF6' }}>{title}</span>
      </div>
      {isLoading ? (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#7C3AED',
                animation: `aiPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{content}</p>
      )}
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#8B5CF6',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            padding: 0,
            textDecoration: 'underline',
            textDecorationColor: 'rgba(139,92,246,0.4)',
          }}
        >
          {actionLabel} →
        </button>
      )}
    </div>
  )
}
