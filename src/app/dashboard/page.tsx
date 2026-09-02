'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import ProgressRing from '@/components/helpo/ProgressRing'
import { AIInsightCard } from '@/components/helpo/AIComponents'
import EmptyState from '@/components/helpo/EmptyState'
import {
  Zap, Flame, Target, CheckCircle2, Bell,
  RefreshCw, StickyNote, Plus,
  BookOpen, Clock, Bot, Sparkles,
  ChevronRight, Check, Trash2,
  TrendingUp, CalendarDays, Award,
  Coffee, Sun, Sunset,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Task, Todo, Habit, Reminder, JournalEntry, Goal } from '@/lib/supabase/database.types'
import { createTodoistTask } from '@/lib/todoist'
import Link from 'next/link'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Good morning', icon: <Coffee size={20} color="#FBBF24" /> }
  if (h < 17) return { text: 'Good afternoon', icon: <Sun size={20} color="#FF8A3D" /> }
  return { text: 'Good evening', icon: <Sunset size={20} color="#FF4F81" /> }
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function getPriorityBadgeClass(priority: number) {
  if (priority === 1) return 'badge badge-p1'
  if (priority === 2) return 'badge badge-p2'
  if (priority === 3) return 'badge badge-p3'
  return 'badge badge-p4'
}

