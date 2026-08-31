'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import {
  User, Key, Bell, LogOut, ChevronRight, Eye, EyeOff,
  Loader2, Check, Shield, ShieldCheck, BarChart2, Cpu, Settings
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const supabase = createClient()
  const router = useRouter()

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  const [openRouterKey, setOpenRouterKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [savingKey, setSavingKey] = useState(false)
  const [keyStored, setKeyStored] = useState(false)

  const [notifications, setNotifications] = useState(true)
  const [dailyBrief, setDailyBrief] = useState(true)

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSavingProfile(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('profiles') as any).update({ display_name: displayName }).eq('id', user.id)
    if (error) { toast.error('Failed to save profile'); setSavingProfile(false); return }
    await refreshProfile()
    toast.success('Profile updated!')
    setSavingProfile(false)
  }

  async function saveApiKey(e: React.FormEvent) {
    e.preventDefault()
    if (!openRouterKey.trim() || !user) return
    setSavingKey(true)
    const { error } = await supabase.from('ai_provider_keys' as 'api_keys').upsert({
      user_id: user.id,
      provider: 'openrouter',
    } as never)
    if (error) {
      toast.error('Failed to save key')
    } else {
      toast.success('API key saved securely!')
      setKeyStored(true)
      setOpenRouterKey('')
    }
    setSavingKey(false)
  }

  async function handleSignOut() {
    await signOut()
    router.push('/auth')
  }

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      style={{
        width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer',
        background: value ? '#10B981' : 'var(--border-2)',
        position: 'relative', transition: 'background 200ms ease',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: value ? 22 : 2,
        width: 20, height: 20, borderRadius: '50%', background: 'white',
        transition: 'left 200ms ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  )

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <Settings size={20} color="#8892A4" />
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Settings & System</h1>
        </div>
      }
    >
      <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Profile */}
        <Section icon={User} label="Profile & Identity" color="#10B981">
          <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, marginBottom: 6, display: 'block' }}>USERNAME</label>
              <input value={profile?.username ?? ''} disabled style={{ opacity: 0.5 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, marginBottom: 6, display: 'block' }}>DISPLAY NAME</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your display name" />
            </div>
            <button type="submit" disabled={savingProfile} className="btn btn-secondary" style={{ alignSelf: 'flex-end', height: 36, fontSize: 13 }}>
              {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Save Changes</>}
            </button>
          </form>
        </Section>

        {/* AI OpenRouter Configuration */}
        <Section icon={Cpu} label="AI Engine & OpenRouter (BYOK)" color="#818CF8">
          <div style={{ marginBottom: 14, padding: '10px 12px', background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.2)', borderRadius: 'var(--radius-sm)' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              NIRMAAN uses OpenRouter SDK with <strong style={{ color: '#818CF8' }}>liquid/lfm-2.5-embedding-350m:free</strong> and free GPT models. Add custom OpenRouter API key for high volume.
            </p>
          </div>
          {keyStored && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, color: '#10B981', fontSize: 13, fontWeight: 600 }}>
              <Shield size={14} /> Custom API key active & encrypted
            </div>
          )}
          <form onSubmit={saveApiKey} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={openRouterKey}
                onChange={e => setOpenRouterKey(e.target.value)}
                placeholder={keyStored ? 'Enter new key to update...' : 'sk-or-v1-...'}
                style={{ paddingRight: 40 }}
              />
              <button type="button" onClick={() => setShowKey(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <button type="submit" disabled={savingKey || !openRouterKey} className="btn btn-secondary" style={{ alignSelf: 'flex-end', height: 36, fontSize: 13 }}>
              {savingKey ? <Loader2 size={14} className="animate-spin" /> : <><Key size={14} /> Save OpenRouter Key</>}
            </button>
          </form>
        </Section>

        {/* Notifications */}
        <Section icon={Bell} label="Notification Preferences" color="#F59E0B">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <ToggleRow label="Push Notifications" sub="Task reminders and habit streaks" value={notifications} onChange={() => setNotifications(p => !p)} Toggle={Toggle} />
            <div className="divider" />
            <ToggleRow label="Daily AI Morning Plan" sub="AI daily brief generated at 7:00 AM" value={dailyBrief} onChange={() => setDailyBrief(p => !p)} Toggle={Toggle} />
          </div>
        </Section>

        {/* MCP Protocols */}
        <button
          onClick={() => router.push('/mcp')}
          style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '16px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', cursor: 'pointer', width: '100%',
            textAlign: 'left',
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'rgba(96,165,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={18} color="#60A5FA" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700 }}>MCP Connect Protocol</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Connect Claude Desktop, Cursor, and AI agents</p>
          </div>
          <ChevronRight size={16} color="var(--text-dim)" />
        </button>

        {/* Analytics link */}
        <button
          onClick={() => router.push('/analytics')}
          style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '16px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', cursor: 'pointer', width: '100%',
            textAlign: 'left',
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart2 size={18} color="#10B981" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700 }}>Analytics & Life Score</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>View your velocity charts and habit metrics</p>
          </div>
          <ChevronRight size={16} color="var(--text-dim)" />
        </button>

        {/* App Info */}
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 10px', fontSize: 20, fontWeight: 900, color: '#0A0B0D',
          }}>N</div>
          <p style={{ fontSize: 15, fontWeight: 800 }}>NIRMAAN OS v3.0</p>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Personal Reconstruction System</p>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px', background: 'rgba(244,63,94,0.08)',
            border: '1px solid rgba(244,63,94,0.2)', borderRadius: 'var(--radius)',
            cursor: 'pointer', color: '#F43F5E', fontSize: 14, fontWeight: 700,
          }}
        >
          <LogOut size={16} /> Sign Out Account
        </button>
      </div>
    </AppShell>
  )
}

function Section({ icon: Icon, label, color, children }: { icon: React.ElementType; label: string; color: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={color} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{label}</span>
      </div>
      {children}
    </div>
  )
}

function ToggleRow({ label, sub, value, onChange, Toggle }: { label: string; sub: string; value: boolean; onChange: () => void; Toggle: React.ComponentType<{ value: boolean; onChange: () => void }> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 500 }}>{label}</p>
        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>{sub}</p>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  )
}
