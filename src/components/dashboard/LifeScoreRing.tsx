'use client'

import { useEffect, useState } from 'react'

interface LifeScoreRingProps {
  score: number // 0–100
  size?: number
  strokeWidth?: number
}

export default function LifeScoreRing({ score, size = 180, strokeWidth = 10 }: LifeScoreRingProps) {
  const [animated, setAnimated] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animated / 100) * circumference

  const getColor = (s: number) => {
    if (s >= 80) return '#34D399'
    if (s >= 60) return '#60A5FA'
    if (s >= 40) return '#F59E0B'
    return '#EF4444'
  }

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(score), 200)
    return () => clearTimeout(timer)
  }, [score])

  const color = getColor(score)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="life-score-ring"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        {/* Glow ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeOpacity={0.15}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1), stroke 500ms ease' }}
        />
      </svg>

      {/* Center content */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}>
        <span style={{
          fontSize: size * 0.22,
          fontWeight: 800,
          color,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          transition: 'color 500ms ease',
        }}>
          {Math.round(animated)}
        </span>
        <span style={{
          fontSize: size * 0.085,
          color: 'var(--text-muted)',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          Life Score
        </span>
      </div>
    </div>
  )
}
