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
  // Compact SVG diameter
  const size = 76
  const strokeWidth = 7
  const center = size / 2
  const radius = center - strokeWidth / 2
  const circumference = 2 * Math.PI * radius
  const clampedPercent = Math.min(100, Math.max(0, percentage))
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference

  const getBadgeStyle = () => {
    switch (badgeVariant) {
      case 'success':
        return { background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)' }
      case 'danger':
        return { background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)' }
      default:
        return { background: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4', border: '1px solid rgba(6, 182, 212, 0.3)' }
    }
  }

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, rgba(20, 22, 29, 0.9) 0%, rgba(5, 5, 5, 0.95) 100%)',
        border: '1px solid rgba(6, 182, 212, 0.2)',
        borderRadius: 16,
        padding: '12px 10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(12px)',
        position: 'relative',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      {/* Glow Effect */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: colorStart,
          opacity: 0.08,
          filter: 'blur(24px)',
          pointerEvents: 'none',
        }}
      />

      {/* Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: `${colorStart}22`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colorStart,
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </span>
        </div>
        {badgeText && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: 99,
              whiteSpace: 'nowrap',
              ...getBadgeStyle(),
            }}
          >
            {badgeText}
          </span>
        )}
      </div>

      {/* SVG Level Line Ring */}
      <div style={{ position: 'relative', width: size, height: size, margin: '6px 0' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorStart} />
              <stop offset="100%" stopColor={colorEnd} />
            </linearGradient>
          </defs>
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
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

        {/* Center Percentage Label */}
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
          <span style={{ fontSize: 16, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
            {clampedPercent}%
          </span>
          <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            {label}
          </span>
        </div>
      </div>

      {/* Subtitle */}
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
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
  let negligenceBadge = 'Low'
  let negligenceVariant: 'success' | 'warning' | 'danger' = 'success'
  if (negligencePercent > 40) {
    negligenceBadge = 'Critical'
    negligenceVariant = 'danger'
  } else if (negligencePercent > 15) {
    negligenceBadge = 'Attention'
    negligenceVariant = 'danger'
  }

  let consistencyBadge = 'Building'
  let consistencyVariant: 'success' | 'warning' | 'info' = 'info'
  if (consistencyPercent >= 75) {
    consistencyBadge = 'Streak 🔥'
    consistencyVariant = 'success'
  } else if (consistencyPercent >= 40) {
    consistencyBadge = 'On Track'
    consistencyVariant = 'info'
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 10,
        width: '100%',
      }}
      className="md:grid-cols-4"
    >
      {/* 1. Consistency Level Line Ring (Green) */}
      <SingleGaugeRing
        title="Consistency"
        percentage={consistencyPercent}
        label="Streak"
        subtitle={`${streakCount}d Streak`}
        gradientId="consistencyGrad"
        colorStart="#10B981"
        colorEnd="#34D399"
        icon={<Flame size={14} color="#10B981" />}
        badgeText={consistencyBadge}
        badgeVariant={consistencyVariant}
      />

      {/* 2. Productivity Level Line Ring (Cyan) */}
      <SingleGaugeRing
        title="Productivity"
        percentage={productivityPercent}
        label="Ratio"
        subtitle={`${completedCount}/${totalItems} Done`}
        gradientId="productivityGrad"
        colorStart="#06B6D4"
        colorEnd="#22D3EE"
        icon={<TrendingUp size={14} color="#06B6D4" />}
        badgeText={productivityPercent >= 70 ? 'Focus ⚡' : 'Active'}
        badgeVariant={productivityPercent >= 70 ? 'success' : 'info'}
      />

      {/* 3. Negligence Rate Gauge Ring (Red) */}
      <SingleGaugeRing
        title="Negligence"
        percentage={negligencePercent}
        label="Overdue"
        subtitle={overdueCount > 0 ? `${overdueCount} Overdue` : 'Zero Overdue'}
        gradientId="negligenceGrad"
        colorStart="#EF4444"
        colorEnd="#F87171"
        icon={overdueCount > 0 ? <AlertTriangle size={14} color="#EF4444" /> : <ShieldAlert size={14} color="#EF4444" />}
        badgeText={negligenceBadge}
        badgeVariant={negligenceVariant}
      />

      {/* 4. Life Balance & Score Ring (Cyan-Green) */}
      <SingleGaugeRing
        title="Life Score"
        percentage={lifeScorePercent}
        label="Balance"
        subtitle="Harmony"
        gradientId="lifeScoreGrad"
        colorStart="#06B6D4"
        colorEnd="#10B981"
        icon={<Target size={14} color="#06B6D4" />}
        badgeText={lifeScorePercent >= 80 ? 'Mastery 🌟' : 'Balanced'}
        badgeVariant={lifeScorePercent >= 80 ? 'success' : 'info'}
      />
    </div>
  )
}
