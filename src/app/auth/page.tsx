'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Phone, Lock, ArrowRight, Loader2, User } from 'lucide-react'
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

  // Input Fields
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    if (user) {
      router.push(nextUrl || '/dashboard')
    }
  }, [user, router, nextUrl])

  useEffect(() => {
    // Clear any stale Supabase local storage tokens on auth page load
    if (typeof window !== 'undefined') {
      try {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('sb-')) localStorage.removeItem(k)
        })
      } catch {}
    }
  }, [])

  async function handleDirectAuth(e: React.FormEvent) {
    e.preventDefault()
    if (!phone || !password) return
    setLoading(true)

    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, displayName }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Authentication failed')
        if (res.status === 404 && mode === 'login') {
          setMode('signup')
        }
        setLoading(false)
        return
      }

      if (data.success && data.profile) {
        setDirectUser(data.profile as Profile)
        toast.success(mode === 'signup' ? 'Registration successful! Welcome to NIRMAAN 🚀' : 'Welcome back to NIRMAAN 🚀')
        router.push(nextUrl || '/dashboard')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Authentication request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Glow */}
      <div style={{
        position: 'absolute', top: -200, right: -200,
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(52,211,153,0.06), transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header Logo */}
      <div className="animate-fade-up" style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, background: 'var(--growth)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: 28, fontWeight: 900, color: '#0A0B0D',
          boxShadow: 'var(--glow-growth)',
        }}>
          N
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>NIRMAAN</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
          {mode === 'login' ? 'Direct Mobile Login' : 'Direct Mobile Registration'}
        </p>
      </div>

      {/* Main Card */}
      <div className="animate-fade-up delay-100 card" style={{ padding: '28px 24px', maxWidth: 400, margin: '0 auto', width: '100%' }}>
        {/* Mode Selector (Login vs Register) */}
        <div style={{
          display: 'flex',
          background: 'var(--surface-2)',
          borderRadius: 'var(--radius-sm)',
          padding: 4,
          marginBottom: 24,
        }}>
          {(['login', 'signup'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1, padding: '8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: mode === m ? 'var(--surface-3)' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text-muted)',
                fontSize: 14, fontWeight: 600, transition: 'all 200ms ease',
              }}
            >
              {m === 'login' ? 'Login' : 'Register'}
            </button>
          ))}
        </div>

        {/* Direct Mobile Form */}
        <form onSubmit={handleDirectAuth} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'signup' && (
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6, display: 'block', letterSpacing: '0.04em' }}>
                YOUR NAME
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  placeholder="e.g. Alex"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  style={{ paddingLeft: 36 }}
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6, display: 'block', letterSpacing: '0.04em' }}>
              MOBILE NUMBER
            </label>
            <div style={{ position: 'relative' }}>
              <Phone size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{ paddingLeft: 36 }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6, display: 'block', letterSpacing: '0.04em' }}>
              PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: 36 }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ marginTop: 8, height: 44 }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : (
              <>
                {mode === 'login' ? 'Login' : 'Register Now'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>

      <p className="animate-fade-up delay-200" style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-dim)' }}>
        NIRMAAN Personal OS · Direct Authentication
      </p>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" /> Loading...</div>}>
      <AuthContent />
    </Suspense>
  )
}
