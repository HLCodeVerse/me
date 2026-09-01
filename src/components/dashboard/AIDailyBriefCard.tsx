'use client'

import { Sparkles, Loader2 } from 'lucide-react'
import FormattedAIResponse from '@/components/common/FormattedAIResponse'

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
            background: 'rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(245, 158, 11, 0.3)',
          }}>
            <Sparkles size={18} color="#FFD700" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
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
        <FormattedAIResponse content={defaultSummary} style={{ flex: 1 }} />

        {/* Small AI Assistant Vector Illustration */}
        <div className="hidden sm:block" style={{ flexShrink: 0 }}>
          <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="20" fill="#121318" stroke="rgba(245, 158, 11, 0.3)" />
            <circle cx="50" cy="40" r="18" fill="#F59E0B" />
            <circle cx="44" cy="38" r="3" fill="black" />
            <circle cx="56" cy="38" r="3" fill="black" />
            <path d="M44 46C46 48 54 48 56 46" stroke="black" strokeWidth="2" strokeLinecap="round" />
            <rect x="30" y="64" width="40" height="20" rx="6" fill="#10B981" />
          </svg>
        </div>
      </div>
    </div>
  )
}

