'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { Plus, Bell, Clock, Repeat, Loader2, X, Trash2, CheckCircle2, Sparkles, Send } from 'lucide-react'
import { toast } from 'sonner'
import { stripMarkdown } from '@/lib/utils'
import type { Reminder } from '@/lib/supabase/database.types'

import { subscribeToPushNotifications, sendTestPushNotification } from '@/lib/push-notifications'

export default function RemindersPage() {
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [aiPrompting, setAiPrompting] = useState(false)
  const [aiInput, setAiInput] = useState('')

  // Form state
  const [title, setTitle] = useState('')
  const [remindAt, setRemindAt] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceRule, setRecurrenceRule] = useState('daily')
  const [saving, setSaving] = useState(false)

  const loadReminders = useCallback(async () => {
    if (!user) {
      if (!authLoading) setLoading(false)
      return
    }
    try {
      const { data } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('remind_at', { ascending: true })
      setReminders(data ?? [])
    } catch {
      setReminders([])
    } finally {
      setLoading(false)
    }
  }, [user, authLoading, supabase])

  useEffect(() => { loadReminders() }, [loadReminders])

  async function handleEnablePush() {
    if (!user) return
    await subscribeToPushNotifications(user.id)
  }

  async function handleTestPush() {
    if (!user) return
    await sendTestPushNotification(user.id)
  }

  function parseISOOrFallback(inputDateStr?: string): string {
    if (!inputDateStr || typeof inputDateStr !== 'string' || !inputDateStr.trim()) {
      return new Date(Date.now() + 3600000).toISOString()
    }

    const trimmed = inputDateStr.trim()
    let d = new Date(trimmed)

    if (isNaN(d.getTime())) {
      d = new Date(trimmed.replace(' ', 'T'))
    }

    if (isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      d = new Date(`${trimmed}T09:00:00`)
    }

    if (isNaN(d.getTime())) {
      return new Date(Date.now() + 3600000).toISOString()
    }

    return d.toISOString()
  }

  async function createReminder(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !user) return
    setSaving(true)

    const parsedDateIso = parseISOOrFallback(remindAt)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('reminders') as any).insert({
        user_id: user.id,
        title: stripMarkdown(title.trim()),
        remind_at: parsedDateIso,
        repeat_rule: isRecurring ? recurrenceRule : null,
        is_sent: false,
      })

      if (error) throw error

      toast.success('Reminder scheduled! 🔔')
      setTitle('')
      setRemindAt('')
      setShowAddModal(false)
      loadReminders()
    } catch (err: unknown) {
      console.error('Reminder error:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to set reminder.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleReminderSent(reminder: Reminder) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('reminders') as any)
      .update({ is_sent: !reminder.is_sent })
      .eq('id', reminder.id)
    setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, is_sent: !r.is_sent } : r))
  }

  async function deleteReminder(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('reminders') as any).delete().eq('id', id)
    setReminders(prev => prev.filter(r => r.id !== id))
    toast.success('Reminder deleted')
  }

  async function handleAIPrompt(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const promptToUse = aiInput.trim() || 'Remind me tomorrow at 9am to review daily goals'
    setAiPrompting(true)
    toast.info('AI is executing your reminder instruction...')

    try {
      const customGrokKey = typeof window !== 'undefined' ? localStorage.getItem('nirmaan_grok_key') : null
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: promptToUse }],
          enableTools: true,
          userId: user.id,
          grokApiKey: customGrokKey,
        })
      })

      if (!res.ok) throw new Error('AI processing failed')

      const actionsHeader = res.headers.get('X-Actions')
      if (actionsHeader) {
        toast.success(`AI Executed Actions: ${actionsHeader}`, { icon: '⚡' })
      }

      setAiInput('')
      toast.success('AI Reminder synchronized!')
      loadReminders()
    } catch {
      toast.error('AI processing failed')
    } finally {
      setAiPrompting(false)
    }
  }

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={20} color="#EF4444" />
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Reminders & Alerts</h1>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }}>
            <Plus size={15} /> Add Reminder
          </button>
        </div>
      }
    >
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Interactive AI Prompt Input Bar */}
        <form onSubmit={handleAIPrompt} className="card" style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface)' }}>
          <Sparkles size={18} color="#06B6D4" style={{ flexShrink: 0 }} />
          <input
            className="glow-input"
            placeholder="Ask AI to set a reminder (e.g., 'Remind me tomorrow at 4pm to call doctor')..."
            value={aiInput}
            onChange={e => setAiInput(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', padding: 0, fontSize: 13 }}
          />
          <button
            type="submit"
            disabled={aiPrompting}
            className="btn btn-primary"
            style={{ height: 34, padding: '0 12px', fontSize: 12, flexShrink: 0 }}
          >
            {aiPrompting ? <Loader2 size={13} className="animate-spin" /> : <><Send size={13} /> AI Generate</>}
          </button>
        </form>

        {/* Automatic Background Push Notification Banner */}
        <div style={{ padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={20} color="#06B6D4" />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Automatic Background Push Alerts</p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>Receive alerts on your device even when NIRMAAN is closed.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={handleEnablePush} className="btn btn-primary" style={{ height: 32, fontSize: 11, padding: '0 10px' }}>
              Enable Device Push
            </button>
            <button onClick={handleTestPush} className="btn btn-secondary" style={{ height: 32, fontSize: 11, padding: '0 10px' }}>
              Test Alert
            </button>
          </div>
        </div>

        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 74, borderRadius: 'var(--radius-card)' }} />)
        ) : reminders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Bell size={28} color="#EF4444" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Never miss a commitment</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 300, margin: '0 auto 20px' }}>
              Set recurring or one-time alerts for your most important events.
            </p>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
              <Plus size={15} /> Schedule Reminder
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reminders.map(rem => (
              <div
                key={rem.id}
                className="card"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', opacity: rem.is_sent ? 0.6 : 1,
                  borderLeft: `3px solid ${rem.is_sent ? 'var(--text-muted)' : '#EF4444'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={() => toggleReminderSent(rem)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {rem.is_sent ? <CheckCircle2 size={18} color="#10B981" /> : <Clock size={18} color="#06B6D4" />}
                  </button>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, textDecoration: rem.is_sent ? 'line-through' : 'none' }}>
                      {stripMarkdown(rem.title)}
                    </h4>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{new Date(rem.remind_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      {(rem.repeat_rule || (rem as unknown as Record<string, string>).recurrence_rule) && (
                        <span className="badge badge-info" style={{ fontSize: 9 }}>
                          <Repeat size={10} /> {rem.repeat_rule || (rem as unknown as Record<string, string>).recurrence_rule}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => deleteReminder(rem.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Reminder Modal */}
      {showAddModal && (
        <>
          <div className="overlay" onClick={() => setShowAddModal(false)} />
          <div className="animate-fade-in" style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card) var(--radius-card) 0 0',
            padding: '24px 20px', zIndex: 110,
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
            maxWidth: 768, margin: '0 auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Schedule Reminder</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-secondary)" />
              </button>
            </div>
            <form onSubmit={createReminder} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>REMINDER TITLE</label>
                <input
                  className="glow-input"
                  placeholder="e.g. Call client regarding project update..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  style={{ fontSize: 14 }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>DATE & TIME</label>
                  <input
                    type="datetime-local"
                    value={remindAt}
                    onChange={e => setRemindAt(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>RECURRING</label>
                  <select
                    value={isRecurring ? recurrenceRule : 'none'}
                    onChange={e => {
                      if (e.target.value === 'none') {
                        setIsRecurring(false)
                      } else {
                        setIsRecurring(true)
                        setRecurrenceRule(e.target.value)
                      }
                    }}
                  >
                    <option value="none">One-time</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={saving || !title.trim()} className="btn btn-primary" style={{ height: 44, marginTop: 8 }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><Bell size={16} /> Set Reminder</>}
              </button>
            </form>
          </div>
        </>
      )}
    </AppShell>
  )
}
