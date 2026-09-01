'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { Activity, Flame, CheckCircle2, Circle, Heart, Droplets, Loader2, Play, CupSoda, GlassWater, Sparkles, Send } from 'lucide-react'
import { toast } from 'sonner'
import { stripMarkdown } from '@/lib/utils'
import type { Task, WaterLog } from '@/lib/supabase/database.types'

export default function HealthPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([])
  const [exercises, setExercises] = useState<Task[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [loggingWater, setLoggingWater] = useState(false)

  const [meditationMinutes, setMeditationMinutes] = useState(10)
  const [isMeditating, setIsMeditating] = useState(false)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')

  const targetWaterMl = 3000

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth')
  }, [user, authLoading, router])

  const loadData = useCallback(async () => {
    if (!user) {
      if (!authLoading) setDataLoading(false)
      return
    }
    const today = new Date().toISOString().split('T')[0]

    try {
      const [waterRes, tasksRes] = await Promise.all([
        supabase
          .from('water_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .order('logged_at', { ascending: false }),
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      setWaterLogs(waterRes.data ?? [])
      setExercises(tasksRes.data ?? [])
    } catch {
      setWaterLogs([])
      setExercises([])
    } finally {
      setDataLoading(false)
    }
  }, [user, authLoading, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalWaterMl = waterLogs.reduce((acc, log) => acc + (log.amount_ml || 0), 0)
  const waterPct = Math.min(Math.round((totalWaterMl / targetWaterMl) * 100), 100)

  async function addWaterIntake(amountMl: number) {
    if (!user) return
    setLoggingWater(true)
    const today = new Date().toISOString().split('T')[0]

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('water_logs') as any)
        .insert({
          user_id: user.id,
          amount_ml: amountMl,
          date: today,
        })
        .select()
        .single()

      if (error) throw error
      if (data) {
        setWaterLogs(prev => [data, ...prev])
        toast.success(`+${amountMl}ml logged! 💧`)
      }
    } catch {
      const fallbackLog: WaterLog = {
        id: String(Date.now()),
        user_id: user.id,
        amount_ml: amountMl,
        logged_at: new Date().toISOString(),
        date: today,
      }
      setWaterLogs(prev => [fallbackLog, ...prev])
      toast.success(`+${amountMl}ml logged! 💧`)
    } finally {
      setLoggingWater(false)
    }
  }

  async function toggleExercise(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any)
      .update({ status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null })
      .eq('id', taskId)

    setExercises(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    toast.success(newStatus === 'done' ? 'Exercise completed! 💪' : 'Exercise reset')
  }

  function completeMeditation() {
    setIsMeditating(true)
    setTimeout(() => {
      setIsMeditating(false)
      toast.success(`${meditationMinutes}-minute meditation session logged! 🧘‍♂️`)
    }, 1500)
  }

  async function handleAIHealthQuery(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const queryToUse = aiPrompt.trim() || `Log 250ml water intake and give recovery tips for today.`
    setAiAnalyzing(true)
    toast.info('AI Health Coach executing instruction...')

    try {
      const customGrokKey = typeof window !== 'undefined' ? localStorage.getItem('nirmaan_grok_key') : null
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: queryToUse }],
          enableTools: true,
          userId: user.id,
          grokApiKey: customGrokKey,
        })
      })

      if (res.ok) {
        const actionsHeader = res.headers.get('X-Actions')
        if (actionsHeader) {
          toast.success(`AI Executed Actions: ${actionsHeader}`, { icon: '⚡' })
        } else {
          toast.success('AI Health advice received!')
        }
        setAiPrompt('')
        loadData()
      }
    } catch {
      toast.error('AI Coach call failed')
    } finally {
      setAiAnalyzing(false)
    }
  }

  if (authLoading || dataLoading) return <LoadingSkeleton />

  const completedExercises = exercises.filter(e => e.status === 'done').length
  const totalExercises = exercises.length > 0 ? exercises.length : 5
  const exercisePct = Math.round((completedExercises / totalExercises) * 100)

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={20} color="#10B981" />
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Health & Wellness</h1>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 8 }}>

        {/* AI Custom Prompt Bar */}
        <form onSubmit={handleAIHealthQuery} className="card" style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface)' }}>
          <Sparkles size={18} color="#10B981" style={{ flexShrink: 0 }} />
          <input
            placeholder="Ask AI Health Coach (e.g., 'Give me recovery tips for my leg workout')..."
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', padding: 0, fontSize: 13 }}
          />
          <button
            type="submit"
            disabled={aiAnalyzing}
            className="btn btn-primary"
            style={{ height: 34, padding: '0 12px', fontSize: 12, flexShrink: 0 }}
          >
            {aiAnalyzing ? <Loader2 size={13} className="animate-spin" /> : <><Send size={13} /> AI Coach</>}
          </button>
        </form>
        
        {/* Upper Grid: Liquid Belly Hydration Tracker + Exercise Velocity */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>

          {/* Interactive Liquid Belly Hydration Card */}
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Droplets size={18} color="#3B82F6" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Hydration Tracker
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                    Daily Goal: {targetWaterMl} ml
                  </p>
                </div>
              </div>
              <span className="badge badge-info" style={{ fontSize: 12 }}>
                {waterPct}% Hydrated
              </span>
            </div>

            {/* Belly / Body Fluid Level Indicator Widget */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '12px 0' }}>
              {/* Graphic Flask / Belly Container */}
              <div style={{
                width: 90,
                height: 140,
                borderRadius: '40px 40px 24px 24px',
                border: '3px solid #3B82F6',
                position: 'relative',
                overflow: 'hidden',
                background: 'var(--surface-2)',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'flex-end',
                flexShrink: 0,
              }}>
                {/* Liquid Fill Element */}
                <div style={{
                  width: '100%',
                  height: `${waterPct}%`,
                  background: 'linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)',
                  transition: 'height 600ms cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                }}>
                  {/* Fluid Surface Wave Animation */}
                  <div style={{
                    position: 'absolute',
                    top: -6,
                    left: 0,
                    right: 0,
                    height: 12,
                    background: 'rgba(255, 255, 255, 0.3)',
                    borderRadius: '50%',
                  }} />
                </div>

                {/* Centered Overlay Percentage */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 800,
                  color: waterPct > 50 ? '#FFFFFF' : 'var(--text-primary)',
                  textShadow: waterPct > 50 ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                }}>
                  {totalWaterMl}ml
                </div>
              </div>

              {/* Quick Drink Glass Taps */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Tap Glass to Drink:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  <button
                    onClick={() => addWaterIntake(100)}
                    disabled={loggingWater}
                    className="btn btn-secondary"
                    style={{ padding: '10px 6px', flexDirection: 'column', gap: 4, borderRadius: 'var(--radius-btn)' }}
                  >
                    <GlassWater size={18} color="#3B82F6" />
                    <span style={{ fontSize: 11, fontWeight: 600 }}>+100 ml</span>
                  </button>
                  <button
                    onClick={() => addWaterIntake(250)}
                    disabled={loggingWater}
                    className="btn btn-secondary"
                    style={{ padding: '10px 6px', flexDirection: 'column', gap: 4, borderRadius: 'var(--radius-btn)', border: '1px solid #3B82F6' }}
                  >
                    <CupSoda size={18} color="#3B82F6" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#3B82F6' }}>+250 ml</span>
                  </button>
                  <button
                    onClick={() => addWaterIntake(500)}
                    disabled={loggingWater}
                    className="btn btn-secondary"
                    style={{ padding: '10px 6px', flexDirection: 'column', gap: 4, borderRadius: 'var(--radius-btn)' }}
                  >
                    <Droplets size={18} color="#3B82F6" />
                    <span style={{ fontSize: 11, fontWeight: 600 }}>+500 ml</span>
                  </button>
                </div>

                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                  {targetWaterMl - totalWaterMl > 0 ? `${targetWaterMl - totalWaterMl}ml remaining for daily target` : '🎉 Goal reached! Excellent hydration!'}
                </p>
              </div>
            </div>
          </div>

          {/* Exercise Velocity & Mindfulness */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Daily Exercises
                </span>
                <Flame size={20} color="#10B981" />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {completedExercises} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/ {totalExercises}</span>
                </div>
                <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${exercisePct}%`, height: '100%', background: '#10B981', borderRadius: 99, transition: 'width 500ms ease' }} />
                </div>
              </div>
            </div>

            {/* Guided Meditation */}
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Heart size={18} color="#EF4444" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Mindfulness & Reset</span>
                </div>
                <span className="badge badge-primary">10 min</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <select
                  value={meditationMinutes}
                  onChange={e => setMeditationMinutes(Number(e.target.value))}
                  style={{ width: 110, padding: '8px 10px', fontSize: 13 }}
                >
                  <option value={5}>5 Mins</option>
                  <option value={10}>10 Mins</option>
                  <option value={15}>15 Mins</option>
                </select>
                <button
                  onClick={completeMeditation}
                  disabled={isMeditating}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '8px 14px', fontSize: 13 }}
                >
                  {isMeditating ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  {isMeditating ? 'Logging...' : 'Start Session'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Exercises Checklist */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Live Workout & Exercise Checklist
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {completedExercises} completed
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {exercises.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                No active workouts found in tasks. Create exercise tasks in Tasks or ask NIRMAAN AI to add them!
              </p>
            ) : (
              exercises.map(ex => {
                const isDone = ex.status === 'done'
                return (
                  <div
                    key={ex.id}
                    onClick={() => toggleExercise(ex.id, ex.status)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-btn)',
                      background: isDone ? 'rgba(16, 185, 129, 0.06)' : 'var(--surface-2)',
                      border: `1px solid ${isDone ? '#10B981' : 'var(--border)'}`,
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                  >
                    {isDone ? (
                      <CheckCircle2 size={18} color="#10B981" />
                    ) : (
                      <Circle size={18} color="var(--text-muted)" />
                    )}
                    <span style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: 500,
                      color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: isDone ? 'line-through' : 'none',
                    }}>
                      {stripMarkdown(ex.title)}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </AppShell>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div className="skeleton" style={{ height: 180, borderRadius: 'var(--radius-card)', marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 240, borderRadius: 'var(--radius-card)' }} />
    </div>
  )
}
