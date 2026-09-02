'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  Phone, Lock, ArrowRight, Loader2, User, Eye, EyeOff,
  ShieldCheck, Sparkles, CheckCircle2, Bot, Target, Zap, BarChart2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Profile } from '@/lib/supabase/database.types'

type Mode = 'login' | 'signup'

const FEATURES = [
  { icon: Bot, color: '#7C3AED', label: 'Helpo AI Assistant', desc: 'Full CRUD via natural language — tasks, goals, habits, notes' },
  { icon: Target, color: '#10B981', label: 'Life Score System', desc: 'Track your balance across 7 life areas in real time' },
  { icon: Zap, color: '#FBBF24', label: 'Habits & Streaks', desc: 'Daily tracking with 7-day heatmaps and streak counters' },
  { icon: BarChart2, color: '#22D3EE', label: 'Deep Analytics', desc: 'Velocity, completion rates, and AI-powered weekly insights' },
]

function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get('next')
  const { user, setDirectUser } = useAuth()

  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [mounted, setMounted] = useState(false)

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (user && !redirecting) {
      const target = nextUrl || '/dashboard'
      window.location.href = target
    }
  }, [user, nextUrl, redirecting])

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
    if (!cleanPhone || !cleanPass) { toast.error('Please enter mobile number and password'); return }

    setLoading(true)
    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, password: cleanPass, displayName: displayName.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Authentication failed')
        if (res.status === 404 && mode === 'login') {
          toast.info('Account not found — switching to sign up!')
          setMode('signup')
        }
        setLoading(false)
        return
      }

      if (data.success && data.profile) {
        setRedirecting(true)
        setDirectUser(data.profile as Profile)
        toast.success(mode === 'signup' ? 'Welcome to Helpo! 🚀' : 'Welcome back! ⚡')
        const target = nextUrl || '/dashboard'
        setTimeout(() => { window.location.href = target }, 150)
      } else {
        toast.error('Unexpected auth response')
        setLoading(false)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Network error')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#050816',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif",
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes authOrb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(60px, -80px) scale(1.2); }
          66% { transform: translate(-40px, 40px) scale(0.9); }
        }
        @keyframes authOrb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-70px, 60px) scale(1.15); }
          66% { transform: translate(50px, -30px) scale(0.95); }
        }
        @keyframes authOrb3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -50px) scale(1.1); }
        }
        @keyframes authCardIn {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes authHeroIn {
          from { opacity: 0; transform: translateX(-24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes gridPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        @keyframes featureIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmerPurple {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulseRing {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4); }
          50% { box-shadow: 0 0 0 12px rgba(124, 58, 237, 0); }
        }
        .auth-card-animate { animation: authCardIn 700ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        .auth-hero-animate { animation: authHeroIn 600ms cubic-bezier(0.16, 1, 0.3, 1) 100ms both; }
        .auth-feature-0 { animation: featureIn 500ms ease 200ms both; }
        .auth-feature-1 { animation: featureIn 500ms ease 300ms both; }
        .auth-feature-2 { animation: featureIn 500ms ease 400ms both; }
        .auth-feature-3 { animation: featureIn 500ms ease 500ms both; }
        .auth-input-wrap {
          position: relative;
          border-radius: 14px;
          border: 1.5px solid rgba(124, 58, 237, 0.25);
          background: rgba(16, 26, 58, 0.9);
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }
        .auth-input-wrap:focus-within {
          border-color: #7C3AED !important;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.18) !important;
        }
        .auth-input-inner {
          width: 100%;
          height: 50px;
          padding-left: 46px;
          padding-right: 46px;
          background: transparent;
          border: none;
          color: #FFFFFF;
          font-size: 14px;
          outline: none;
          font-family: inherit;
        }
        .auth-input-inner::placeholder { color: rgba(139, 146, 176, 0.6); }
        .auth-submit-btn {
          width: 100%;
          height: 52px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          font-size: 15px;
          font-weight: 800;
          font-family: inherit;
          letter-spacing: 0.01em;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: linear-gradient(135deg, #7C3AED 0%, #6366F1 50%, #8B5CF6 100%);
          background-size: 200% 100%;
          color: #FFFFFF;
          transition: all 250ms ease;
          box-shadow: 0 4px 24px rgba(124, 58, 237, 0.45);
        }
        .auth-submit-btn:hover:not(:disabled) {
          animation: shimmerPurple 2s infinite;
          box-shadow: 0 8px 36px rgba(124, 58, 237, 0.6);
          transform: translateY(-1px);
        }
        .auth-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-mode-btn-active {
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.25), rgba(99, 102, 241, 0.15)) !important;
          color: #C4B5FD !important;
          border: 1.5px solid rgba(124, 58, 237, 0.5) !important;
        }
      `}} />

      {/* Animated orbs */}
      <div style={{ position: 'absolute', top: '-15%', left: '10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', animation: 'authOrb1 16s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '-15%', right: '10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', animation: 'authOrb2 18s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', top: '40%', right: '20%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', animation: 'authOrb3 12s ease-in-out infinite' }} />

      {/* Grid dots */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(124,58,237,0.15) 1px, transparent 1px)', backgroundSize: '30px 30px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)', pointerEvents: 'none', animation: 'gridPulse 6s ease-in-out infinite' }} />

      {/* Main container */}
      <div style={{ width: '100%', maxWidth: 1100, position: 'relative', zIndex: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 40, alignItems: 'center' }}>

        {/* LEFT — Hero */}
        <div className="auth-hero-animate" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Brand pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 99, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.35)', width: 'fit-content' }}>
            <Sparkles size={14} color="#8B5CF6" />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#8B5CF6', letterSpacing: '0.08em' }}>HELPO — PERSONAL AI OS</span>
          </div>

          <div>
            <h1 style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', margin: 0, color: '#FFFFFF' }}>
              Your life,<br />
              <span style={{ background: 'linear-gradient(135deg, #8B5CF6, #22D3EE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>organized.</span>
            </h1>
            <p style={{ fontSize: 15, color: '#8892B0', marginTop: 16, lineHeight: 1.7, maxWidth: 440 }}>
              Helpo is your intelligent personal OS — tasks, habits, goals, journal, notes, and AI assistance all in one premium experience.
            </p>
          </div>

          {/* Feature cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FEATURES.map((f, i) => (
              <div key={f.label} className={`auth-feature-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderRadius: 14, background: 'rgba(16,26,58,0.7)', border: `1px solid ${f.color}22`, backdropFilter: 'blur(10px)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${f.color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <f.icon size={18} color={f.color} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: '#6B7694', marginTop: 1 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust indicators */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              { icon: ShieldCheck, color: '#10B981', label: 'End-to-end encrypted' },
              { icon: CheckCircle2, color: '#7C3AED', label: 'Instant real-time sync' },
            ].map(t => (
              <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <t.icon size={13} color={t.color} />
                <span style={{ fontSize: 12, color: '#6B7694', fontWeight: 500 }}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Auth Card */}
        <div className="auth-card-animate" style={{
          background: 'rgba(10, 14, 36, 0.9)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1.5px solid rgba(124, 58, 237, 0.3)',
          borderRadius: 28,
          padding: '40px 32px',
          boxShadow: '0 30px 70px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,58,237,0.1) inset',
          position: 'relative',
        }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 60, height: 60, borderRadius: 20, background: 'linear-gradient(135deg, #7C3AED, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 12px 32px rgba(124,58,237,0.5)', animation: mounted ? 'pulseRing 3s ease-in-out infinite' : undefined }}>
              <Sparkles size={28} color="#FFFFFF" />
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
              Helpo <span style={{ color: '#8B5CF6' }}>OS</span>
            </h2>
            <p style={{ fontSize: 13, color: '#6B7694', marginTop: 6 }}>
              {mode === 'login' ? 'Sign in to your personal OS' : 'Create your free account'}
            </p>
          </div>

          {/* Mode tabs */}
          <div style={{ display: 'flex', background: 'rgba(16,26,58,0.8)', borderRadius: 14, padding: 5, marginBottom: 28, border: '1px solid rgba(124,58,237,0.2)' }}>
            {(['login', 'signup'] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={mode === m ? 'auth-mode-btn-active' : ''}
                style={{
                  flex: 1, padding: '11px 14px', borderRadius: 10, border: '1.5px solid transparent',
                  cursor: 'pointer', background: 'transparent',
                  color: mode === m ? '#C4B5FD' : '#6B7694',
                  fontSize: 13.5, fontWeight: 700, transition: 'all 250ms ease', fontFamily: 'inherit',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {mode === 'signup' && (
              <div>
                <label style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 800, display: 'block', marginBottom: 8, letterSpacing: '0.07em' }}>YOUR NAME</label>
                <div className="auth-input-wrap">
                  <User size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#7C3AED' }} />
                  <input className="auth-input-inner" type="text" placeholder="e.g. Alex Sharma" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 800, display: 'block', marginBottom: 8, letterSpacing: '0.07em' }}>MOBILE NUMBER</label>
              <div className="auth-input-wrap">
                <Phone size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#7C3AED' }} />
                <input className="auth-input-inner" type="tel" placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value)} required />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 800, display: 'block', marginBottom: 8, letterSpacing: '0.07em' }}>PASSWORD</label>
              <div className="auth-input-wrap">
                <Lock size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#7C3AED' }} />
                <input className="auth-input-inner" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: 46 }} />
                <button type="button" onClick={() => setShowPassword(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  {showPassword ? <EyeOff size={17} color="#6B7694" /> : <Eye size={17} color="#6B7694" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || redirecting} className="auth-submit-btn" style={{ marginTop: 4 }}>
              {loading || redirecting ? (
                <><Loader2 size={20} className="animate-spin" /><span>{redirecting ? 'Entering Helpo...' : 'Authenticating...'}</span></>
              ) : (
                <><span>{mode === 'login' ? 'Sign In to Dashboard' : 'Create Free Account'}</span><ArrowRight size={18} /></>
              )}
            </button>
          </form>

          {/* Footer */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#4B5680', display: 'flex', alignItems: 'center', gap: 5 }}>
              <ShieldCheck size={13} color="#10B981" /> 256-bit encrypted
            </span>
            <span style={{ fontSize: 11, color: '#4B5680', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Sparkles size={13} color="#7C3AED" /> Grok AI powered
            </span>
            <span style={{ fontSize: 11, color: '#4B5680', display: 'flex', alignItems: 'center', gap: 5 }}>
              <CheckCircle2 size={13} color="#10B981" /> Instant sync
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
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050816' }}>
        <Loader2 className="animate-spin" size={28} color="#7C3AED" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  )
}
