'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { Plus, Bell, Clock, Repeat, Loader2, X, Brain, Trash2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Reminder } from '@/lib/supabase/database.types'

export default function RemindersPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [aiPrompting, setAiPrompting] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [remindAt, setRemindAt] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceRule, setRecurrenceRule] = useState('daily')
  const [saving, setSaving] = useState(false)

  const loadReminders = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('remind_at', { ascending: true })
    setReminders(data ?? [])
    setLoading(false)
  }, [user, supabase])

  useEffect(() => { loadReminders() }, [loadReminders])

  async function createReminder(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !user) return
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('reminders') as any).insert({
      user_id: user.id,
      title: title.trim(),
      remind_at: remindAt || new Date(Date.now() + 3600000).toISOString(),
      is_recurring: isRecurring,
      recurrence_rule: isRecurring ? recurrenceRule : null,
      is_sent: false,
    })

    if (error) { toast.error('Failed to set reminder') }
    else {
      toast.success('Reminder scheduled! 🔔')
      setTitle(''); setRemindAt(''); setShowAddModal(false)
      loadReminders()
    }
    setSaving(false)
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

  async function aiSuggestReminder() {
    if (!user) return
    setAiPrompting(true)
    toast.info('AI is generating smart productivity reminder...')
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: 'Suggest 1 high-priority productivity reminder title under 6 words.'
          }],
          enableTools: false
        })
      })

      if (!res.ok) throw new Error('AI suggestion failed')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let sugText = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content ?? ''
              if (delta) sugText += delta
            } catch {}
          }
        }
      }

      const cleanText = sugText.replace(/["\n]/g, '').trim()
      setTitle(cleanText)
      setShowAddModal(true)
      toast.success(`AI suggested: "${cleanText}"`)
    } catch {
      toast.error('AI suggestion failed')
    } finally {
      setAiPrompting(false)
    }
  }

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={20} color="#F59E0B" />
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Reminders & Alerts</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={aiSuggestReminder}
              disabled={aiPrompting}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '0 12px', height: 36,
                borderRadius: 'var(--radius-sm)', background: 'rgba(245,158,11,0.15)',
                border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer',
                color: '#F59E0B', fontSize: 12, fontWeight: 700
              }}
            >
              {aiPrompting ? <Loader2 size={13} className="animate-spin" /> : <Brain size={13} />}
              AI Suggest
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>
              <Plus size={15} /> Add
            </button>
          </div>
        </div>
      }
    >
      <div style={{ paddingTop: 16 }}>
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 74, borderRadius: 'var(--radius)', marginBottom: 10 }} />)
        ) : reminders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Bell size={28} color="#F59E0B" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Never miss a deadline</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 280, margin: '0 auto 24px' }}>
              Set recurring or one-time alerts for your most important commitments.
            </p>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
              <Plus size={16} /> Schedule Reminder
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
                  borderLeft: `3px solid ${rem.is_sent ? 'var(--text-dim)' : '#F59E0B'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={() => toggleReminderSent(rem)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {rem.is_sent ? <CheckCircle2 size={18} color="var(--growth)" /> : <Clock size={18} color="#F59E0B" />}
                  </button>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', textDecoration: rem.is_sent ? 'line-through' : 'none' }}>
                      {rem.title}
                    </h4>
                    <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{new Date(rem.remind_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      {rem.is_recurring && (
                        <span className="badge badge-amber" style={{ fontSize: 9 }}>
                          <Repeat size={10} /> {rem.recurrence_rule}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => deleteReminder(rem.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
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
          <div className="animate-scale-in" style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
            padding: '24px 20px', zIndex: 110,
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
            maxWidth: 768, margin: '0 auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Schedule Reminder</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>
            <form onSubmit={createReminder} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                placeholder="Reminder title (e.g. Weekly Review)..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                style={{ fontSize: 15 }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, marginBottom: 6, display: 'block' }}>DATE & TIME</label>
                  <input
                    type="datetime-local"
                    value={remindAt}
                    onChange={e => setRemindAt(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, marginBottom: 6, display: 'block' }}>RECURRING</label>
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
              <button type="submit" disabled={saving || !title.trim()} className="btn btn-primary" style={{ height: 46 }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><Bell size={16} /> Set Reminder</>}
              </button>
            </form>
          </div>
        </>
      )}
    </AppShell>
  )
}
