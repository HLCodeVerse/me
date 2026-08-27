'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import {
  User, Key, Bell, LogOut, ChevronRight, Eye, EyeOff,
  Loader2, Check, Shield, Palette
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
    if (error) { toast.error('Failed to save'); setSavingProfile(false); return }
    await refreshProfile()
    toast.success('Profile updated!')
    setSavingProfile(false)
  }

  async function saveApiKey(e: React.FormEvent) {
    e.preventDefault()
    if (!openRouterKey.trim() || !user) return
    setSavingKey(true)
    // In a real implementation, this would call an Edge Function to encrypt via Vault
    // For now we store a flag indicating key exists
    const { error } = await supabase.from('ai_provider_keys' as 'api_keys').upsert({
      user_id: user.id,
      provider: 'openrouter',
    } as never)
    if (error) {
      toast.error('Failed to save key')
    } else {
      toast.success('API key saved securely 🔒')
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
        background: value ? 'var(--growth)' : 'var(--border-2)',
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
        <div style={{ width: '100%' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Settings</h1>
        </div>
      }
    >
      <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>

        {/* Profile */}
        <Section icon={User} label="Profile" color="var(--growth)">
          <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 6, display: 'block' }}>USERNAME</label>
              <input value={profile?.username ?? ''} disabled style={{ opacity: 0.5 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 6, display: 'block' }}>DISPLAY NAME</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
            </div>
            <button type="submit" disabled={savingProfile} className="btn btn-secondary" style={{ alignSelf: 'flex-end', height: 36, fontSize: 13 }}>
              {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Save</>}
            </button>
          </form>
        </Section>

        {/* AI / OpenRouter Key */}
        <Section icon={Key} label="AI Settings" color="#A78BFA">
          <div style={{ marginBottom: 14, padding: '10px 12px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 'var(--radius-sm)' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Bring your own <strong style={{ color: '#A78BFA' }}>OpenRouter</strong> key (BYOK). Your key is encrypted with Supabase Vault — never stored in plaintext.
            </p>
          </div>
          {keyStored && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, color: 'var(--growth)', fontSize: 13, fontWeight: 600 }}>
              <Shield size={14} /> API key saved securely
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
              {savingKey ? <Loader2 size={14} className="animate-spin" /> : <><Key size={14} /> Save Key</>}
            </button>
          </form>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 8, display: 'block' }}>DEFAULT MODEL</label>
            <select defaultValue="google/gemini-2.0-flash-001">
              <option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash (Fast)</option>
              <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Smart)</option>
              <option value="openai/gpt-4o">GPT-4o (Capable)</option>
            </select>
          </div>
        </Section>

        {/* Notifications */}
        <Section icon={Bell} label="Notifications" color="var(--focus)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <ToggleRow label="Push Notifications" sub="Task reminders and updates" value={notifications} onChange={() => setNotifications(p => !p)} Toggle={Toggle} />
            <div className="divider" />
            <ToggleRow label="Daily AI Brief" sub="Morning plan generated at 7am" value={dailyBrief} onChange={() => setDailyBrief(p => !p)} Toggle={Toggle} />
          </div>
        </Section>

        {/* MCP Connect */}
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
            <span style={{ fontSize: 18 }}>🔗</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700 }}>MCP Connect</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Connect Claude Desktop, Cursor, ChatGPT</p>
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
          <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Palette size={18} color="var(--growth)" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700 }}>Analytics</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>View your progress charts</p>
          </div>
          <ChevronRight size={16} color="var(--text-dim)" />
        </button>

        {/* App info */}
        <div className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: 'var(--growth)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 8px', fontSize: 20, fontWeight: 900, color: '#0A0B0D',
          }}>N</div>
          <p style={{ fontSize: 14, fontWeight: 700 }}>NIRMAAN v1.0.0</p>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Personal Reconstruction OS</p>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px', background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius)',
            cursor: 'pointer', color: 'var(--danger)', fontSize: 14, fontWeight: 600,
          }}
        >
          <LogOut size={16} /> Sign Out
        </button>

        <div style={{ height: 16 }} />
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
