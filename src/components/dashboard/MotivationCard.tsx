'use client'

import { Quote } from 'lucide-react'

export default function MotivationCard() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
      borderRadius: 'var(--radius-card)',
      padding: '24px',
      color: '#FFFFFF',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-hero)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      minHeight: 150,
    }}>
      {/* Background Sun/Mountain Graphic */}
      <svg
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          height: '100%',
          opacity: 0.3,
          pointerEvents: 'none',
        }}
        viewBox="0 0 200 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="160" cy="90" r="30" fill="#F59E0B" />
        <path d="M80 150L140 70L200 150H80Z" fill="#4338CA" />
      </svg>

      <div style={{ position: 'relative', zIndex: 2 }}>
        <Quote size={24} color="#A5B4FC" style={{ marginBottom: 8, opacity: 0.8 }} />
        <p style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4, color: '#FFFFFF', margin: 0 }}>
          Discipline today, Success tomorrow.
        </p>
        <p style={{ fontSize: 13, color: '#C7D2FE', marginTop: 4, fontWeight: 500 }}>
          You&apos;ve got this! 💪
        </p>
      </div>
    </div>
  )
}