function getPriorityLabel(priority: number) {
  if (priority === 1) return 'High'
  if (priority === 2) return 'Medium'
  if (priority === 3) return 'Normal'
  return 'Low'
}

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [tasks, setTasks] = useState<Task[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [habitLogs, setHabitLogs] = useState<Record<string, boolean>>({})
  const [dataLoading, setDataLoading] = useState(true)

  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [activeTaskTab, setActiveTaskTab] = useState<'all' | 'high' | 'in_progress' | 'done'>('all')

  // Pomodoro
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60)
  const [pomodoroRunning, setPomodoroRunning] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]
  const greeting = getGreeting()

  const loadData = useCallback(async () => {
    if (!user) return
    setDataLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any
      const [tasksRes, habitsRes, goalsRes, remindersRes, journalRes, habitLogsRes] = await Promise.all([
        client.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(80),
        client.from('habits').select('*').eq('user_id', user.id).eq('archived', false).limit(20),
        client.from('goals').select('*').eq('user_id', user.id).eq('status', 'active').limit(10),
        client.from('reminders').select('*').eq('user_id', user.id).order('remind_at', { ascending: true }).limit(5),
        client.from('journal_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(7),
        client.from('habit_logs').select('habit_id').eq('user_id', user.id).eq('logged_at', todayStr),
      ])

      const rawTasks = (tasksRes.data ?? []) as Task[]
      setTasks(rawTasks)
      const todoItems = rawTasks.filter(t => (t.category || 'todo') === 'todo').map(t => ({
        id: t.id, user_id: t.user_id, title: t.title, is_done: t.status === 'done',
        due_date: t.due_date, due_time: t.due_time, created_at: t.created_at,
      })) as Todo[]
      setTodos(todoItems)
      setHabits(habitsRes.data ?? [])
      setGoals(goalsRes.data ?? [])
      setReminders(remindersRes.data ?? [])
      setJournalEntries(journalRes.data ?? [])
      // Map today's habit logs
      const logsMap: Record<string, boolean> = {}
      ;(habitLogsRes.data ?? []).forEach((l: { habit_id: string }) => { logsMap[l.habit_id] = true })
      setHabitLogs(logsMap)
    } catch {
      toast.error('Failed to load dashboard data')
    } finally {
      setDataLoading(false)
    }
  }, [user, supabase, todayStr])

  useEffect(() => { if (user) loadData() }, [user, loadData])

  // Pomodoro timer
  useEffect(() => {
    let t: NodeJS.Timeout
    if (pomodoroRunning && pomodoroTime > 0) t = setInterval(() => setPomodoroTime(p => p - 1), 1000)
    else if (pomodoroTime === 0) { setPomodoroRunning(false); toast.success('🎯 Pomodoro complete! Great focus session.') }
    return () => clearInterval(t)
  }, [pomodoroRunning, pomodoroTime])

  // Today's tasks
  const todayTasks = useMemo(() => tasks.filter(t => {
    const d = t.due_date ? t.due_date.split('T')[0] : todayStr
    return d === todayStr || (d < todayStr && t.status !== 'done')
  }), [tasks, todayStr])

  const filteredTasks = useMemo(() => {
    if (activeTaskTab === 'all') return todayTasks.slice(0, 8)
    if (activeTaskTab === 'high') return todayTasks.filter(t => t.priority <= 2).slice(0, 8)
    if (activeTaskTab === 'in_progress') return todayTasks.filter(t => t.status === 'in_progress').slice(0, 8)
    if (activeTaskTab === 'done') return todayTasks.filter(t => t.status === 'done').slice(0, 8)
    return todayTasks.slice(0, 8)
  }, [todayTasks, activeTaskTab])

  // Metrics
  const metrics = useMemo(() => {
    const doneTasks = todayTasks.filter(t => t.status === 'done').length
    const totalHabits = habits.length
    const doneHabits = Object.keys(habitLogs).length
    const lifeScore = profile?.life_score ?? 0
    const streak = profile?.current_streak ?? 0
    return { doneTasks, totalTasks: todayTasks.length, doneHabits, totalHabits, lifeScore, streak }
  }, [todayTasks, habits, habitLogs, profile])

  async function handleToggleTask(task: Task) {
    const next = task.status === 'done' ? 'todo' : 'done'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any).update({ status: next, completed_at: next === 'done' ? new Date().toISOString() : null }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t))
    if (next === 'done') toast.success('✅ Task completed! Great work.')
  }

  async function handleDeleteTask(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any).delete().eq('id', id).eq('user_id', user?.id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTaskTitle.trim() || !user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('tasks') as any).insert({
      user_id: user.id, title: newTaskTitle.trim(), priority: 3, status: 'todo',
      due_date: new Date().toISOString(),
    }).select().single()
    if (!error && data) {
      setTasks(prev => [data, ...prev])
      createTodoistTask(newTaskTitle.trim()).catch(() => {})
      toast.success('Task created!')
      setNewTaskTitle('')
    }
  }

  async function handleLogHabit(habitId: string) {
    if (!user || habitLogs[habitId]) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('habit_logs') as any).insert({ user_id: user.id, habit_id: habitId, logged_at: todayStr })
    setHabitLogs(prev => ({ ...prev, [habitId]: true }))
    toast.success('🔥 Habit logged! Keep the streak going.')
  }

  const name = profile?.display_name || user?.email?.split('@')[0] || 'there'

  const taskTabCounts = {
    all: todayTasks.length,
    high: todayTasks.filter(t => t.priority <= 2).length,
    in_progress: todayTasks.filter(t => t.status === 'in_progress').length,
    done: todayTasks.filter(t => t.status === 'done').length,
  }

  const upcomingReminders = reminders.filter(r => !r.is_sent).slice(0, 3)
  const todayHabits = habits.slice(0, 7)
  const journalStreak = journalEntries.length > 0 ? Math.min(14, journalEntries.length) : 0

  const pomodoroMins = Math.floor(pomodoroTime / 60)
  const pomodoroSecs = pomodoroTime % 60

  return (
    <AppShell>
      <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ─── HEADER ─── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {greeting.icon}
              <h1 style={{ fontSize: 26, fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                {greeting.text},{' '}
                <span className="text-gradient-primary">{name}!</span>
                {' '}👋
              </h1>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              {formatDate()} · {dataLoading ? 'Syncing...' : 'All systems live'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={loadData} className="btn btn-ghost btn-icon" title="Refresh">
              <RefreshCw size={16} color="var(--text-muted)" className={dataLoading ? 'animate-spin' : ''} />
            </button>
            <Link href="/reminders" className="btn btn-ghost btn-icon" style={{ position: 'relative' }}>
              <Bell size={18} color="var(--text-muted)" />
              {upcomingReminders.length > 0 && (
                <span style={{
                  position: 'absolute', top: 6, right: 6, width: 8, height: 8,
                  borderRadius: '50%', background: '#FF4F81',
                }} />
              )}
            </Link>
            <Link href="/settings" style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7C3AED, #FF4F81)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFFFFF', fontWeight: 800, fontSize: 14, textDecoration: 'none',
            }}>
              {name[0]?.toUpperCase() ?? 'U'}
            </Link>
          </div>
        </div>

        {/* ─── TOP METRIC CARDS ─── */}
        <div className="dashboard-metrics-grid">
          {/* Life Score */}
          <div className="card animate-fade-in-up" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ProgressRing size={44} strokeWidth={4} progress={metrics.lifeScore} color="#7C3AED">
              <span style={{ fontSize: 10, fontWeight: 900, color: '#7C3AED' }}>{metrics.lifeScore}</span>
            </ProgressRing>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Life Score</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#FFFFFF' }}>{metrics.lifeScore}<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/100</span></div>
              <div style={{ fontSize: 9.5, color: '#10B981', fontWeight: 700 }}>▲ Active</div>
            </div>
          </div>

          {/* Current Streak */}
          <div className="card animate-fade-in-up delay-75" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,79,129,0.12)', border: '1px solid rgba(255,79,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Flame size={22} color="#FF4F81" className="animate-flame" />
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Streak</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#FFFFFF' }}>{metrics.streak}<span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 2 }}>days</span></div>
              <div style={{ fontSize: 9.5, color: '#FF4F81', fontWeight: 700 }}>🏆 Best: {profile?.longest_streak ?? 0}d</div>
            </div>
          </div>

          {/* Tasks Completed */}
          <div className="card animate-fade-in-up delay-150" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle2 size={22} color="#3B82F6" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tasks Done</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#FFFFFF' }}>{metrics.doneTasks}<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/{metrics.totalTasks}</span></div>
              <div className="progress-bar" style={{ marginTop: 4, height: 4 }}>
                <div className="progress-bar-fill" style={{ width: metrics.totalTasks > 0 ? `${(metrics.doneTasks / metrics.totalTasks) * 100}%` : '0%', background: 'var(--gradient-blue)' }} />
              </div>
            </div>
          </div>

          {/* Habits Done */}
          <div className="card animate-fade-in-up delay-225" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Award size={22} color="#10B981" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Habits Done</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#FFFFFF' }}>{metrics.doneHabits}<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/{metrics.totalHabits}</span></div>
              <div style={{ fontSize: 9.5, color: '#10B981', fontWeight: 700 }}>
                {metrics.doneHabits === metrics.totalHabits && metrics.totalHabits > 0 ? '🚀 Done!' : 'Great start! 🌱'}
              </div>
            </div>
          </div>
        </div>

        {/* ─── MAIN 3-COLUMN GRID ─── */}
        <div className="dashboard-main-grid">

          {/* ── LEFT: Today's Plan ── */}
          <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={16} color="#7C3AED" />
                </div>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Today&apos;s Plan</h3>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>AI scheduled for your best day</p>
                </div>
              </div>
              <Link href="/dashboard?tab=plan" style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textDecoration: 'none' }}>
                View Full →
              </Link>
            </div>

            {/* Plan timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { time: '06:30 AM', label: 'Morning Routine', sub: 'Workout, Meditation, Journal', color: '#10B981', done: true },
                { time: '09:00 AM', label: 'Deep Work', sub: 'Focus on top priority task', color: '#3B82F6', done: false },
                { time: '11:00 AM', label: 'Review Goals', sub: 'Check weekly progress', color: '#7C3AED', done: false },
                { time: '01:30 PM', label: 'Learning', sub: '30 min learning session', color: '#FBBF24', done: false },
                { time: '04:30 PM', label: 'Tasks Wrap-up', sub: 'Complete remaining tasks', color: '#FF8A3D', done: false },
                { time: '08:00 PM', label: 'Reflect & Plan', sub: 'Daily review, plan tomorrow', color: '#FF4F81', done: false },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 3, height: 36, borderRadius: 99, background: item.done ? item.color : 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: item.color }}>{item.time}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: item.done ? 'var(--text-muted)' : '#FFFFFF', textDecoration: item.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.sub}</div>
                  </div>
                  {item.done && <Check size={14} color="#10B981" style={{ flexShrink: 0 }} />}
                </div>
              ))}
            </div>

            {/* Regenerate button */}
            <button className="btn btn-ai" style={{ width: '100%', fontSize: 12, marginTop: 4 }}>
              <Sparkles size={14} /> Regenerate Plan
            </button>
          </div>

          {/* ── CENTER: Today's Tasks ── */}
          <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={16} color="#3B82F6" />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Today&apos;s Tasks</h3>
              </div>
              <button
                className="btn btn-primary"
                style={{ fontSize: 12, padding: '6px 12px', gap: 5 }}
                onClick={() => router.push('/tasks')}
              >
                <Plus size={13} /> Add Task
              </button>
            </div>

            {/* Tab filter */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {(['all', 'high', 'in_progress', 'done'] as const).map(tab => {
                const labels = { all: `All (${taskTabCounts.all})`, high: `High (${taskTabCounts.high})`, in_progress: `In Progress (${taskTabCounts.in_progress})`, done: `Done (${taskTabCounts.done})` }
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTaskTab(tab)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 99,
                      border: `1px solid ${activeTaskTab === tab ? 'rgba(124,58,237,0.5)' : 'var(--border)'}`,
                      background: activeTaskTab === tab ? 'rgba(124,58,237,0.15)' : 'transparent',
                      color: activeTaskTab === tab ? '#8B5CF6' : 'var(--text-muted)',
                      fontSize: 12,
                      fontWeight: activeTaskTab === tab ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 150ms ease',
                    }}
                  >
                    {labels[tab]}
                  </button>
                )
              })}
            </div>

            {/* Quick add */}
            <form onSubmit={handleCreateTask} style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Quick add task..."
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                style={{ flex: 1, height: 36, fontSize: 13, padding: '0 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10 }}
              />
              <button type="submit" className="btn btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 12 }}>
                <Plus size={14} />
              </button>
            </form>

            {/* Task list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto', maxHeight: 280 }}>
              {dataLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 48, borderRadius: 10 }} />
                ))
              ) : filteredTasks.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 size={28} color="#3B82F6" />}
                  title="All clear!"
                  description="No tasks in this view. Add one above."
                />
              ) : filteredTasks.map(t => (
                <div
                  key={t.id}
                  className="card-hover"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10 }}
                >
                  <button
                    onClick={() => handleToggleTask(t)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                  >
                    {t.status === 'done' ? (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={12} color="#FFFFFF" />
                      </div>
                    ) : (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border)' }} />
                    )}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.status === 'done' ? 'var(--text-muted)' : '#FFFFFF', textDecoration: t.status === 'done' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.title}
                    </div>
                    {t.due_date && (
                      <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                        <CalendarDays size={10} style={{ display: 'inline', marginRight: 3 }} />
                        {new Date(t.due_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span className={getPriorityBadgeClass(t.priority)} style={{ fontSize: 10 }}>
                      {getPriorityLabel(t.priority)}
                    </span>
                    <button onClick={() => handleDeleteTask(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 0, opacity: 0.6 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Link href="/tasks" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              View all tasks <ChevronRight size={13} />
            </Link>
          </div>

          {/* ── RIGHT: Today's Habits ── */}
          <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,79,129,0.12)', border: '1px solid rgba(255,79,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Flame size={16} color="#FF4F81" />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Today&apos;s Habits</h3>
              </div>
              <Link href="/habits" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textDecoration: 'none' }}>View All</Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto' }}>
              {dataLoading ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 44, borderRadius: 10 }} />
              )) : todayHabits.length === 0 ? (
                <EmptyState
                  icon={<Flame size={24} color="#FF4F81" />}
                  title="No habits yet"
                  description="Create your first habit to track it here."
                  action={{ label: 'Add Habit', onClick: () => router.push('/habits') }}
                />
              ) : todayHabits.map(h => {
                const done = habitLogs[h.id] ?? false
                return (
                  <div
                    key={h.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 10,
                      background: done ? 'rgba(16,185,129,0.08)' : 'var(--surface-2)',
                      border: `1px solid ${done ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                      transition: 'all 200ms ease',
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{h.icon ?? '⭐'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: done ? 'var(--text-muted)' : '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.name}
                      </div>
                      <div style={{ fontSize: 10, color: '#FF4F81', fontWeight: 700 }}>
                        {(h as { streak_count?: number }).streak_count ?? 0} day streak 🔥
                      </div>
                    </div>
                    <button
                      onClick={() => handleLogHabit(h.id)}
                      disabled={done}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: done ? '#10B981' : 'rgba(255,255,255,0.06)',
                        border: `1.5px solid ${done ? '#10B981' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: done ? 'default' : 'pointer', transition: 'all 200ms ease',
                      }}
                    >
                      {done ? <Check size={14} color="#FFFFFF" /> : <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-dim)' }} />}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ─── SECOND ROW ─── */}
        <div className="dashboard-main-grid">

          {/* Upcoming Reminders */}
          <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={16} color="#FBBF24" />
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Upcoming Reminders</h3>
              </div>
              <Link href="/reminders" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textDecoration: 'none' }}>View All</Link>
            </div>
            {upcomingReminders.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0' }}>No upcoming reminders</p>
            ) : upcomingReminders.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FBBF24', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                    {new Date(r.remind_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, {new Date(r.remind_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* AI Assistant */}
          <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9,
                  background: 'linear-gradient(135deg, #6366F1, #FF4F81)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bot size={16} color="#FFFFFF" />
                </div>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>AI Assistant</h3>
                </div>
              </div>
              <span className="badge badge-purple" style={{ fontSize: 10 }}>Pro</span>
            </div>

            <AIInsightCard
              content={`Good ${greeting.text.split(' ')[1]}, ${name.split(' ')[0]}! ☀️ Shall I help you focus on your top priority task for today?`}
            />

            <button
              className="btn btn-ai"
              style={{ width: '100%', fontSize: 13 }}
              onClick={() => router.push('/ai')}
            >
              <Sparkles size={15} />
              Ask Helpo AI anything...
            </button>

            {/* Quick AI prompts */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Plan my day', 'What to focus on?', 'Review goals'].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => router.push(`/ai?q=${encodeURIComponent(prompt)}`)}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 99,
                    background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)',
                    color: '#8B5CF6', cursor: 'pointer',
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} color="#FBBF24" />
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Quick Actions</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Add Task', color: '#3B82F6', gradient: 'var(--gradient-blue)', icon: '✅', href: '/tasks' },
                { label: 'Log Habit', color: '#10B981', gradient: 'var(--gradient-emerald)', icon: '🔥', href: '/habits' },
                { label: 'Write Journal', color: '#FF4F81', gradient: 'var(--gradient-orange)', icon: '📖', href: '/journal' },
                { label: 'New Note', color: '#8B5CF6', gradient: 'var(--gradient-primary)', icon: '📝', href: '/notes' },
                { label: 'Pomodoro', color: '#FF8A3D', gradient: 'var(--gradient-orange)', icon: '⏱️', href: '#' },
                { label: 'Ask AI', color: '#7C3AED', gradient: 'var(--gradient-ai)', icon: '✨', href: '/ai' },
              ].map(a => (
                <Link
                  key={a.label}
                  href={a.href}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: 4,
                    padding: '10px 8px', borderRadius: 12,
                    background: `${a.gradient.replace('var(', '').replace(')', '')}`.includes('gradient')
                      ? a.gradient
                      : `rgba(124,58,237,0.1)`,
                    backgroundImage: a.gradient,
                    border: 'none', cursor: 'pointer', textDecoration: 'none',
                    transition: 'all 150ms ease',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{a.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#FFFFFF', textAlign: 'center' }}>{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ─── PROGRESS OVERVIEW BAR ─── */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} color="#7C3AED" />
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Your Progress Overview</h3>
            </div>
            <Link href="/analytics" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textDecoration: 'none' }}>
              View Insights →
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
            {[
              { label: 'Task Completion', value: metrics.totalTasks > 0 ? Math.round((metrics.doneTasks / metrics.totalTasks) * 100) : 0, suffix: '%', color: '#3B82F6', icon: '✅' },
              { label: 'Habit Consistency', value: metrics.totalHabits > 0 ? Math.round((metrics.doneHabits / metrics.totalHabits) * 100) : 0, suffix: '%', color: '#FF4F81', icon: '🔥' },
              { label: 'Learning Progress', value: 64, suffix: '%', color: '#22D3EE', icon: '📚' },
              { label: 'Journal Streak', value: journalStreak, suffix: ' days', color: '#FBBF24', icon: '📖' },
            ].map(stat => (
              <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{stat.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{stat.label}</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: stat.color }}>
                  {stat.value}{stat.suffix}
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${stat.suffix === '%' ? stat.value : Math.min(100, (stat.value / 30) * 100)}%`, background: `linear-gradient(90deg, ${stat.color}80, ${stat.color})` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Celebration banner */}
          {metrics.doneTasks > 3 && (
            <div style={{
              marginTop: 16, padding: '12px 16px',
              background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(255,138,61,0.12))',
              border: '1px solid rgba(251,191,36,0.3)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 24 }}>🏆</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#FBBF24' }}>You&apos;re on fire! 🔥</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Keep the momentum going and achieve greatness!</div>
              </div>
            </div>
          )}
        </div>

        {/* ─── GOALS SNAPSHOT ─── */}
        {goals.length > 0 && (
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Target size={16} color="#FF8A3D" />
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Active Goals</h3>
              </div>
              <Link href="/goals" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textDecoration: 'none' }}>View All →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {goals.slice(0, 4).map(g => (
                <div key={g.id} className="card-hover" style={{ padding: '12px 14px', borderRadius: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>
                    {g.title}
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${g.progress ?? 0}%` }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 5 }}>{g.progress ?? 0}% complete</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── AI DAILY BRIEF ─── */}
        <AIInsightCard
          title="Helpo AI — Daily Brief"
          content={`Today you have ${metrics.totalTasks} tasks planned, ${metrics.doneHabits}/${metrics.totalHabits} habits completed, and your streak is at ${metrics.streak} days. ${metrics.streak > 7 ? "Incredible consistency! 🔥" : "Keep building momentum!"}`}
          onAction={() => router.push('/ai?q=What+should+I+focus+on+today')}
          actionLabel="Ask AI for personalized advice"
        />

        {/* ─── JOURNAL SNIPPET ─── */}
        {journalEntries.length > 0 && (
          <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BookOpen size={20} color="#FBBF24" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>
                {journalEntries[0].title ?? 'Latest Journal Entry'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {journalEntries[0].content.slice(0, 80)}...
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <Link href="/journal" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
                Read More
              </Link>
              <Link href="/journal" className="btn btn-ai" style={{ padding: '6px 12px', fontSize: 12 }}>
                <Sparkles size={13} /> Reflect
              </Link>
            </div>
          </div>
        )}

        {/* ─── POMODORO MINI CARD ─── */}
        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,138,61,0.12)', border: '1px solid rgba(255,138,61,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} color="#FF8A3D" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Pomodoro Timer</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: pomodoroRunning ? '#FF8A3D' : '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
                {String(pomodoroMins).padStart(2, '0')}:{String(pomodoroSecs).padStart(2, '0')}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={pomodoroRunning ? 'btn btn-secondary' : 'btn btn-orange'}
              style={{ fontSize: 13, padding: '8px 16px' }}
              onClick={() => setPomodoroRunning(p => !p)}
            >
              {pomodoroRunning ? '⏸ Pause' : '▶ Start Focus'}
            </button>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 13, padding: '8px 12px' }}
              onClick={() => { setPomodoroRunning(false); setPomodoroTime(25 * 60) }}
            >
              ↺ Reset
            </button>
          </div>
        </div>

        {/* ─── NOTES SNIPPET ─── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StickyNote size={16} color="#8B5CF6" />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', margin: 0 }}>Quick Links</h3>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: '📚 Learning Hub', href: '/learn' },
              { label: '📊 Insights', href: '/analytics' },
              { label: '🎯 Goals', href: '/goals' },
              { label: '⚡ Life Score', href: '/life' },
            ].map(link => (
              <Link key={link.href} href={link.href} className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  )
}
