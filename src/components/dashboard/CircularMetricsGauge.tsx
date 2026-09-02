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
  // Compact SVG diameter for mobile alignment
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
          <span style={{ fontSize: 11.5, fontWeight: 800, color: '#F3F4F6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
          <span style={{ fontSize: 8, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
            {label}
          </span>
        </div>
      </div>

      {/* Subtitle */}
      <div style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
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
    negligenceVariant = 'warning'
  }

  let consistencyBadge = 'Building'
  let consistencyVariant: 'success' | 'warning' | 'info' = 'info'
  if (consistencyPercent >= 75) {
    consistencyBadge = 'Streak 🔥'
    consistencyVariant = 'success'
  } else if (consistencyPercent >= 40) {
    consistencyBadge = 'On Track'
    consistencyVariant = 'warning'
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
      {/* 1. Consistency Level Line Ring */}
      <SingleGaugeRing
        title="Consistency"
        percentage={consistencyPercent}
        label="Streak"
        subtitle={`${streakCount}d Streak`}
        gradientId="consistencyGrad"
        colorStart="#10B981"
        colorEnd="#059669"
        icon={<Flame size={14} />}
        badgeText={consistencyBadge}
        badgeVariant={consistencyVariant}
      />

      {/* 2. Productivity Level Line Ring */}
      <SingleGaugeRing
        title="Productivity"
        percentage={productivityPercent}
        label="Ratio"
        subtitle={`${completedCount}/${totalItems} Done`}
        gradientId="productivityGrad"
        colorStart="#3B82F6"
        colorEnd="#06B6D4"
        icon={<TrendingUp size={14} />}
        badgeText={productivityPercent >= 70 ? 'Focus ⚡' : 'Active'}
        badgeVariant={productivityPercent >= 70 ? 'success' : 'info'}
      />

      {/* 3. Negligence Rate Gauge Ring */}
      <SingleGaugeRing
        title="Negligence"
        percentage={negligencePercent}
        label="Overdue"
        subtitle={overdueCount > 0 ? `${overdueCount} Overdue` : 'Zero Overdue'}
        gradientId="negligenceGrad"
        colorStart={negligencePercent > 20 ? '#F43F5E' : '#F59E0B'}
        colorEnd={negligencePercent > 20 ? '#E11D48' : '#D97706'}
        icon={overdueCount > 0 ? <AlertTriangle size={14} /> : <ShieldAlert size={14} />}
        badgeText={negligenceBadge}
        badgeVariant={negligenceVariant}
      />

      {/* 4. Life Balance & Score Ring */}
      <SingleGaugeRing
        title="Life Score"
        percentage={lifeScorePercent}
        label="Balance"
        subtitle="Harmony"
        gradientId="lifeScoreGrad"
        colorStart="#8B5CF6"
        colorEnd="#EC4899"
        icon={<Target size={14} />}
        badgeText={lifeScorePercent >= 80 ? 'Mastery 🌟' : 'Balanced'}
        badgeVariant={lifeScorePercent >= 80 ? 'success' : 'info'}
      />
    </div>
  )
}
