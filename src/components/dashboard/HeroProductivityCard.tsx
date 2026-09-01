'use client'

import { useEffect, useState } from 'react'
import { Flame } from 'lucide-react'

interface HeroProductivityCardProps {
  score?: number
  streak?: number
  careerScore?: number
  healthScore?: number
  focusScore?: number
}

export default function HeroProductivityCard({
  score = 85,
  streak = 7,
  careerScore = 78,
  healthScore = 85,
  focusScore = 70,
}: HeroProductivityCardProps) {
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 150)
    return () => clearTimeout(timer)
  }, [score])

  // Circular Ring SVG math
  const ringSize = 130
  const strokeWidth = 10
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeOffset = circumference - (animatedScore / 100) * circumference

  return (
    <div className="hero-card" style={{
      padding: '24px 28px',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    }}>
      {/* Background Graphic Mountain/Landscape Accent */}
      <svg
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          height: '100%',
          opacity: 0.15,
          pointerEvents: 'none',
        }}
        viewBox="0 0 500 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M250 50L350 200H150L250 50Z" fill="white" />
        <path d="M380 90L480 200H280L380 90Z" fill="white" />
        <circle cx="420" cy="50" r="16" fill="#F59E0B" />
      </svg>

      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 24,
        position: 'relative',
        zIndex: 2,
      }}>

        {/* Left: Productivity Ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', width: ringSize, height: ringSize }}>
            <svg
              width={ringSize}
              height={ringSize}
              viewBox={`0 0 ${ringSize} ${ringSize}`}
              style={{ transform: 'rotate(-90deg)' }}
            >
              {/* Background Track */}
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth={strokeWidth}
              />
              {/* Animated Progress Circle */}
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke="#F59E0B"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </svg>

            {/* Inner Ring Score */}
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                {Math.round(animatedScore)}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>
                LIFE SCORE
              </span>
            </div>
          </div>

          {/* Footer status chip */}
          <span style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            padding: '4px 12px',
            borderRadius: 99,
            fontSize: 12,
            fontWeight: 600,
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}>
            Great Progress! 🚀
          </span>
        </div>

        {/* Right: Overview Metrics */}
        <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              Productivity Overview
            </h3>
            {/* Streak Chip */}
            <span style={{
              background: 'rgba(255, 255, 255, 0.18)',
              padding: '4px 12px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 600,
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              {streak} day streak <Flame size={14} fill="#F59E0B" color="#F59E0B" />
            </span>
          </div>

          {/* Metric Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Career Row */}
            <MetricRow label="Career" score={careerScore} color="#60A5FA" />
            {/* Health Row */}
            <MetricRow label="Health" score={healthScore} color="#34D399" />
            {/* Focus Row */}
            <MetricRow label="Focus" score={focusScore} color="#FBBF24" />
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricRow({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500, width: 56 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 6, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          width: `${score}%`,
          height: '100%',
          background: color,
          borderRadius: 99,
          transition: 'width 800ms ease-out',
        }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', width: 44, textAlign: 'right' }}>
        {score} /100
      </span>
    </div>
  )
}
