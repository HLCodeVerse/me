'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Phone, Lock, ArrowRight, Loader2, User, Zap, Eye, EyeOff, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react'
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

  // Clear stale Supabase auth keys if any
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
      toast.error('Please fill in both mobile number and password')
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
          toast.info('Account not found. Switching to registration mode...')
          setMode('signup')
        }
        setLoading(false)
        return
      }

      if (data.success && data.profile) {
        setRedirecting(true)
        setDirectUser(data.profile as Profile)
        toast.success(mode === 'signup' ? 'Account created! Welcome to NIRMAAN 🚀' : 'Welcome back to NIRMAAN 🚀')

        // Ensure session cookies are set and force hard window navigation
        const target = nextUrl || '/dashboard'
        setTimeout(() => {
          window.location.href = target
        }, 150)
      } else {
        toast.error('Invalid response from server')
        setLoading(false)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Authentication request failed')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'radial-gradient(ellipse at top, #18181B 0%, #09090B 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative',
      overflow: 'hidden',
      color: 'var(--text-primary)',
    }}>
      {/* Dynamic Animated Ambient Orbs */}
      <div style={{
        position: 'absolute', top: '-15%', right: '-10%',
        width: '50vw', height: '50vw', maxWidth: 500, maxHeight: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124, 58, 237, 0.25) 0%, rgba(124, 58, 237, 0) 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        animation: 'pulse 8s ease-in-out infinite alternate',
      }} />

      <div style={{
        position: 'absolute', bottom: '-15%', left: '-10%',
        width: '50vw', height: '50vw', maxWidth: 500, maxHeight: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0) 70%)',
        filter: 'blur(70px)',
        pointerEvents: 'none',
      }} />

      {/* Grid Lines Pattern */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 10 }}>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 20,
            background: 'linear-gradient(135deg, #7C3AED 0%, #F59E0B 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', color: '#FFFFFF',
            boxShadow: '0 10px 30px rgba(124, 58, 237, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}>
            <Zap size={32} fill="#FFFFFF" />
          </div>
          <h1 style={{
            fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', margin: 0,
            background: 'linear-gradient(135deg, #FFFFFF 0%, #A1A1AA 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            NIRMAAN OS
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, fontWeight: 500 }}>
            {mode === 'login' ? 'Welcome back! Enter your mobile number to access' : 'Create your account & unlock personal OS'}
          </p>
        </div>

        {/* Glassmorphic Auth Box */}
        <div style={{
          background: 'rgba(24, 24, 27, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 24,
          padding: '28px 24px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}>
          {/* Mode Switch Tabs */}
          <div style={{
            display: 'flex',
            background: 'rgba(9, 9, 11, 0.8)',
            borderRadius: 14,
            padding: 4,
            marginBottom: 24,
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}>
            {(['login', 'signup'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: mode === m ? 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)' : 'transparent',
                  color: mode === m ? '#FFFFFF' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: 700, transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: mode === m ? '0 4px 14px rgba(124, 58, 237, 0.4)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {mode === 'signup' && (
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 8, display: 'block', letterSpacing: '0.04em' }}>
                  YOUR NAME
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    placeholder="e.g. Alex Sharma"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    required
                    style={{
                      width: '100%', height: 46, paddingLeft: 42, paddingRight: 14,
                      background: 'rgba(9, 9, 11, 0.6)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12, color: '#FFFFFF', fontSize: 14, outline: 'none',
                      transition: 'all 150ms ease',
                    }}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 8, display: 'block', letterSpacing: '0.04em' }}>
                MOBILE NUMBER
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  style={{
                    width: '100%', height: 46, paddingLeft: 42, paddingRight: 14,
                    background: 'rgba(9, 9, 11, 0.6)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, color: '#FFFFFF', fontSize: 14, outline: 'none',
                    transition: 'all 150ms ease',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 8, display: 'block', letterSpacing: '0.04em' }}>
                PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%', height: 46, paddingLeft: 42, paddingRight: 42,
                    background: 'rgba(9, 9, 11, 0.6)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, color: '#FFFFFF', fontSize: 14, outline: 'none',
                    transition: 'all 150ms ease',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || redirecting}
              style={{
                height: 48, marginTop: 6, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #7C3AED 0%, #F59E0B 100%)',
                color: '#FFFFFF', fontSize: 15, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 8px 24px rgba(124, 58, 237, 0.35)',
                transition: 'all 200ms ease',
                opacity: (loading || redirecting) ? 0.7 : 1,
              }}
            >
              {loading || redirecting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{redirecting ? 'Redirecting to Dashboard...' : 'Authenticating...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Quick Info Badges */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ShieldCheck size={13} color="#10B981" /> Encrypted Session
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Sparkles size={13} color="#F59E0B" /> AI OS Powered
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={13} color="#7C3AED" /> Instant Sync
            </span>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-muted)', margin: '24px 0 0' }}>
          NIRMAAN Personal OS • Built for Focus & Productivity
        </p>

      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090B' }}>
        <Loader2 className="animate-spin" size={24} color="#7C3AED" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  )
}
