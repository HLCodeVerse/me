'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import {
  Zap, Flame, Target, CheckCircle2, Droplets, Moon, Footprints, Bell,
  Plus, Sparkles, Smile, Frown, Meh, Heart, Clock, ChevronRight, X, RotateCcw,
  Check, RefreshCw, Eye, EyeOff, Info, Award, StickyNote
} from 'lucide-react'
import { toast } from 'sonner'
import type { Task, Todo, Habit, Reminder, Note } from '@/lib/supabase/database.types'

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  // State
  const [tasks, setTasks] = useState<Task[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [pinnedNotes, setPinnedNotes] = useState<Note[]>([])
  const [waterMl, setWaterMl] = useState<number>(1800)
  const [todayMood, setTodayMood] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(true)

  // Modals & Modes
  const [focusMode, setFocusMode] = useState(false)
  const [focusTime, setFocusTime] = useState(25 * 60)
  const [focusTimerRunning, setFocusTimerRunning] = useState(false)
  const [showFormulaModal, setShowFormulaModal] = useState(false)
  const [showEndDayModal, setShowEndDayModal] = useState(false)
  const [endDayReflection, setEndDayReflection] = useState('')
  const [quickAddModalType, setQuickAddModalType] = useState<string | null>(null)
  const [quickAddTitle, setQuickAddTitle] = useState('')

  // Load Data
  const loadDashboardData = useCallback(async () => {
    if (!user) return
    setDataLoading(true)
    const today = new Date().toISOString().split('T')[0]

    try {
      const [tasksRes, todosRes, habitsRes, remindersRes, notesRes, waterRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).neq('status', 'done').order('priority', { ascending: true }).limit(5),
        supabase.from('todos').select('*').eq('user_id', user.id).eq('is_done', false).order('created_at', { ascending: false }).limit(5),
        supabase.from('habits').select('*').eq('user_id', user.id).eq('archived', false).limit(4),
        supabase.from('reminders').select('*').eq('user_id', user.id).eq('is_sent', false).order('remind_at').limit(3),
        supabase.from('notes').select('*').eq('user_id', user.id).eq('is_pinned', true).limit(2),
        supabase.from('water_logs').select('amount_ml').eq('user_id', user.id).eq('date', today),
      ])

      setTasks(tasksRes.data ?? [])
      setTodos(todosRes.data ?? [])
      setHabits(habitsRes.data ?? [])
      setReminders(remindersRes.data ?? [])
      setPinnedNotes(notesRes.data ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalWater = (waterRes.data ?? []).reduce((acc: number, curr: any) => acc + (curr.amount_ml || 0), 0)
      if (totalWater > 0) setWaterMl(totalWater)
    } catch {
      toast.error('Failed to load dashboard data')
    } finally {
      setDataLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    if (!loading && !user) router.replace('/auth')
    if (user) loadDashboardData()
  }, [user, loading, router, loadDashboardData])

  // Focus Pomodoro Timer
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (focusTimerRunning && focusTime > 0) {
      timer = setInterval(() => setFocusTime(t => t - 1), 1000)
    } else if (focusTime === 0) {
      setFocusTimerRunning(false)
      toast.success('Focus session completed! 🏆 +50 XP')
    }
    return () => clearInterval(timer)
  }, [focusTimerRunning, focusTime])

  // Keyboard Shortcuts (N = New Task, F = Focus Mode)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setQuickAddModalType('task')
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        setFocusMode(p => !p)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Actions
  async function completeTask(taskId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any).update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    toast.success('Task Completed! +30 XP ⚡')
  }

  async function completeTodo(todoId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('todos') as any).update({ is_done: true }).eq('id', todoId)
    setTodos(prev => prev.filter(t => t.id !== todoId))
    toast.success('Todo Checked! +15 XP 📝')
  }

  async function addWater(amount: number) {
    const newTotal = waterMl + amount
    setWaterMl(newTotal)
    if (user) {
      const today = new Date().toISOString().split('T')[0]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('water_logs') as any).insert({ user_id: user.id, date: today, amount_ml: amount })
    }
    toast.success(`+${amount}ml Water Logged! 💧`)
  }

  async function handleQuickAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!quickAddTitle.trim() || !user) return

    if (quickAddModalType === 'task') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('tasks') as any).insert({ user_id: user.id, title: quickAddTitle, priority: 2 }).select().single()
      if (data) setTasks(p => [data, ...p])
      toast.success('Task Added!')
    } else if (quickAddModalType === 'todo') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('todos') as any).insert({ user_id: user.id, title: quickAddTitle, is_done: false }).select().single()
      if (data) setTodos(p => [data, ...p])
      toast.success('Todo Added!')
    } else if (quickAddModalType === 'reminder') {
      const inOneHour = new Date(Date.now() + 3600000).toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('reminders') as any).insert({ user_id: user.id, title: quickAddTitle, remind_at: inOneHour }).select().single()
      if (data) setReminders(p => [...p, data])
      toast.success('Reminder Set for 1 hr from now! 🔔')
    }

    setQuickAddTitle('')
    setQuickAddModalType(null)
  }

  async function finalizeEndDay() {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('journal_entries') as any).insert({
      user_id: user.id,
      title: `End of Day Reflection - ${today}`,
      content: endDayReflection || 'Day completed and finalized with NIRMAAN OS.',
      mood: todayMood || 'good',
    })
    toast.success('Day Finalized & Life Score Saved! 🌙🏆')
    setShowEndDayModal(false)
  }

  if (loading || dataLoading) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0A0B0D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={32} color="#F59E0B" className="animate-spin" />
          <p style={{ color: '#9CA3AF', marginTop: 12, fontSize: 13, fontWeight: 600 }}>Loading NIRMAAN OS...</p>
        </div>
      </div>
    )
  }

  const lifeScore = profile?.life_score ?? 78
  const streakCount = profile?.current_streak ?? 12
  const topP1Task = tasks.find(t => t.priority === 1) || tasks[0]

  // FOCUS MODE OVERLAY
  if (focusMode) {
    const mins = Math.floor(focusTime / 60)
    const secs = focusTime % 60
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: '#0A0B0D',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24, textDecoration: 'none'
      }}>
        <button
          onClick={() => setFocusMode(false)}
          style={{ position: 'absolute', top: 24, right: 24, background: '#121318', border: '1px solid #F59E0B', color: '#FFF', padding: '8px 16px', borderRadius: 99, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}
        >
          <EyeOff size={16} color="#F59E0B" /> Exit Focus Mode
        </button>

        <div style={{ textAlign: 'center', maxWidth: 460 }}>
          <span className="badge badge-warning" style={{ marginBottom: 12, fontSize: 12 }}>DEEP FOCUS MODE</span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#FFF', marginBottom: 8 }}>
            {topP1Task ? topP1Task.title : 'Focus on your highest leverage task'}
          </h1>
          <p style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 28 }}>
            Eliminate all distractions. NIRMAAN OS is holding space for deep work.
          </p>

          <div style={{
            fontSize: 72, fontWeight: 900, fontFamily: 'monospace', color: '#F59E0B',
            textShadow: '0 0 30px rgba(245,158,11,0.4)', marginBottom: 28
          }}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => setFocusTimerRunning(p => !p)}
              style={{
                padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(135deg, #F59E0B, #EAB308)',
                color: '#0A0B0D', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer'
              }}
            >
              {focusTimerRunning ? 'Pause Timer' : 'Start Focus Session'}
            </button>
            <button
              onClick={() => setFocusTime(25 * 60)}
              style={{
                padding: '12px 18px', borderRadius: 12, background: '#121318',
                border: '1px solid var(--border)', color: '#FFF', fontWeight: 700, fontSize: 14, cursor: 'pointer'
              }}
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade-in">
        
        {/* 1. HERO ZONE (Top of Main) */}
        <div style={{
          background: 'linear-gradient(135deg, #121318 0%, #1A1C24 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 'var(--radius-card)',
          padding: '24px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1, minWidth: 280 }}>
            {/* Animated Circular Life Score Ring (0-100) */}
            <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
              <svg width="96" height="96" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
                <circle
                  cx="50" cy="50" r="42"
                  stroke="url(#goldGradient)" strokeWidth="8" fill="none"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * lifeScore) / 100}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                />
                <defs>
                  <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#EAB308" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ fontSize: 26, fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>{lifeScore}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.04em' }}>SCORE</span>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)', fontWeight: 800 }}>
                  <Zap size={12} fill="#F59E0B" /> +240 XP Today
                </span>
                <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 800 }}>
                  <Flame size={12} fill="#EF4444" /> {streakCount} Day Streak
                </span>
                <button
                  onClick={() => setShowFormulaModal(true)}
                  style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                >
                  <Info size={13} /> Formula
                </button>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#FFF', margin: '0 0 4px' }}>
                Good day, {profile?.display_name || 'Builder'} 👋
              </h2>
              <p style={{ fontSize: 12.5, color: '#9CA3AF', margin: 0 }}>
                {tasks.length} tasks left · {todos.length} todos pending · {(waterMl / 1000).toFixed(1)}L water logged
              </p>
            </div>
          </div>

          {/* Quick Hero Controls */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setFocusMode(true)}
              style={{
                padding: '10px 16px', borderRadius: 10,
                background: 'linear-gradient(135deg, #06B6D4, #0891B2)',
                color: '#FFFFFF', border: 'none', fontWeight: 800, fontSize: 12,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 4px 14px rgba(6,182,212,0.3)'
              }}
            >
              <Eye size={15} /> Focus Mode (F)
            </button>
            <button
              onClick={() => setShowEndDayModal(true)}
              style={{
                padding: '10px 16px', borderRadius: 10,
                background: '#121318', border: '1px solid #F59E0B',
                color: '#F59E0B', fontWeight: 800, fontSize: 12,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <Award size={15} /> End Day 🌙
            </button>
          </div>
        </div>

        {/* 2. QUICK OS ACTIONS (2x3 or Horizontal Pill Grid) */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#9CA3AF', letterSpacing: '0.06em', marginBottom: 10 }}>
            QUICK OS ACTIONS (PRESS N FOR NEW TASK)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            {[
              { label: '+ Task', type: 'task', color: '#EF4444', icon: Target },
              { label: '+ Todo', type: 'todo', color: '#06B6D4', icon: CheckCircle2 },
              { label: '+ Habit Log', type: 'habit', color: '#EF4444', icon: Flame },
              { label: '+ Water 250ml', action: () => addWater(250), color: '#EAB308', icon: Droplets },
              { label: '+ Water 500ml', action: () => addWater(500), color: '#EAB308', icon: Droplets },
              { label: '+ Reminder', type: 'reminder', color: '#F59E0B', icon: Bell },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={() => btn.action ? btn.action() : setQuickAddModalType(btn.type)}
                style={{
                  padding: '12px', borderRadius: 12, background: '#121318',
                  border: `1px solid ${btn.color}33`, color: '#FFFFFF',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                  transition: 'transform 150ms ease, border-color 150ms ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                <btn.icon size={16} color={btn.color} />
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. MAIN DASHBOARD CONTENT GRID (Today Focus + Right Rail) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 20 }}>
          
          {/* LEFT COLUMN: TODAY FOCUS & HEALTH STRIP */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Urgent P1/P2 Tasks Card */}
            <div style={{
              background: '#121318', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 'var(--radius-card)', padding: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={18} color="#EF4444" />
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#FFF', margin: 0 }}>Today’s Priority Tasks</h3>
                </div>
                <button onClick={() => router.push('/tasks')} style={{ background: 'none', border: 'none', color: '#06B6D4', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Show all ({tasks.length}) →
                </button>
              </div>

              {tasks.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                  🎉 All high-priority tasks completed for today!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tasks.map(t => (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', borderRadius: 10, background: '#1A1C24',
                        border: `1px solid ${t.priority === 1 ? '#EF444444' : '#F59E0B44'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                        <button
                          onClick={() => completeTask(t.id)}
                          style={{
                            width: 20, height: 20, borderRadius: 6, border: `2px solid ${t.priority === 1 ? '#EF4444' : '#F59E0B'}`,
                            background: 'transparent', cursor: 'pointer', flexShrink: 0
                          }}
                        />
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.title}
                        </span>
                      </div>
                      <span className={`badge ${t.priority === 1 ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: 10 }}>
                        P{t.priority} {t.priority === 1 ? 'Urgent' : 'High'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Daily Todos Checklist & Habits Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Daily Todos Checklist */}
              <div style={{ background: '#121318', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-card)', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: '#FFF', margin: 0 }}>Daily Todos</h4>
                  <button onClick={() => setQuickAddModalType('todo')} style={{ background: 'none', border: 'none', color: '#06B6D4', fontSize: 12, cursor: 'pointer' }}>+ Add</button>
                </div>
                {todos.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>No pending todos.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {todos.map(td => (
                      <div key={td.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#FFF' }}>
                        <input type="checkbox" onChange={() => completeTodo(td.id)} style={{ accentColor: '#06B6D4', cursor: 'pointer' }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{td.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Habits Row with Flame Counters */}
              <div style={{ background: '#121318', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-card)', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: '#FFF', margin: 0 }}>Habits Streaks</h4>
                  <button onClick={() => router.push('/habits')} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 12, cursor: 'pointer' }}>Manage →</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {habits.slice(0, 3).map(h => (
                    <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, background: '#1A1C24' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#FFF' }}>{h.icon} {h.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Flame size={12} fill="#EF4444" /> {streakCount}🔥
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. HEALTH STRIP (Electric Yellow Target) */}
            <div style={{
              background: '#121318', border: '1px solid rgba(234, 179, 8, 0.3)',
              borderRadius: 'var(--radius-card)', padding: 18,
              boxShadow: '0 4px 20px rgba(234, 179, 8, 0.1)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#EAB308', letterSpacing: '0.06em', marginBottom: 12 }}>
                DAILY HEALTH & HYDRATION STRIP
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, alignItems: 'center' }}>
                {/* Water Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#FFF', marginBottom: 6 }}>
                    <span>💧 Water Intake</span>
                    <span style={{ color: '#EAB308' }}>{(waterMl / 1000).toFixed(1)}L / 3.0L</span>
                  </div>
                  <div style={{ width: '100%', height: 8, borderRadius: 99, background: '#1A1C24', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min((waterMl / 3000) * 100, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #EAB308, #F59E0B)', borderRadius: 99 }} />
                  </div>
                </div>

                {/* Sleep */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: '#1A1C24' }}>
                  <Moon size={18} color="#EAB308" />
                  <div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>Sleep Last Night</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#FFF' }}>6h 40m (Optimal)</div>
                  </div>
                </div>

                {/* Steps */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: '#1A1C24' }}>
                  <Footprints size={18} color="#EAB308" />
                  <div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>Daily Steps</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#FFF' }}>7,420 / 10,000</div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT RAIL: REMINDERS, PINNED NOTES, MOOD, AI SUGGESTION CARD */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Cyan AI Insight Suggestion Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(8, 145, 178, 0.08))',
              border: '1px solid rgba(6, 182, 212, 0.4)', borderRadius: 'var(--radius-card)', padding: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Sparkles size={16} color="#06B6D4" />
                <span style={{ fontSize: 12, fontWeight: 800, color: '#06B6D4' }}>AI OS Suggestion</span>
              </div>
              <p style={{ fontSize: 12, color: '#FFF', margin: '0 0 10px', lineHeight: 1.45 }}>
                {tasks.length > 0 ? `You have ${tasks.length} open priority tasks. Recommend 45m deep focus block now.` : 'Awesome momentum! All core tasks cleared.'}
              </p>
              <button
                onClick={() => router.push('/ai')}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 8, background: '#06B6D4', color: '#0A0B0D', border: 'none', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}
              >
                Ask NIRMAAN AI →
              </button>
            </div>

            {/* Today Mood Quick Selector */}
            <div style={{ background: '#121318', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-card)', padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#FFF', marginBottom: 8 }}>How are you feeling today?</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                {[
                  { label: 'Ecstatic', emoji: '😍', key: 'amazing' },
                  { label: 'Calm', emoji: '🙂', key: 'good' },
                  { label: 'Meh', emoji: '😐', key: 'meh' },
                  { label: 'Tired', emoji: '😔', key: 'bad' },
                ].map(m => (
                  <button
                    key={m.key}
                    onClick={() => { setTodayMood(m.key); toast.success(`Mood logged as ${m.label}!`) }}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 8,
                      background: todayMood === m.key ? 'rgba(245,158,11,0.2)' : '#1A1C24',
                      border: `1px solid ${todayMood === m.key ? '#F59E0B' : 'transparent'}`,
                      cursor: 'pointer', fontSize: 18, textAlign: 'center'
                    }}
                  >
                    {m.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Next 3 Reminders */}
            <div style={{ background: '#121318', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-card)', padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Bell size={14} color="#F59E0B" />
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#FFF' }}>Next Reminders</span>
                </div>
                <button onClick={() => router.push('/reminders')} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 10, cursor: 'pointer' }}>View All</button>
              </div>

              {reminders.length === 0 ? (
                <p style={{ fontSize: 11.5, color: '#9CA3AF', margin: 0 }}>No upcoming alarms.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {reminders.map(r => (
                    <div key={r.id} style={{ padding: '6px 8px', borderRadius: 6, background: '#1A1C24', fontSize: 11.5, color: '#FFF', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{r.title}</span>
                      <span style={{ color: '#F59E0B', fontWeight: 700 }}>{new Date(r.remind_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pinned Notes (2 Max) */}
            <div style={{ background: '#121318', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-card)', padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StickyNote size={14} color="#06B6D4" />
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#FFF' }}>Pinned Notes</span>
                </div>
                <button onClick={() => router.push('/notes')} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 10, cursor: 'pointer' }}>Notes →</button>
              </div>

              {pinnedNotes.length === 0 ? (
                <p style={{ fontSize: 11.5, color: '#9CA3AF', margin: 0 }}>No pinned notes.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pinnedNotes.map(n => (
                    <div key={n.id} style={{ padding: '8px', borderRadius: 6, background: '#1A1C24', borderLeft: '3px solid #06B6D4' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#FFF' }}>{n.title || 'Untitled Note'}</div>
                      <div style={{ fontSize: 10.5, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 5. BOTTOM / FOOTER STRIP: WEEKLY XP & DOMAIN RADAR BREAKDOWN */}
        <div style={{
          background: '#121318', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 'var(--radius-card)', padding: 18,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20
        }}>
          {/* Weekly XP Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, color: '#FFF', marginBottom: 8 }}>
              <span>🏆 Weekly XP Target</span>
              <span style={{ color: '#F59E0B' }}>1,450 / 2,000 XP</span>
            </div>
            <div style={{ width: '100%', height: 10, borderRadius: 99, background: '#1A1C24', overflow: 'hidden' }}>
              <div style={{ width: '72.5%', height: '100%', background: 'linear-gradient(90deg, #F59E0B, #06B6D4)', borderRadius: 99 }} />
            </div>
          </div>

          {/* Domain Balance Mini Radar */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#FFF', marginBottom: 8 }}>Domain Balance Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, textAlign: 'center' }}>
              {[
                { domain: 'Career', score: '88%', color: '#06B6D4' },
                { domain: 'Health', score: '75%', color: '#EAB308' },
                { domain: 'Mind', score: '92%', color: '#F59E0B' },
                { domain: 'Wealth', score: '64%', color: '#EF4444' },
              ].map(d => (
                <div key={d.domain} style={{ padding: '6px 4px', borderRadius: 8, background: '#1A1C24', border: `1px solid ${d.color}33` }}>
                  <div style={{ fontSize: 10, color: '#9CA3AF' }}>{d.domain}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: d.color }}>{d.score}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* QUICK ADD MODAL */}
      {quickAddModalType && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#121318', border: '1px solid #F59E0B', borderRadius: 'var(--radius-card)', padding: 20, width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FFF', margin: 0, textTransform: 'capitalize' }}>
                Add New {quickAddModalType}
              </h3>
              <button onClick={() => setQuickAddModalType(null)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleQuickAddSubmit}>
              <input
                autoFocus
                value={quickAddTitle}
                onChange={e => setQuickAddTitle(e.target.value)}
                placeholder={`Enter ${quickAddModalType} title...`}
                style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: 8, background: '#1A1C24', border: '1px solid var(--border)', color: '#FFF', fontSize: 14, marginBottom: 14 }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setQuickAddModalType(null)} style={{ padding: '8px 14px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: '#FFF', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 18px', borderRadius: 8, background: 'linear-gradient(135deg, #F59E0B, #EAB308)', border: 'none', color: '#0A0B0D', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORMULA MODAL */}
      {showFormulaModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#121318', border: '1px solid #F59E0B', borderRadius: 'var(--radius-card)', padding: 22, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F59E0B', margin: 0 }}>NIRMAAN Life Score Formula</h3>
              <button onClick={() => setShowFormulaModal(false)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 12.5, color: '#E5E7EB', lineHeight: 1.5, marginBottom: 12 }}>
              Your Life Score (0–100) is dynamically computed every hour using weighted domain metrics:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#FFF' }}>
              <div style={{ padding: 8, borderRadius: 6, background: '#1A1C24' }}>✅ <strong>Task Execution (35%)</strong>: Completion of P1 & P2 priority tasks.</div>
              <div style={{ padding: 8, borderRadius: 6, background: '#1A1C24' }}>🔥 <strong>Habit Consistency (25%)</strong>: Active daily streak counters.</div>
              <div style={{ padding: 8, borderRadius: 6, background: '#1A1C24' }}>💧 <strong>Health & Hydration (20%)</strong>: Water intake log vs 3,000ml goal.</div>
              <div style={{ padding: 8, borderRadius: 6, background: '#1A1C24' }}>🧠 <strong>Mindset & Learning (20%)</strong>: Journal logs & study modules.</div>
            </div>
          </div>
        </div>
      )}

      {/* END DAY MODAL */}
      {showEndDayModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#121318', border: '1px solid #F59E0B', borderRadius: 'var(--radius-card)', padding: 22, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FFF', margin: 0 }}>Finalize Day & Life Score 🌙</h3>
              <button onClick={() => setShowEndDayModal(false)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>
              What is one key reflection or lesson from your day?
            </p>
            <textarea
              rows={3}
              value={endDayReflection}
              onChange={e => setEndDayReflection(e.target.value)}
              placeholder="Reflect on today..."
              style={{ width: '100%', padding: 10, borderRadius: 8, background: '#1A1C24', border: '1px solid var(--border)', color: '#FFF', fontSize: 13, marginBottom: 14 }}
            />
            <button
              onClick={finalizeEndDay}
              style={{ width: '100%', padding: '10px', borderRadius: 8, background: 'linear-gradient(135deg, #F59E0B, #EAB308)', border: 'none', color: '#0A0B0D', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
            >
              Complete Day & Save Score
            </button>
          </div>
        </div>
      )}

    </AppShell>
  )
}
