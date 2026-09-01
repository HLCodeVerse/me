'use client'

import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'

export default function SplashScreen({ onFinish }: { onFinish?: () => void }) {
  const [isVisible, setIsVisible] = useState(true)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('Initializing NIRMAAN OS...')

  useEffect(() => {
    // Progress bar animation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => {
            setIsVisible(false)
            if (onFinish) onFinish()
          }, 300)
          return 100
        }
        if (prev === 30) setStatusText('Syncing AI & MCP Tools...')
        if (prev === 70) setStatusText('Preparing Personal OS Workspaces...')
        if (prev === 90) setStatusText('Ready!')
        return prev + 10
      })
    }, 80)

    return () => clearInterval(interval)
  }, [onFinish])

  if (!isVisible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#0A0B0D',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        transition: 'opacity 0.4s ease-out, transform 0.4s ease-out',
        opacity: progress === 100 ? 0 : 1,
        pointerEvents: progress === 100 ? 'none' : 'auto',
      }}
    >
      {/* Background Radial Glow */}
      <div
        style={{
          position: 'absolute',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.25) 0%, rgba(245, 158, 11, 0.05) 70%, transparent 100%)',
          filter: 'blur(40px)',
          animation: 'pulse 2s infinite ease-in-out',
        }}
      />

      {/* Center Animated Logo Emblem */}
      <div style={{ position: 'relative', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: 28,
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(124, 58, 237, 0.45)',
            border: '2px solid rgba(124, 58, 237, 0.5)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-512.png" alt="NIRMAAN Icon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>

      {/* Brand Title */}
      <h1
        style={{
          fontSize: 26,
          fontWeight: 900,
          color: '#FFFFFF',
          margin: '0 0 6px',
          letterSpacing: '0.04em',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        NIRMAAN <Sparkles size={20} color="#F59E0B" />
      </h1>
      <p style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 32px', fontWeight: 500 }}>
        Personal Reconstruction & Productivity OS
      </p>

      {/* Progress Bar Container */}
      <div style={{ width: '100%', maxWidth: 260, position: 'relative' }}>
        <div
          style={{
            width: '100%',
            height: 4,
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 99,
            overflow: 'hidden',
            marginBottom: 10,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #7C3AED, #3B82F6, #F59E0B)',
              borderRadius: 99,
              transition: 'width 0.1s linear',
            }}
          />
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)', margin: 0, textAlign: 'center', fontWeight: 600 }}>
          {statusText}
        </p>
      </div>
    </div>
  )
}
