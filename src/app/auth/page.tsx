'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  Phone, Lock, ArrowRight, Loader2, User, Zap, Eye, EyeOff,
  ShieldCheck, Sparkles, CheckCircle2, Flame, Bot, Target, Activity, Star
} from 'lucide-react'
import { toast } from 'sonner'
import type { Profile } from '@/lib/supabase/database.types'

type Mode = 'login' | 'signup'

function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get('next')
  const { user, setDirectUser } = useAuth()

  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  // Input Fields
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !redirecting) {
      const target = nextUrl || '/dashboard'
      window.location.href = target
    }
  }, [user, nextUrl, redirecting])

  // Clear stale auth tokens on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('sb-') && k.includes('auth-token')) localStorage.removeItem(k)
        })
      } catch {}
    }
  }, [])

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleanPhone = phone.trim()
    const cleanPass = password.trim()

    if (!cleanPhone || !cleanPass) {
      toast.error('Please enter both mobile number and password')
      return
    }

    setLoading(true)

    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          password: cleanPass,
          displayName: displayName.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Authentication failed')
        if (res.status === 404 && mode === 'login') {
          toast.info('Account not found. Switched to registration mode!')
          setMode('signup')
        }
        setLoading(false)
        return
      }

      if (data.success && data.profile) {
        setRedirecting(true)
        setDirectUser(data.profile as Profile)
        toast.success(mode === 'signup' ? 'Welcome to NIRMAAN OS! 🚀' : 'Welcome back, Builder! ⚡')

        const target = nextUrl || '/dashboard'
        setTimeout(() => {
          window.location.href = target
        }, 150)
      } else {
        toast.error('Unexpected auth response from server')
        setLoading(false)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Authentication network request failed')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#030509',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 20px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#FFFFFF',
    }}>
      {/* Dynamic Animation Keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatOrb1 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(40px, -60px) scale(1.15); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes floatOrb2 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-50px, 50px) scale(1.2); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes shimmerSweep {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes cardFadeUp {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 15px rgba(245, 158, 11, 0.4)); }
          50% { opacity: 1; filter: drop-shadow(0 0 25px rgba(255, 215, 0, 0.8)); }
        }
        .auth-card-wrapper {
          animation: cardFadeUp 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .auth-input-field:focus-within {
          border-color: #F59E0B !important;
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.35) !important;
          background: rgba(18, 19, 24, 0.95) !important;
        }
        .shimmer-btn {
          background: linear-gradient(110deg, #FFD700 0%, #F59E0B 45%, #FFF 50%, #F59E0B 55%, #D97706 100%);
          background-size: 200% 100%;
          transition: all 300ms ease;
        }
        .shimmer-btn:hover {
          animation: shimmerSweep 1.8s infinite;
          box-shadow: 0 8px 30px rgba(245, 158, 11, 0.6);
          transform: translateY(-1px);
        }
      `}} />

      {/* Floating Ambient Glow Orbs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '15%',
        width: 550,
        height: 550,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, rgba(245, 158, 11, 0) 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
        animation: 'floatOrb1 12s ease-in-out infinite',
      }} />

      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '15%',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(239, 68, 68, 0.14) 0%, rgba(239, 68, 68, 0) 70%)',
        filter: 'blur(90px)',
        pointerEvents: 'none',
        animation: 'floatOrb2 14s ease-in-out infinite',
      }} />

      {/* Cyberpunk Grid Mask */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(rgba(245, 158, 11, 0.12) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        pointerEvents: 'none',
      }} />

      {/* Main Container */}
      <div className="auth-card-wrapper" style={{
        width: '100%',
        maxWidth: 1040,
        position: 'relative',
        zIndex: 10,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 32,
        alignItems: 'center',
      }}>

        {/* Left Hero Section (Visible on Tablet/Desktop) */}
        <div className="hidden md:flex" style={{
          flexDirection: 'column',
          gap: 24,
          paddingRight: 20,
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 99,
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#FFD700',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.04em',
              marginBottom: 16,
            }}>
              <Sparkles size={14} color="#FFD700" />
              <span>NEXT-GEN PERSONAL RECONSTRUCTION OS</span>
            </div>

            <h1 style={{
              fontSize: 40,
              fontWeight: 900,
              lineHeight: 1.15,
              margin: 0,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #E4E4E7 50%, #9CA3AF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Master Your Day.<br />
              <span style={{
                background: 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>Rebuild Your Life.</span>
            </h1>

            <p style={{ fontSize: 15, color: '#9CA3AF', marginTop: 14, lineHeight: 1.6, maxWidth: 440 }}>
              NIRMAAN brings your tasks, todos, habits, goals, and AI intelligence into one unified hyper-responsive operating system.
            </p>
          </div>

          {/* Feature Showcase Micro-Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 18px',
              borderRadius: 16,
              background: 'rgba(18, 19, 24, 0.7)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFD700',
              }}>
                <Bot size={20} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>NIRMAAN AI Chat OS</div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>Direct database tool execution & daily briefs</div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 18px',
              borderRadius: 16,
              background: 'rgba(18, 19, 24, 0.7)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10B981',
              }}>
                <Activity size={20} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>Life Score Analytics</div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>Real-time velocity tracking & health scores</div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 18px',
              borderRadius: 16,
              background: 'rgba(18, 19, 24, 0.7)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444',
              }}>
                <Flame size={20} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>Habits & Priority Focus</div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>Streak tracking with zero distraction</div>
              </div>
            </div>
          </div>

          {/* User Trust Banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <div style={{ display: 'flex' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} size={15} fill="#FFD700" color="#FFD700" />
              ))}
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#D1D5DB' }}>
              Engineered for High Performers & Builders
            </span>
          </div>
        </div>

        {/* Right Auth Glassmorphic Card */}
        <div style={{
          background: 'rgba(10, 11, 15, 0.85)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: 28,
          padding: '36px 28px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          position: 'relative',
        }}>

          {/* Top Brand Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              color: '#000000',
              boxShadow: '0 10px 30px rgba(245, 158, 11, 0.5)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
            }}>
              <Zap size={30} fill="#000000" color="#000000" />
            </div>

            <h2 style={{
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: '-0.02em',
              margin: 0,
              color: '#FFFFFF',
            }}>
              NIRMAAN <span style={{ color: '#F59E0B' }}>OS</span>
            </h2>
            <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6, fontWeight: 500 }}>
              {mode === 'login' ? 'Enter your mobile number to sign in' : 'Create your account & unlock personal OS'}
            </p>
          </div>

          {/* Mode Switcher Tabs with Animated Sliding Pill Effect */}
          <div style={{
            display: 'flex',
            background: '#030407',
            borderRadius: 16,
            padding: 5,
            marginBottom: 26,
            border: '1px solid rgba(245, 158, 11, 0.25)',
            position: 'relative',
          }}>
            {(['login', 'signup'] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                  background: mode === m ? 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)' : 'transparent',
                  color: mode === m ? '#000000' : '#9CA3AF',
                  fontSize: 13.5,
                  fontWeight: mode === m ? 800 : 600,
                  transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: mode === m ? '0 4px 16px rgba(245, 158, 11, 0.45)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Auth Form */}
          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {mode === 'signup' && (
              <div>
                <label style={{ fontSize: 11, color: '#F59E0B', fontWeight: 800, marginBottom: 8, display: 'block', letterSpacing: '0.06em' }}>
                  YOUR NAME
                </label>
                <div className="auth-input-field" style={{
                  position: 'relative',
                  borderRadius: 14,
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  background: 'rgba(18, 19, 24, 0.8)',
                  transition: 'all 200ms ease',
                }}>
                  <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#F59E0B' }} />
                  <input
                    type="text"
                    placeholder="e.g. Alex Sharma"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      height: 48,
                      paddingLeft: 44,
                      paddingRight: 14,
                      background: 'transparent',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: 11, color: '#F59E0B', fontWeight: 800, marginBottom: 8, display: 'block', letterSpacing: '0.06em' }}>
                MOBILE NUMBER
              </label>
              <div className="auth-input-field" style={{
                position: 'relative',
                borderRadius: 14,
                border: '1px solid rgba(245, 158, 11, 0.25)',
                background: 'rgba(18, 19, 24, 0.8)',
                transition: 'all 200ms ease',
              }}>
                <Phone size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#F59E0B' }} />
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: 48,
                    paddingLeft: 44,
                    paddingRight: 14,
                    background: 'transparent',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#F59E0B', fontWeight: 800, marginBottom: 8, display: 'block', letterSpacing: '0.06em' }}>
                PASSWORD
              </label>
              <div className="auth-input-field" style={{
                position: 'relative',
                borderRadius: 14,
                border: '1px solid rgba(245, 158, 11, 0.25)',
                background: 'rgba(18, 19, 24, 0.8)',
                transition: 'all 200ms ease',
              }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#F59E0B' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: 48,
                    paddingLeft: 44,
                    paddingRight: 44,
                    background: 'transparent',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9CA3AF',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} color="#FFD700" /> : <Eye size={18} color="#9CA3AF" />}
                </button>
              </div>
            </div>

            {/* Submit Button with Shimmer & Pulse */}
            <button
              type="submit"
              disabled={loading || redirecting}
              className="shimmer-btn"
              style={{
                height: 50,
                marginTop: 6,
                borderRadius: 14,
                border: 'none',
                cursor: 'pointer',
                color: '#000000',
                fontSize: 15,
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                letterSpacing: '0.02em',
                opacity: (loading || redirecting) ? 0.7 : 1,
              }}
            >
              {loading || redirecting ? (
                <>
                  <Loader2 size={20} className="animate-spin" color="#000000" />
                  <span>{redirecting ? 'Entering NIRMAAN OS...' : 'Authenticating...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to Dashboard' : 'Create Free Account'}</span>
                  <ArrowRight size={19} color="#000000" />
                </>
              )}
            </button>
          </form>

          {/* Security & System Status Footer */}
          <div style={{
            marginTop: 26,
            paddingTop: 18,
            borderTop: '1px solid rgba(245, 158, 11, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11.5,
            color: '#9CA3AF',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <ShieldCheck size={14} color="#10B981" /> 256-bit Encrypted
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Sparkles size={14} color="#FFD700" /> Grok & OpenRouter AI
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <CheckCircle2 size={14} color="#10B981" /> Instant Sync
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030509' }}>
        <Loader2 className="animate-spin" size={28} color="#FFD700" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  )
}
