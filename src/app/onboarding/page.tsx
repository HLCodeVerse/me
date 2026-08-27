'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Zap, Target, BookOpen, Brain, ArrowRight } from 'lucide-react'

const slides = [
  {
    icon: '🔥',
    tag: 'निर्माण',
    title: 'Rebuild from\nthe inside out.',
    body: 'Not a todo app. Not a habit tracker. NIRMAAN is your personal operating system for radical self-reconstruction — skill by skill, day by day.',
    accent: 'var(--growth)',
  },
  {
    icon: '⚡',
    tag: 'Everything in one place',
    title: 'Tasks. Journal.\nLessons. AI.',
    body: 'Structure your goals, capture your thoughts, track your learning, and let AI help you plan your day — all wired together.',
    accent: 'var(--focus)',
    features: [
      { icon: Target,   label: 'Goal-linked tasks with sub-tasks' },
      { icon: BookOpen, label: 'Prompted journal with AI reflection' },
      { icon: Zap,      label: 'Structured learning paths' },
      { icon: Brain,    label: 'BYOK AI companion (OpenRouter)' },
    ],
  },
  {
    icon: '🌱',
    tag: 'Your score. Your streak.',
    title: 'Watch yourself\nbeing rebuilt.',
    body: 'Your Life Score tracks real progress across all areas. Streaks keep you consistent. The AI briefs you every morning. Start today.',
    accent: 'var(--purple)',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [animating, setAnimating] = useState(false)

  const slide = slides[current]
  const isLast = current === slides.length - 1

  function next() {
    if (animating) return
    if (isLast) {
      router.push('/auth')
      return
    }
    setAnimating(true)
    setTimeout(() => {
      setCurrent(c => c + 1)
      setAnimating(false)
    }, 200)
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background gradient orbs */}
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${slide.accent}20, transparent 70%)`,
        top: -100,
        right: -100,
        transition: 'background 600ms ease',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${slide.accent}10, transparent 70%)`,
        bottom: 100,
        left: -80,
        transition: 'background 600ms ease',
        pointerEvents: 'none',
      }} />

      {/* Skip button */}
      <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => router.push('/auth')}
          style={{
            color: 'var(--text-dim)',
            fontSize: 14,
            fontWeight: 500,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 12px',
          }}
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div
        key={current}
        className="animate-fade-up"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 28px',
          gap: 24,
          opacity: animating ? 0 : 1,
          transition: 'opacity 200ms ease',
        }}
      >
        {/* Emoji */}
        <div style={{ fontSize: 64, lineHeight: 1 }}>{slide.icon}</div>

        {/* Tag */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 12px',
          borderRadius: 99,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          background: `${slide.accent}20`,
          color: slide.accent,
          width: 'fit-content',
        }}>
          {slide.tag}
        </span>

        {/* Title */}
        <h1 style={{
          fontSize: 38,
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          color: 'var(--text)',
          whiteSpace: 'pre-line',
        }}>
          {slide.title}
        </h1>

        {/* Body */}
        <p style={{
          fontSize: 16,
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          maxWidth: 340,
        }}>
          {slide.body}
        </p>

        {/* Features (slide 2 only) */}
        {slide.features && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {slide.features.map(({ icon: Icon, label }, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <Icon size={16} color={slide.accent} />
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div style={{
        padding: '24px 28px',
        paddingBottom: 'calc(32px + env(safe-area-inset-bottom))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Dots */}
        <div style={{ display: 'flex', gap: 6 }}>
          {slides.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === current ? 24 : 6,
                height: 6,
                borderRadius: 99,
                background: i === current ? slide.accent : 'var(--border-2)',
                transition: 'all 300ms var(--ease-spring)',
              }}
            />
          ))}
        </div>

        {/* Next / Get started */}
        <button
          onClick={next}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '14px 24px',
            borderRadius: 'var(--radius)',
            background: slide.accent,
            color: '#0A0B0D',
            fontSize: 15,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 200ms ease',
            boxShadow: `0 0 24px ${slide.accent}40`,
          }}
        >
          {isLast ? 'Get Started' : 'Next'}
          {isLast ? <ArrowRight size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  )
}
