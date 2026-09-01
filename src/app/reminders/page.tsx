'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { Plus, Bell, Clock, Repeat, Loader2, X, Brain, Trash2, CheckCircle2, Sparkles, Send } from 'lucide-react'
import { toast } from 'sonner'
import { stripMarkdown } from '@/lib/utils'
import type { Reminder } from '@/lib/supabase/database.types'

export default function RemindersPage() {
  const { user } = useAuth()
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

    // Properly parse input datetime to ISO string
    let parsedDateIso: string
    if (remindAt) {
      try {
        parsedDateIso = new Date(remindAt).toISOString()
      } catch {
        parsedDateIso = new Date(Date.now() + 3600000).toISOString()
      }
    } else {
      parsedDateIso = new Date(Date.now() + 3600000).toISOString()
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('reminders') as any).insert({
        user_id: user.id,
        title: stripMarkdown(title.trim()),
        remind_at: parsedDateIso,
        is_recurring: isRecurring,
        recurrence_rule: isRecurring ? recurrenceRule : null,
        is_sent: false,
      })

      if (error) throw error

      toast.success('Reminder scheduled! 🔔')
      setTitle('')
      setRemindAt('')
      setShowAddModal(false)
      loadReminders()
    } catch {
      toast.error('Failed to set reminder. Check date format.')
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
    const promptToUse = aiInput.trim() || 'Suggest 1 high-priority productivity reminder'
    setAiPrompting(true)
    toast.info('AI is generating reminder from your instruction...')

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Extract or create 1 clean reminder title based on this instruction: "${promptToUse}". Return ONLY plain text title under 8 words without formatting, quotes, or markdown symbols.`
          }],
          enableTools: false
        })
      })

      if (!res.ok) throw new Error('AI processing failed')

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

      const cleanText = stripMarkdown(sugText)
      setTitle(cleanText)
      setAiInput('')
      setShowAddModal(true)
      toast.success(`AI prepared reminder: "${cleanText}"`)
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
            <Bell size={20} color="#F59E0B" />
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
          <Sparkles size={18} color="#F59E0B" style={{ flexShrink: 0 }} />
          <input
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

        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 74, borderRadius: 'var(--radius-card)' }} />)
        ) : reminders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Bell size={28} color="#F59E0B" />
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
                  borderLeft: `3px solid ${rem.is_sent ? 'var(--text-muted)' : '#F59E0B'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={() => toggleReminderSent(rem)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {rem.is_sent ? <CheckCircle2 size={18} color="#10B981" /> : <Clock size={18} color="#F59E0B" />}
                  </button>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, textDecoration: rem.is_sent ? 'line-through' : 'none' }}>
                      {stripMarkdown(rem.title)}
                    </h4>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{new Date(rem.remind_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      {rem.is_recurring && (
                        <span className="badge badge-warning" style={{ fontSize: 9 }}>
                          <Repeat size={10} /> {rem.recurrence_rule}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => deleteReminder(rem.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
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
