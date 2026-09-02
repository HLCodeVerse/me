'use client'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: { label: string; onClick: () => void }
  aiAction?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon, title, description, action, aiAction }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
      gap: 16,
    }}>
      {icon && (
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: 'rgba(124,58,237,0.1)',
          border: '1px solid rgba(124,58,237,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {icon}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 320 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>{description}</p>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {action && (
          <button className="btn btn-primary" onClick={action.onClick} style={{ fontSize: 13 }}>
            {action.label}
          </button>
        )}
        {aiAction && (
          <button className="btn btn-ai" onClick={aiAction.onClick} style={{ fontSize: 13 }}>
            ✨ {aiAction.label}
          </button>
        )}
      </div>
    </div>
  )
}
