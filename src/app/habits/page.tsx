'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { Plus, Flame, CheckCircle2, Loader2, X, Brain, Zap, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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

  // Form state
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState('daily')
  const [targetCount, setTargetCount] = useState(1)
  const [saving, setSaving] = useState(false)

  const loadHabits = useCallback(async () => {
    if (!user) return
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
    setLoading(false)
  }, [user, supabase])

  useEffect(() => { loadHabits() }, [loadHabits])

  async function createHabit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !user) return
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('habits') as any).insert({
      user_id: user.id,
      name: name.trim(),
      frequency,
      target_count: targetCount,
      color: '#F43F5E',
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
    setSaving(false)
  }

  async function toggleHabitLog(habit: HabitWithLog) {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]

    if (habit.completed_today) {
      // Delete today log
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('habit_logs') as any)
        .delete()
        .eq('habit_id', habit.id)
        .eq('logged_at', today)
      toast.info('Habit log un-checked')
    } else {
      // Upsert today log
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('habit_logs') as any).upsert({
        habit_id: habit.id,
        user_id: user.id,
        logged_at: today,
        count: habit.target_count || 1,
      })
      toast.success(`Habit "${habit.name}" completed today! 🔥`)
    }
    loadHabits()
  }

  async function deleteHabit(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('habits') as any).update({ archived: true }).eq('id', id)
    setHabits(prev => prev.filter(h => h.id !== id))
    toast.success('Habit archived')
  }

  async function aiHabitCoach() {
    if (!user) return
    setCoaching(true)
    toast.info('AI Habit Coach is building habit recommendations...')
    try {
      const hNames = habits.map(h => h.name).join(', ')
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Give me 2 quick tips to maintain consistency for my habits: ${hNames || 'reading, workout, meditation'}`
          }],
          enableTools: false
        })
      })

      if (res.ok) {
        toast.success('Check AI Chat for personalized Habit tips!')
      }
    } catch {
      toast.error('Habit coach call failed')
    } finally {
      setCoaching(false)
    }
  }

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flame size={20} color="#F43F5E" />
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Habits & Streaks</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={aiHabitCoach}
              disabled={coaching}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '0 12px', height: 36,
                borderRadius: 'var(--radius-sm)', background: 'rgba(244,63,94,0.15)',
                border: '1px solid rgba(244,63,94,0.3)', cursor: 'pointer',
                color: '#F43F5E', fontSize: 12, fontWeight: 700
              }}
            >
              {coaching ? <Loader2 size={13} className="animate-spin" /> : <Brain size={13} />}
              AI Coach
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>
              <Plus size={15} /> Add Habit
            </button>
          </div>
        </div>
      }
    >
      <div style={{ paddingTop: 16 }}>
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 74, borderRadius: 'var(--radius)', marginBottom: 10 }} />)
        ) : habits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(244,63,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Flame size={28} color="#F43F5E" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Build life-changing habits</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 280, margin: '0 auto 24px' }}>
              Consistency is key. Track daily routines and maintain your active streak.
            </p>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
              <Plus size={16} /> Add First Habit
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
                  padding: '14px 16px', background: habit.completed_today ? 'rgba(244,63,94,0.06)' : 'var(--surface)',
                  border: `1px solid ${habit.completed_today ? 'rgba(244,63,94,0.25)' : 'var(--border)'}`,
                  transition: 'all 200ms ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <button
                    onClick={() => toggleHabitLog(habit)}
                    style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: habit.completed_today ? '#F43F5E' : 'var(--surface-2)',
                      border: `1px solid ${habit.completed_today ? '#F43F5E' : 'var(--border)'}`,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 200ms'
                    }}
                  >
                    {habit.completed_today ? (
                      <CheckCircle2 size={20} color="white" />
                    ) : (
                      <Flame size={20} color="var(--text-dim)" />
                    )}
                  </button>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{habit.name}</h4>
                    <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, textTransform: 'capitalize' }}>
                      {habit.frequency} · Target: {habit.target_count || 1}x daily
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="badge badge-rose" style={{ fontSize: 11 }}>
                    <Zap size={11} /> {habit.completed_today ? 'Done Today' : 'Pending'}
                  </span>
                  <button
                    onClick={() => deleteHabit(habit.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
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
          <div className="animate-scale-in" style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
            padding: '24px 20px', zIndex: 110,
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
            maxWidth: 768, margin: '0 auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>New Habit</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>
            <form onSubmit={createHabit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                placeholder="Habit name (e.g. 20 min Reading)..."
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                required
                style={{ fontSize: 15 }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, marginBottom: 6, display: 'block' }}>FREQUENCY</label>
                  <select value={frequency} onChange={e => setFrequency(e.target.value)}>
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, marginBottom: 6, display: 'block' }}>TARGET COUNT</label>
                  <input type="number" min={1} max={10} value={targetCount} onChange={e => setTargetCount(Number(e.target.value))} />
                </div>
              </div>
              <button type="submit" disabled={saving || !name.trim()} className="btn btn-primary" style={{ height: 46 }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><Flame size={16} /> Create Habit</>}
              </button>
            </form>
          </div>
        </>
      )}
    </AppShell>
  )
}
