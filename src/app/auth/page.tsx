'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Phone, Lock, ArrowRight, Loader2, User } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile } from '@/lib/supabase/database.types'

type Mode = 'login' | 'signup'

export default function AuthPage() {
  const router = useRouter()
  const supabase = createClient()
  const { setDirectUser } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)

  // Input Fields
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')

  function formatPhone(val: string) {
    const digits = val.replace(/\D/g, '')
    if (digits.length === 10) return `+91${digits}`
    if (digits.startsWith('91') && digits.length === 12) return `+${digits}`
    return val.startsWith('+') ? val : `+${digits}`
  }

  async function handleDirectAuth(e: React.FormEvent) {
    e.preventDefault()
    if (!phone || !password) return
    setLoading(true)

    const cleanPhone = formatPhone(phone)
    const cleanUsername = `user_${cleanPhone.replace(/\D/g, '').slice(-10)}`

    try {
      if (mode === 'signup') {
        // 1. Check if phone already registered in profiles
        const { data: existing } = await supabase
          .from('profiles')
          .select('*')
          .eq('phone', cleanPhone)
          .maybeSingle()

        if (existing) {
          toast.error('Mobile number already registered! Please login.')
          setMode('login')
          setLoading(false)
          return
        }

        // 2. Insert new profile directly into PostgreSQL profiles table
        const newProfile: Partial<Profile> = {
          id: crypto.randomUUID(),
          username: cleanUsername,
          display_name: displayName || 'Builder',
          phone: cleanPhone,
          password_hash: password,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          life_score: 0,
          current_streak: 0,
          longest_streak: 0,
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: createdProfile, error: insertErr } = await (supabase.from('profiles') as any)
          .insert(newProfile)
          .select()
          .single()

        if (insertErr) {
          throw new Error(insertErr.message)
        }

        // 3. Seed default life areas for new user
        await seedDefaultLifeAreas(createdProfile.id)

        // 4. Log in user directly
        setDirectUser(createdProfile as Profile)
        toast.success('Registration successful! Welcome to NIRMAAN 🚀')
        router.push('/dashboard')
      } else {
        // LOGIN: Query profiles table by phone or last 10 digits
        const rawDigits = phone.replace(/\D/g, '').slice(-10)
        const { data: existingProfile, error: selectErr } = await supabase
          .from('profiles')
          .select('*')
          .or(`phone.eq.${cleanPhone},phone.ilike.%${rawDigits}%`)
          .maybeSingle()

        if (selectErr) throw selectErr

        const userProfile = existingProfile as Profile | null

        if (!userProfile) {
          toast.error('Number not registered. Please register first!')
          setMode('signup')
          setLoading(false)
          return
        }

        // Password check
        if (userProfile.password_hash && userProfile.password_hash !== password) {
          toast.error('Incorrect password. Please try again.')
          setLoading(false)
          return
        }

        // Log in user directly
        setDirectUser(userProfile)
        toast.success('Welcome back to NIRMAAN 🚀')
        router.push('/dashboard')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  async function seedDefaultLifeAreas(userId: string) {
    const areas = [
      { name: 'Career',  icon: '💼', color: '#60A5FA' },
      { name: 'Health',  icon: '🏋️', color: '#34D399' },
      { name: 'Finance', icon: '💰', color: '#F59E0B' },
      { name: 'Mind',    icon: '🧠', color: '#A78BFA' },
      { name: 'Skills',  icon: '⚡', color: '#FB923C' },
    ]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('life_areas') as any).insert(areas.map(a => ({ ...a, user_id: userId, target_score: 80 })))
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
        NIRMAAN Personal OS · Direct DB Authentication
      </p>
    </div>
  )
}
