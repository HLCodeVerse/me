'use client'

import { Sparkles, Loader2 } from 'lucide-react'

interface AIDailyBriefCardProps {
  summary?: string | null
  loading?: boolean
  onGenerate?: () => void
}

export default function AIDailyBriefCard({
  summary,
  loading = false,
  onGenerate,
}: AIDailyBriefCardProps) {
  const defaultSummary = summary || "You have 5 tasks due today. Focus on MySQL practice and English prepositions. Your productivity is at 85% — keep it up! 💪"

  return (
    <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'rgba(124, 58, 237, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Sparkles size={18} color="#7C3AED" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            AI Daily Brief
          </h3>
        </div>

        <button
          onClick={onGenerate}
          disabled={loading}
          className="btn btn-primary"
          style={{ padding: '8px 16px', fontSize: 13 }}
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Generate New Brief
            </>
          )}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <p style={{ flex: 1, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          {defaultSummary}
        </p>

        {/* Small AI Assistant Vector Illustration */}
        <div className="hidden sm:block" style={{ flexShrink: 0 }}>
          <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="20" fill="#F1F4F9" />
            <circle cx="50" cy="40" r="18" fill="#7C3AED" />
            <circle cx="44" cy="38" r="3" fill="white" />
            <circle cx="56" cy="38" r="3" fill="white" />
            <path d="M44 46C46 48 54 48 56 46" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <rect x="30" y="64" width="40" height="20" rx="6" fill="#3B82F6" />
          </svg>
        </div>
      </div>
    </div>
  )
}
