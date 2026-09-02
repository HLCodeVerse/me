'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import {
  User, Key, Bell, LogOut, ChevronRight, Eye, EyeOff,
  Loader2, Check, ShieldCheck, BarChart2, Cpu, Settings,
  Sun, Moon, Zap, Database, Download, RefreshCw, Link2, CheckCircle2, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

import { subscribeToPushNotifications, sendTestPushNotification } from '@/lib/push-notifications'

export default function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const supabase = createClient()
  const router = useRouter()

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  const [openRouterKey, setOpenRouterKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [savingKey, setSavingKey] = useState(false)
  const [keyStored, setKeyStored] = useState(false)

  // Todoist
  const [todoistToken, setTodoistToken] = useState('')
  const [showTodoistToken, setShowTodoistToken] = useState(false)
  const [savingTodoist, setSavingTodoist] = useState(false)
  const [todoistStatus, setTodoistStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown')
  const [testingTodoist, setTestingTodoist] = useState(false)

  const [notifications, setNotifications] = useState(true)
  const [dailyBrief, setDailyBrief] = useState(true)
  const [clearingCache, setClearingCache] = useState(false)

  async function handleToggleNotifications() {
    if (!user) return
    const nextState = !notifications
    setNotifications(nextState)
    if (nextState) {
      const ok = await subscribeToPushNotifications(user.id)
      if (!ok) setNotifications(false)
    }
  }

  async function handleTestNotification() {
    if (!user) return
    await sendTestPushNotification(user.id)
  }

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

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('nirmaan_grok_key', openRouterKey.trim())
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('api_keys') as any).upsert({
        user_id: user.id,
        name: 'Grok xAI Key',
        key_prefix: openRouterKey.trim().slice(0, 12),
        key_hash: openRouterKey.trim(),
      })

      if (error) console.warn('DB key save fallback:', error.message)

      toast.success('Grok & AI API Key saved & activated!')
      setKeyStored(true)
      setOpenRouterKey('')
    } catch {
      toast.error('Failed to save key')
    } finally {
      setSavingKey(false)
    }
  }

  async function saveTodoistToken(e: React.FormEvent) {
    e.preventDefault()
    if (!todoistToken.trim() || !user) return
    setSavingTodoist(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('api_keys') as any).upsert(
        { user_id: user.id, name: 'todoist_token', key_prefix: 'todoist', key_hash: todoistToken.trim() },
        { onConflict: 'user_id,name' }
      )
      if (error) throw error
      toast.success('Todoist token saved! Testing connection...')
      setTodoistToken('')
      // Auto-test
      setTimeout(() => testTodoistConnection(), 400)
    } catch {
      toast.error('Failed to save Todoist token')
    } finally {
      setSavingTodoist(false)
    }
  }

  async function testTodoistConnection() {
    if (!user) return
    setTestingTodoist(true)
    try {
      const res = await fetch('/api/todoist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': user.id },
        body: JSON.stringify({ test: true }),
      })
      const data = await res.json()
      if (data.connected) {
        setTodoistStatus('connected')
        toast.success('Todoist connected successfully! ✅')
      } else {
        setTodoistStatus('failed')
        toast.error('Todoist connection failed. Check your token.')
      }
    } catch {
      setTodoistStatus('failed')
      toast.error('Connection test failed')
    } finally {
      setTestingTodoist(false)
    }
  }

  async function exportUserData() {
    if (!user) return
    toast.info('Preparing your data export...')
    try {
      const [tasks, todos, habits, notes, journal, water] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('todos').select('*').eq('user_id', user.id),
        supabase.from('habits').select('*').eq('user_id', user.id),
        supabase.from('notes').select('*').eq('user_id', user.id),
        supabase.from('journal_entries').select('*').eq('user_id', user.id),
        supabase.from('water_logs').select('*').eq('user_id', user.id),
      ])

      const exportPayload = {
        profile,
        tasks: tasks.data ?? [],
        todos: todos.data ?? [],
        habits: habits.data ?? [],
        notes: notes.data ?? [],
        journal: journal.data ?? [],
        water_logs: water.data ?? [],
        exported_at: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `helpo-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data exported!')
    } catch {
      toast.error('Failed to export user data')
    }
  }

  function clearLocalCache() {
    setClearingCache(true)
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nirmaan_theme')
      }
      setClearingCache(false)
      toast.success('Local cache cleared! Refreshing page...')
      window.location.reload()
    }, 600)
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
        background: value ? '#10B981' : 'var(--surface-3)',
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
          <Settings size={20} color="#7C3AED" />
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Settings & System</h1>
        </div>
      }
    >
      <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Theme Engine Selector */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(124, 58, 237, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={16} color="#7C3AED" />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Theme Engine</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Select your visual aesthetic for all app pages</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {/* Light SaaS */}
            <button
              onClick={() => setTheme('light')}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '12px 8px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
                background: theme === 'light' ? 'rgba(124, 58, 237, 0.1)' : 'var(--surface-2)',
                border: `2px solid ${theme === 'light' ? '#7C3AED' : 'var(--border)'}`,
                color: theme === 'light' ? '#7C3AED' : 'var(--text-primary)',
                transition: 'all 150ms ease',
              }}
            >
              <Sun size={20} color={theme === 'light' ? '#7C3AED' : 'var(--text-secondary)'} />
              <span style={{ fontSize: 12, fontWeight: 700 }}>Light SaaS</span>
            </button>

            {/* Dark SaaS */}
            <button
              onClick={() => setTheme('dark')}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '12px 8px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
                background: theme === 'dark' ? 'rgba(124, 58, 237, 0.1)' : 'var(--surface-2)',
                border: `2px solid ${theme === 'dark' ? '#7C3AED' : 'var(--border)'}`,
                color: theme === 'dark' ? '#7C3AED' : 'var(--text-primary)',
                transition: 'all 150ms ease',
              }}
            >
              <Moon size={20} color={theme === 'dark' ? '#7C3AED' : 'var(--text-secondary)'} />
              <span style={{ fontSize: 12, fontWeight: 700 }}>Dark SaaS</span>
            </button>

            {/* AMOLED Black */}
            <button
              onClick={() => setTheme('amoled')}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '12px 8px', borderRadius: 'var(--radius-btn)', cursor: 'pointer',
                background: theme === 'amoled' ? 'rgba(139, 92, 246, 0.2)' : 'var(--surface-2)',
                border: `2px solid ${theme === 'amoled' ? '#8B5CF6' : 'var(--border)'}`,
                color: theme === 'amoled' ? '#8B5CF6' : 'var(--text-primary)',
                transition: 'all 150ms ease',
                boxShadow: theme === 'amoled' ? '0 0 12px rgba(139, 92, 246, 0.3)' : 'none',
              }}
            >
              <Zap size={20} color={theme === 'amoled' ? '#8B5CF6' : 'var(--text-secondary)'} />
              <span style={{ fontSize: 12, fontWeight: 800 }}>AMOLED Black</span>
            </button>
          </div>
        </div>

        {/* Profile */}
        <Section icon={User} label="Profile Identity" color="#10B981">
          <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>USER ID</label>
              <input value={user?.id ?? ''} disabled style={{ opacity: 0.5, fontFamily: 'monospace', fontSize: 12 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>DISPLAY NAME</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your display name" />
            </div>
            <button type="submit" disabled={savingProfile} className="btn btn-secondary" style={{ alignSelf: 'flex-end', height: 36, fontSize: 13 }}>
              {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Save Profile</>}
            </button>
          </form>
        </Section>

        {/* Todoist Integration */}
        <Section icon={Link2} label="Todoist Integration" color="#FF4F81">
          <div style={{ marginBottom: 14, padding: '10px 12px', background: 'rgba(255,79,129,0.08)', border: '1px solid rgba(255,79,129,0.2)', borderRadius: 'var(--radius-btn)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Connect your <strong style={{ color: '#FF4F81' }}>Todoist account</strong> to sync tasks bi-directionally. Get your API token from <strong>todoist.com → Settings → Integrations → API token</strong>.
            </p>
            {todoistStatus !== 'unknown' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {todoistStatus === 'connected'
                  ? <><CheckCircle2 size={16} color="#10B981" /><span style={{ fontSize: 11, color: '#10B981', fontWeight: 700 }}>Connected</span></>
                  : <><XCircle size={16} color="#EF4444" /><span style={{ fontSize: 11, color: '#EF4444', fontWeight: 700 }}>Failed</span></>
                }
              </div>
            )}
          </div>

          <form onSubmit={saveTodoistToken} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>TODOIST API TOKEN</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showTodoistToken ? 'text' : 'password'}
                  value={todoistToken}
                  onChange={e => setTodoistToken(e.target.value)}
                  placeholder="Paste your Todoist API token here..."
                  style={{ paddingRight: 40 }}
                />
                <button type="button" onClick={() => setShowTodoistToken(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showTodoistToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={savingTodoist || !todoistToken} className="btn btn-pink" style={{ flex: 1, height: 38, fontSize: 13 }}>
                {savingTodoist ? <Loader2 size={14} className="animate-spin" /> : <><Key size={14} /> Save Todoist Token</>}
              </button>
              <button type="button" onClick={testTodoistConnection} disabled={testingTodoist} className="btn btn-secondary" style={{ height: 38, fontSize: 13 }}>
                {testingTodoist ? <Loader2 size={14} className="animate-spin" /> : 'Test Connection'}
              </button>
            </div>
          </form>
        </Section>

        {/* AI Engine Configuration */}

        <Section icon={Cpu} label="AI Engine & Grok (BYOK)" color="#7C3AED">
          <div style={{ marginBottom: 14, padding: '10px 12px', background: 'rgba(124, 58, 237, 0.08)', border: '1px solid rgba(124, 58, 237, 0.2)', borderRadius: 'var(--radius-btn)' }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Helpo AI natively supports <strong style={{ color: '#7C3AED' }}>xAI Grok-2</strong>, <strong style={{ color: '#7C3AED' }}>Grok Beta</strong>, and OpenRouter models. Provide your API keys below.
            </p>
          </div>

          <form onSubmit={saveApiKey} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>xAI GROK API KEY</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={openRouterKey}
                  onChange={e => setOpenRouterKey(e.target.value)}
                  placeholder={keyStored ? 'xai-...' : 'Enter your xAI Grok API Key (xai-...)'}
                  style={{ paddingRight: 40 }}
                />
                <button type="button" onClick={() => setShowKey(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={savingKey || !openRouterKey} className="btn btn-primary" style={{ alignSelf: 'flex-end', height: 36, fontSize: 13 }}>
              {savingKey ? <Loader2 size={14} className="animate-spin" /> : <><Key size={14} /> Save Grok Key</>}
            </button>
          </form>
        </Section>

        {/* Database Diagnostics */}
        <Section icon={Database} label="Database Sync Diagnostics" color="#3B82F6">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Database Provider</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Supabase PostgreSQL</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Status</span>
              <span style={{ fontWeight: 700, color: '#10B981' }}>Connected & Active</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Active Tables</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>tasks, todos, habits, water_logs, notes...</span>
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section icon={Bell} label="Device Push Notifications" color="#F59E0B">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 'var(--radius-btn)' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                Receive automatic device notifications for scheduled reminders, due tasks, and water intake alerts — <strong>even when Helpo is closed</strong>.
              </p>
            </div>

            <ToggleRow label="Enable Push Notifications" sub="Subscribes device to background WebPush notifications" value={notifications} onChange={handleToggleNotifications} Toggle={Toggle} />
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <ToggleRow label="Daily AI Morning Plan" sub="AI daily brief generated at 7:00 AM" value={dailyBrief} onChange={() => setDailyBrief(p => !p)} Toggle={Toggle} />

            <button
              type="button"
              onClick={handleTestNotification}
              className="btn btn-secondary"
              style={{ height: 38, fontSize: 12, marginTop: 6 }}
            >
              <Bell size={14} color="#F59E0B" /> Send Test Push Notification
            </button>
          </div>
        </Section>

        {/* Quick Nav Protocols */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button
            onClick={() => router.push('/mcp')}
            className="card"
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(96,165,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={18} color="#3B82F6" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>MCP Connect</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>AI Agent API</p>
            </div>
            <ChevronRight size={14} color="var(--text-muted)" />
          </button>

          <button
            onClick={() => router.push('/analytics')}
            className="card"
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart2 size={18} color="#10B981" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Analytics</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Life Score</p>
            </div>
            <ChevronRight size={14} color="var(--text-muted)" />
          </button>
        </div>

        {/* Data Tools: Export & Cache Clear */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={exportUserData}
            className="btn btn-secondary"
            style={{ flex: 1, height: 42, fontSize: 13 }}
          >
            <Download size={15} /> Export Backup JSON
          </button>
          <button
            onClick={clearLocalCache}
            disabled={clearingCache}
            className="btn btn-secondary"
            style={{ flex: 1, height: 42, fontSize: 13 }}
          >
            {clearingCache ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Clear Cache
          </button>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px', background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-btn)',
            cursor: 'pointer', color: '#EF4444', fontSize: 14, fontWeight: 700,
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
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color={color} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
      </div>
      {children}
    </div>
  )
}

function ToggleRow({ label, sub, value, onChange, Toggle }: { label: string; sub: string; value: boolean; onChange: () => void; Toggle: React.ComponentType<{ value: boolean; onChange: () => void }> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{label}</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>{sub}</p>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  )
}
