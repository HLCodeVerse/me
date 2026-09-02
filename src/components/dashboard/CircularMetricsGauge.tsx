'use client'

import React from 'react'
import { Flame, ShieldAlert, Target, TrendingUp, AlertTriangle } from 'lucide-react'

export interface CircularMetricProps {
  productivityPercent: number
  consistencyPercent: number
  negligencePercent: number
  lifeScorePercent: number
  overdueCount: number
  completedCount: number
  totalItems: number
  streakCount: number
}

interface SingleGaugeProps {
  title: string
  percentage: number
  label: string
  subtitle: string
  gradientId: string
  colorStart: string
  colorEnd: string
  icon: React.ReactNode
  badgeText?: string
  badgeVariant?: 'success' | 'warning' | 'danger' | 'info'
  invertWarning?: boolean
}

function SingleGaugeRing({
  title,
  percentage,
  label,
  subtitle,
  gradientId,
  colorStart,
  colorEnd,
  icon,
  badgeText,
  badgeVariant = 'info',
}: SingleGaugeProps) {
  const size = 110
  const strokeWidth = 10
  const center = size / 2
  const radius = center - strokeWidth / 2
  const circumference = 2 * Math.PI * radius
  const clampedPercent = Math.min(100, Math.max(0, percentage))
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference

  const getBadgeStyle = () => {
    switch (badgeVariant) {
      case 'success':
        return { background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.3)' }
      case 'warning':
        return { background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.3)' }
      case 'danger':
        return { background: 'rgba(244, 63, 94, 0.15)', color: '#FB7185', border: '1px solid rgba(244, 63, 94, 0.3)' }
      default:
        return { background: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: '1px solid rgba(59, 130, 246, 0.3)' }
    }
  }

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, rgba(18, 19, 24, 0.9) 0%, rgba(10, 11, 13, 0.95) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 20,
        padding: '18px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(12px)',
        transition: 'transform 0.2s ease, border-color 0.2s ease',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = colorStart)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)')}
    >
      {/* Background Glow Effect */}
      <div
        style={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: colorStart,
          opacity: 0.08,
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: `${colorStart}22`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colorStart,
            }}
          >
            {icon}
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#F3F4F6', letterSpacing: '-0.01em' }}>
            {title}
          </span>
        </div>
        {badgeText && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 99,
              ...getBadgeStyle(),
            }}
          >
            {badgeText}
          </span>
        )}
      </div>

      {/* Circular SVG Ring */}
      <div style={{ position: 'relative', width: size, height: size, margin: '8px 0' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorStart} />
              <stop offset="100%" stopColor={colorEnd} />
            </linearGradient>
          </defs>
          {/* Track Circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Level Line Progress Circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>

        {/* Center Label */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 21, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.03em' }}>
            {clampedPercent}%
          </span>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
            {label}
          </span>
        </div>
      </div>

      {/* Subtitle Footer */}
      <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', fontWeight: 500, marginTop: 4 }}>
        {subtitle}
      </div>
    </div>
  )
}

export default function CircularMetricsGauge({
  productivityPercent,
  consistencyPercent,
  negligencePercent,
  lifeScorePercent,
  overdueCount,
  completedCount,
  totalItems,
  streakCount,
}: CircularMetricProps) {
  // Determine Negligence Badge State
  let negligenceBadge = 'Low'
  let negligenceVariant: 'success' | 'warning' | 'danger' = 'success'
  if (negligencePercent > 40) {
    negligenceBadge = 'High Critical'
    negligenceVariant = 'danger'
  } else if (negligencePercent > 15) {
    negligenceBadge = 'Attention Needed'
    negligenceVariant = 'warning'
  }

  // Consistency Badge State
  let consistencyBadge = 'Building'
  let consistencyVariant: 'success' | 'warning' | 'info' = 'info'
  if (consistencyPercent >= 75) {
    consistencyBadge = 'Unstoppable 🔥'
    consistencyVariant = 'success'
  } else if (consistencyPercent >= 40) {
    consistencyBadge = 'On Track 👍'
    consistencyVariant = 'warning'
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 14,
        width: '100%',
      }}
    >
      {/* 1. Consistency Level Line Ring */}
      <SingleGaugeRing
        title="Consistency Index"
        percentage={consistencyPercent}
        label="Habit Streak"
        subtitle={`${streakCount} Days Streak • Habit Check-ins`}
        gradientId="consistencyGrad"
        colorStart="#10B981"
        colorEnd="#059669"
        icon={<Flame size={16} />}
        badgeText={consistencyBadge}
        badgeVariant={consistencyVariant}
      />

      {/* 2. Productivity Level Line Ring */}
      <SingleGaugeRing
        title="Productivity Level"
        percentage={productivityPercent}
        label="Done Ratio"
        subtitle={`${completedCount} of ${totalItems} tasks completed`}
        gradientId="productivityGrad"
        colorStart="#3B82F6"
        colorEnd="#06B6D4"
        icon={<TrendingUp size={16} />}
        badgeText={productivityPercent >= 70 ? 'High Focus ⚡' : 'In Motion'}
        badgeVariant={productivityPercent >= 70 ? 'success' : 'info'}
      />

      {/* 3. Negligence Rate Gauge Ring */}
      <SingleGaugeRing
        title="Negligence Rate"
        percentage={negligencePercent}
        label="Overdue Rate"
        subtitle={overdueCount > 0 ? `${overdueCount} items past due date!` : 'Zero overdue items today!'}
        gradientId="negligenceGrad"
        colorStart={negligencePercent > 20 ? '#F43F5E' : '#F59E0B'}
        colorEnd={negligencePercent > 20 ? '#E11D48' : '#D97706'}
        icon={overdueCount > 0 ? <AlertTriangle size={16} /> : <ShieldAlert size={16} />}
        badgeText={negligenceBadge}
        badgeVariant={negligenceVariant}
      />

      {/* 4. Life Balance & Score Ring */}
      <SingleGaugeRing
        title="Life Balance Score"
        percentage={lifeScorePercent}
        label="Harmony"
        subtitle="Across Goals, Health & Reflection"
        gradientId="lifeScoreGrad"
        colorStart="#8B5CF6"
        colorEnd="#EC4899"
        icon={<Target size={16} />}
        badgeText={lifeScorePercent >= 80 ? 'Mastery 🌟' : 'Balanced'}
        badgeVariant={lifeScorePercent >= 80 ? 'success' : 'info'}
      />
    </div>
  )
}
