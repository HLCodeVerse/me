'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { Plus, Flame, Loader2, X, Trash2, Sparkles, Send, Calendar, Check } from 'lucide-react'
import { toast } from 'sonner'
import { stripMarkdown } from '@/lib/utils'
import type { Task } from '@/lib/supabase/database.types'

export default function HabitsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [habits, setHabits] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [coaching, setCoaching] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState('daily')
  const [targetTime, setTargetTime] = useState('08:00')
  const [saving, setSaving] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]

  // Get last 7 days YYYY-MM-DD
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })

  const loadHabits = useCallback(async () => {
    try {
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', 'habit')
        .order('created_at', { ascending: false })

      setHabits(data ?? [])
    } catch {
      setHabits([])
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => { loadHabits() }, [loadHabits])

  async function createHabit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !user) return
    setSaving(true)
    const cleanName = stripMarkdown(name.trim())

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('tasks') as any).insert({
        user_id: user.id,
        title: cleanName,
        category: 'habit',
        frequency,
        due_time: targetTime || '08:00',
        completed_dates: {},
        status: 'todo',
      })

      if (error) {
        toast.error('Failed to create habit')
      } else {
        toast.success('Habit created!')
        setName('')
        setShowAddModal(false)
        loadHabits()
      }
    } catch {
      toast.error('Could not save habit')
    } finally {
      setSaving(false)
    }
  }

  async function handleAIHabitGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const promptToUse = aiPrompt.trim() || 'Create 1 daily habit for high focus'
    setCoaching(true)
    toast.info('AI is generating habit recommendation...')

    try {
      const customGrokKey = typeof window !== 'undefined' ? localStorage.getItem('nirmaan_grok_key') : null
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Suggest 1 habit title based on prompt: "${promptToUse}". Return ONLY plain text habit title under 6 words.`
          }],
          enableTools: false,
          grokApiKey: customGrokKey,
        })
      })

      if (!res.ok) throw new Error('AI Habit generation failed')

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('tasks') as any).insert({
        user_id: user.id,
        title: cleanText,
        category: 'habit',
        frequency: 'daily',
        completed_dates: {},
        status: 'todo'
      })

      setAiPrompt('')
      toast.success(`Habit "${cleanText}" created! 🔥`)
      loadHabits()
    } catch {
      toast.error('AI habit generation failed')
    } finally {
      setCoaching(false)
    }
  }

  async function toggleDateCompletion(habitId: string, dateStr: string) {
    if (!user) return
    const targetHabit = habits.find(h => h.id === habitId)
    if (!targetHabit) return

    const currentDates: Record<string, boolean> = (targetHabit.completed_dates as Record<string, boolean>) || {}
    const isCurrentlyDone = !!currentDates[dateStr]
    const updatedDates = { ...currentDates, [dateStr]: !isCurrentlyDone }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any).update({
      completed_dates: updatedDates,
      completed_at: !isCurrentlyDone ? new Date().toISOString() : targetHabit.completed_at
    }).eq('id', habitId)

    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, completed_dates: updatedDates } : h))
    toast.success(`Updated ${dateStr} status!`)
  }

  async function deleteHabit(id: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('tasks') as any).delete().eq('id', id)
      setHabits(prev => prev.filter(h => h.id !== id))
      toast.success('Habit deleted')
    } catch {
      toast.error('Could not delete habit')
    }
  }

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flame size={20} color="#FF4F81" className="animate-flame" />
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Habits & Daily Tracker</h1>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }}>
            <Plus size={15} /> Add Habit
          </button>
        </div>
      }
    >
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* AI Custom Prompt Bar */}
        <form onSubmit={handleAIHabitGenerate} className="card" style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)' }}>
          <Sparkles size={18} color="#7C3AED" style={{ flexShrink: 0 }} />
          <input
            className="glow-input"
            placeholder="Tell AI to generate habits (e.g., 'Create a daily habit to read 15 pages')..."
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', padding: 0, fontSize: 13 }}
          />
          <button
            type="submit"
            disabled={coaching}
            className="btn btn-primary"
            style={{ height: 34, padding: '0 12px', fontSize: 12, flexShrink: 0 }}
          >
            {coaching ? <Loader2 size={13} className="animate-spin" /> : <><Send size={13} /> AI Generate</>}
          </button>
        </form>

        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 'var(--radius-card)' }} />)
        ) : habits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Flame size={28} color="#EF4444" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Build life-changing habits</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 300, margin: '0 auto 20px' }}>
              Consistency is key. Track daily routines per date and build long streaks.
            </p>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
              <Plus size={15} /> Add First Habit
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {habits.map(habit => {
              const compDates: Record<string, boolean> = (habit.completed_dates as Record<string, boolean>) || {}
              const isTodayDone = !!compDates[todayStr]

              // Calculate current streak
              let streak = 0
              for (let i = 0; i < 30; i++) {
                const d = new Date()
                d.setDate(d.getDate() - i)
                const dateKey = d.toISOString().split('T')[0]
                if (compDates[dateKey]) {
                  streak++
                } else if (i > 0) {
                  break
                }
              }

              return (
                <div
                  key={habit.id}
                  className="card"
                  style={{
                    padding: '16px', background: 'var(--surface)',
                    borderLeft: `4px solid ${isTodayDone ? '#10B981' : '#FF4F81'}`,
                    borderRadius: 'var(--radius-card)',
                    borderTop: `1px solid ${isTodayDone ? 'rgba(16,185,129,0.3)' : 'rgba(255,79,129,0.2)'}`,
                    borderRight: `1px solid ${isTodayDone ? 'rgba(16,185,129,0.3)' : 'rgba(255,79,129,0.2)'}`,
                    borderBottom: `1px solid ${isTodayDone ? 'rgba(16,185,129,0.3)' : 'rgba(255,79,129,0.2)'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          {stripMarkdown(habit.title)}
                        </h4>
                        <span className="badge badge-pink" style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Flame size={10} /> {streak} day streak
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0', textTransform: 'capitalize' }}>
                        Frequency: {habit.frequency || 'daily'}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteHabit(habit.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* 7-day completion grid */}
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} /> Last 7 Days Completion
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                      {last7Days.map(dateStr => {
                        const isDoneOnDate = !!compDates[dateStr]
                        const isToday = dateStr === todayStr
                        const dayLabel = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'narrow' })

                        return (
                          <button
                            key={dateStr}
                            onClick={() => toggleDateCompletion(habit.id, dateStr)}
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                              padding: '6px 4px', borderRadius: 8,
                              border: `1px solid ${isToday ? '#FF4F81' : isDoneOnDate ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
                              background: isDoneOnDate ? 'rgba(16,185,129,0.18)' : 'var(--surface-2)',
                              color: isDoneOnDate ? '#10B981' : 'var(--text-secondary)',
                              cursor: 'pointer', transition: 'all 150ms ease',
                            }}
                          >
                            <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.8 }}>{dayLabel}</span>
                            <div style={{ marginTop: 3 }}>
                              {isDoneOnDate ? <Check size={12} color="#10B981" /> : <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)' }} />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Habit Modal */}
      {showAddModal && (
        <>
          <div className="overlay" onClick={() => setShowAddModal(false)} />
          <div className="animate-fade-in" style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: 'var(--surface)', border: '1px solid rgba(255,79,129,0.25)',
            borderRadius: 'var(--radius-card) var(--radius-card) 0 0',
            padding: '24px 20px', zIndex: 110,
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
            maxWidth: 768, margin: '0 auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>New Habit</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-secondary)" />
              </button>
            </div>
            <form onSubmit={createHabit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>HABIT NAME</label>
                <input
                  className="glow-input"
                  placeholder="e.g. 20 min Reading or Drink 3L Water..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  required
                  style={{ fontSize: 14 }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>FREQUENCY</label>
                  <select value={frequency} onChange={e => setFrequency(e.target.value)}>
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>EXECUTION TIME *</label>
                  <input type="time" value={targetTime} onChange={e => setTargetTime(e.target.value)} required />
                </div>
              </div>
              <button type="submit" disabled={saving || !name.trim()} className="btn btn-primary" style={{ height: 44, marginTop: 8 }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><Flame size={16} /> Create Habit</>}
              </button>
            </form>
          </div>
        </>
      )}
    </AppShell>
  )
}
