'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { Plus, Flame, CheckCircle2, Loader2, X, Trash2, Sparkles, Send } from 'lucide-react'
import { toast } from 'sonner'
import { stripMarkdown } from '@/lib/utils'
import type { Habit } from '@/lib/supabase/database.types'

interface HabitWithLog extends Habit {
  completed_today: boolean
  today_count: number
}

export default function HabitsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [habits, setHabits] = useState<HabitWithLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [coaching, setCoaching] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState('daily')
  const [targetCount, setTargetCount] = useState(1)
  const [saving, setSaving] = useState(false)

  const loadHabits = useCallback(async () => {
    try {
      if (!user) { setLoading(false); return }
      const today = new Date().toISOString().split('T')[0]

      const [habitsRes, logsRes] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', user.id).eq('archived', false),
        supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('logged_at', today),
      ])

      const rawHabits = (habitsRes.data ?? []) as Habit[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const logs = (logsRes.data ?? []) as any[]

      const loggedMap = new Map<string, number>()
      logs.forEach(l => loggedMap.set(l.habit_id, l.count || 1))

      const processed = rawHabits.map(h => ({
        ...h,
        today_count: loggedMap.get(h.id) ?? 0,
        completed_today: (loggedMap.get(h.id) ?? 0) >= (h.target_count || 1),
      }))

      setHabits(processed)
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
      const { error } = await (supabase.from('habits') as any).insert({
        user_id: user.id,
        name: cleanName,
        frequency,
        target_count: targetCount,
        color: '#EF4444',
        archived: false,
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
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Suggest 1 habit name based on instruction: "${promptToUse}". Return ONLY plain text habit title under 6 words without markdown or formatting.`
          }],
          enableTools: false
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
      await (supabase.from('habits') as any).insert({
        user_id: user.id,
        name: cleanText,
        frequency: 'daily',
        target_count: 1,
        color: '#EF4444',
        archived: false
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

  async function toggleHabitLog(habit: HabitWithLog) {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]

    try {
      if (habit.completed_today) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('habit_logs') as any)
          .delete()
          .eq('habit_id', habit.id)
          .eq('logged_at', today)
        toast.info('Habit log un-checked')
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('habit_logs') as any).upsert({
          habit_id: habit.id,
          user_id: user.id,
          logged_at: today,
          count: habit.target_count || 1,
        })
        toast.success(`Habit "${stripMarkdown(habit.name)}" completed today! 🔥`)
      }
    } catch {
      toast.error('Could not update habit log')
    }
    loadHabits()
  }

  async function deleteHabit(id: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('habits') as any).update({ archived: true }).eq('id', id)
      setHabits(prev => prev.filter(h => h.id !== id))
      toast.success('Habit archived')
    } catch {
      toast.error('Could not archive habit')
    }
  }

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flame size={20} color="#EF4444" />
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Habits & Streaks</h1>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }}>
            <Plus size={15} /> Add Habit
          </button>
        </div>
      }
    >
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* AI Custom Prompt Bar */}
        <form onSubmit={handleAIHabitGenerate} className="card" style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface)' }}>
          <Sparkles size={18} color="#EF4444" style={{ flexShrink: 0 }} />
          <input
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
          [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 74, borderRadius: 'var(--radius-card)' }} />)
        ) : habits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Flame size={28} color="#EF4444" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Build life-changing habits</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 300, margin: '0 auto 20px' }}>
              Consistency is key. Track daily routines and maintain your active streak.
            </p>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
              <Plus size={15} /> Add First Habit
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {habits.map(habit => (
              <div
                key={habit.id}
                className="card"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', background: habit.completed_today ? 'rgba(239,68,68,0.06)' : 'var(--surface)',
                  border: `1px solid ${habit.completed_today ? '#EF4444' : 'var(--border)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <button
                    onClick={() => toggleHabitLog(habit)}
                    style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: habit.completed_today ? '#EF4444' : 'var(--surface-2)',
                      border: `1px solid ${habit.completed_today ? '#EF4444' : 'var(--border)'}`,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {habit.completed_today ? (
                      <CheckCircle2 size={20} color="white" />
                    ) : (
                      <Flame size={20} color="var(--text-muted)" />
                    )}
                  </button>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{stripMarkdown(habit.name)}</h4>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0', textTransform: 'capitalize' }}>
                      {habit.frequency} · Target: {habit.target_count || 1}x daily
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="badge badge-danger" style={{ fontSize: 11 }}>
                    {habit.completed_today ? 'Done Today' : 'Pending'}
                  </span>
                  <button
                    onClick={() => deleteHabit(habit.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Habit Modal */}
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
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>New Habit</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-secondary)" />
              </button>
            </div>
            <form onSubmit={createHabit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>HABIT NAME</label>
                <input
                  placeholder="e.g. 20 min Reading..."
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
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>TARGET COUNT</label>
                  <input type="number" min={1} max={10} value={targetCount} onChange={e => setTargetCount(Number(e.target.value))} />
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
