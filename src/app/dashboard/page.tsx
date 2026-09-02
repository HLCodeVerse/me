'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import CircularMetricsGauge from '@/components/dashboard/CircularMetricsGauge'
import DateTimelineFilter from '@/components/dashboard/DateTimelineFilter'
import AIVoiceTalkBar from '@/components/common/AIVoiceTalkBar'
import {
  Zap, Flame, Target, CheckCircle2, Droplets, Bell,
  RefreshCw, StickyNote, Plus,
  BookOpen, Clock, ShieldCheck,
  CircleCheck, Check, Trash2, Layers, LayoutDashboard, CalendarDays
} from 'lucide-react'
import { toast } from 'sonner'
import type { Task, Todo, Habit, Reminder, Note, Goal, JournalEntry } from '@/lib/supabase/database.types'
import { createTodoistTask } from '@/lib/todoist'

type DashboardTab = 'overview' | 'timeline' | 'habits' | 'secondary'

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  // Active Main Tab State
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')

  // Live Database States
  const [tasks, setTasks] = useState<Task[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [pinnedNotes, setPinnedNotes] = useState<Note[]>([])
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [waterMl, setWaterMl] = useState<number>(0)
  const [dataLoading, setDataLoading] = useState(true)

  // Quick Action Form States
  const [newTasksTitle, setNewTasksTitle] = useState('')
  const [newTasksDueDate, setNewTasksDueDate] = useState('')
  const [newTasksPriority] = useState(3)

  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [newHabitName, setNewHabitName] = useState('')
  const [newGoalTitle, setNewGoalTitle] = useState('')

  // Pomodoro Focus Mode State
  const [focusMode, setFocusMode] = useState(false)
  const [focusTime, setFocusTime] = useState(25 * 60)
  const [focusTimerRunning, setFocusTimerRunning] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]

  // Load All Live Supabase Table Data
  const loadDashboardData = useCallback(async () => {
    if (!user) return
    setDataLoading(true)
    const today = new Date().toISOString().split('T')[0]

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any
      const [tasksRes, todosRes, habitsRes, goalsRes, remindersRes, notesRes, journalRes, waterRes] = await Promise.all([
        client.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(60),
        client.from('todos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(60),
        client.from('habits').select('*').eq('user_id', user.id).eq('archived', false).limit(20),
        client.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(15),
        client.from('reminders').select('*').eq('user_id', user.id).order('remind_at', { ascending: true }).limit(15),
        client.from('notes').select('*').eq('user_id', user.id).limit(15),
        client.from('journal_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(15),
        client.from('water_logs').select('amount_ml').eq('user_id', user.id).eq('date', today),
      ])

      setTasks(tasksRes.data ?? [])
      setTodos(todosRes.data ?? [])
      setHabits(habitsRes.data ?? [])
      setGoals(goalsRes.data ?? [])
      setReminders(remindersRes.data ?? [])
      setPinnedNotes(notesRes.data ?? [])
      setJournalEntries(journalRes.data ?? [])

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalWater = (waterRes.data ?? []).reduce((acc: number, curr: any) => acc + (curr.amount_ml || 0), 0)
      setWaterMl(totalWater)
    } catch {
      toast.error('Failed to synchronize live dashboard metrics')
    } finally {
      setDataLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    if (user) loadDashboardData()
  }, [user, loadDashboardData])

  // Pomodoro Timer Loop
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (focusTimerRunning && focusTime > 0) {
      timer = setInterval(() => setFocusTime(t => t - 1), 1000)
    } else if (focusTime === 0) {
      setFocusTimerRunning(false)
      toast.success('Pomodoro Focus Session Completed! +50 XP 🎯')
    }
    return () => clearInterval(timer)
  }, [focusTimerRunning, focusTime])

  // Computed Metrics for Circular Gauges
  const metrics = useMemo(() => {
    const totalTasks = tasks.length
    const doneTasks = tasks.filter(t => t.status === 'done').length

    const totalTodos = todos.length
    const doneTodos = todos.filter(t => t.is_done).length

    const totalItems = totalTasks + totalTodos
    const completedCount = doneTasks + doneTodos

    const productivityPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0

    // Overdue items calculation
    const overdueTasks = tasks.filter(t => t.due_date && t.due_date.split('T')[0] < todayStr && t.status !== 'done').length
    const overdueTodos = todos.filter(t => t.due_date && t.due_date < todayStr && !t.is_done).length
    const overdueCount = overdueTasks + overdueTodos
    const negligencePercent = totalItems > 0 ? Math.round((overdueCount / totalItems) * 100) : 0

    // Habit Streak & Consistency calculation
    const totalHabits = habits.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maxStreak = habits.reduce((max, h) => Math.max(max, (h as any).streak_count || 1), 1)
    const consistencyPercent = totalHabits > 0 ? Math.min(100, Math.round((maxStreak / 7) * 100)) : 50

    // Life Score calculation
    const dbLifeScore = profile?.life_score || 0
    const lifeScorePercent = dbLifeScore > 0 ? Math.min(100, dbLifeScore) : Math.round((productivityPercent + consistencyPercent) / 2)

    return {
      productivityPercent,
      consistencyPercent,
      negligencePercent,
      lifeScorePercent,
      overdueCount,
      completedCount,
      totalItems,
      streakCount: maxStreak,
    }
  }, [tasks, todos, habits, profile, todayStr])



  // Toggle Task Status (Complete <-> Todo)
  async function handleToggleTaskStatus(task: Task) {
    const nextStatus = task.status === 'done' ? 'todo' : 'done'
    const nextCompletedAt = nextStatus === 'done' ? new Date().toISOString() : null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any)
      .update({ status: nextStatus, completed_at: nextCompletedAt })
      .eq('id', task.id)

    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus, completed_at: nextCompletedAt } : t))
    toast.success(nextStatus === 'done' ? 'Task Completed! +30 XP ⚡' : 'Task Reopened ↩️')
  }

  // Delete Task
  async function handleDeleteTask(taskId: string) {
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any).delete().eq('id', taskId).eq('user_id', user.id)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    toast.success('Task deleted')
  }

  // Toggle Todo Status (Done <-> Pending)
  async function handleToggleTodoStatus(todo: Todo) {
    const nextDone = !todo.is_done

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('todos') as any)
      .update({ is_done: nextDone })
      .eq('id', todo.id)

    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, is_done: nextDone } : t))
    toast.success(nextDone ? 'Todo Checked! +15 XP 📝' : 'Todo Unchecked ↩️')
  }

  // Delete Todo
  async function handleDeleteTodo(todoId: string) {
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('todos') as any).delete().eq('id', todoId).eq('user_id', user.id)
    setTodos(prev => prev.filter(t => t.id !== todoId))
    toast.success('Todo deleted')
  }

  // Water Hydration Logger
  async function handleAddWater(amount: number) {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const newTotal = waterMl + amount
    setWaterMl(newTotal)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('water_logs') as any).insert({
      user_id: user.id,
      amount_ml: amount,
      date: today,
    })
    toast.success(`Logged ${amount}ml water! 💧 Total: ${newTotal}ml`)
  }

  // Quick Create Task
  async function handleCreateTask(titleStr: string, dateStr?: string) {
    if (!titleStr.trim() || !user) return
    const targetDueDate = dateStr ? new Date(dateStr).toISOString() : newTasksDueDate ? new Date(newTasksDueDate).toISOString() : null

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('tasks') as any).insert({
        user_id: user.id,
        title: titleStr.trim(),
        priority: newTasksPriority,
        due_date: targetDueDate,
        status: 'todo',
      }).select().single()

      if (!error && data) {
        setTasks(prev => [data, ...prev])
        createTodoistTask(titleStr.trim(), undefined, dateStr || newTasksDueDate, undefined, newTasksPriority).catch(() => {})
        toast.success('Task created & synced! 📋')
        setNewTasksTitle('')
        setNewTasksDueDate('')
      }
    } catch {
      toast.error('Failed to create task')
    }
  }

  // Quick Create Todo
  async function handleCreateTodo(e: React.FormEvent) {
    e.preventDefault()
    if (!newTodoTitle.trim() || !user) return

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('todos') as any).insert({
        user_id: user.id,
        title: newTodoTitle.trim(),
        is_done: false,
        due_date: todayStr,
      }).select().single()

      if (!error && data) {
        setTodos(prev => [data, ...prev])
        createTodoistTask(newTodoTitle.trim()).catch(() => {})
        toast.success('Todo checklist item added! 📝')
        setNewTodoTitle('')
      }
    } catch {
      toast.error('Failed to add todo')
    }
  }

  // Check-in Habit Log
  async function handleCheckinHabit(habitId: string) {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('habit_logs') as any).insert({
        user_id: user.id,
        habit_id: habitId,
        logged_at: today,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setHabits(prev => prev.map(h => h.id === habitId ? { ...h, streak_count: ((h as any).streak_count || 1) + 1 } : h))
      toast.success('Habit Checked-in Today! 🔥 +20 XP')
    } catch {
      toast.error('Could not log habit')
    }
  }

  // Quick Add Habit
  async function handleCreateHabit(e: React.FormEvent) {
    e.preventDefault()
    if (!newHabitName.trim() || !user) return

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('habits') as any).insert({
        user_id: user.id,
        name: newHabitName.trim(),
        frequency: 'daily',
        target_count: 1,
        archived: false,
      }).select().single()

      if (!error && data) {
        setHabits(prev => [data, ...prev])
        toast.success('New Habit Created! 🔥')
        setNewHabitName('')
      }
    } catch {
      toast.error('Failed to create habit')
    }
  }

  // Quick Add Goal
  async function handleCreateGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!newGoalTitle.trim() || !user) return

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('goals') as any).insert({
        user_id: user.id,
        title: newGoalTitle.trim(),
        status: 'in_progress',
      }).select().single()

      if (!error && data) {
        setGoals(prev => [data, ...prev])
        toast.success('New Life Goal Set! 🎯')
        setNewGoalTitle('')
      }
    } catch {
      toast.error('Failed to set goal')
    }
  }

  const name = profile?.display_name || user?.email?.split('@')[0] || 'Member'

  const mainTabs: { key: DashboardTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'overview', label: 'Main Overview', icon: <LayoutDashboard size={16} /> },
    { key: 'timeline', label: 'Date Timeline & Items', icon: <CalendarDays size={16} />, badge: tasks.length + todos.length },
    { key: 'habits', label: 'Habits & Goals', icon: <Flame size={16} />, badge: habits.length },
    { key: 'secondary', label: 'Secondary & Archived Data', icon: <Layers size={16} />, badge: pinnedNotes.length + journalEntries.length },
  ]

  return (
    <AppShell>
      <div style={{ paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Minimal Modern Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Zap size={13} color="#FFD700" /> NIRMAAN Personal OS v5.2
              </span>
              <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={13} color="#10B981" /> Live Sync Active
              </span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#FFFFFF', margin: '4px 0 2px', letterSpacing: '-0.02em' }}>
              Welcome back, {name}! ⚡
            </h1>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
              Minimalist workspace organized chronologically by date with real-time level line analytics.
            </p>
          </div>

          {/* Quick Header Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/tasks')}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: 12.5 }}
            >
              <CheckCircle2 size={15} color="#3B82F6" /> Tasks Board
            </button>
            <button
              onClick={() => router.push('/journal')}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: 12.5 }}
            >
              <BookOpen size={15} color="#10B981" /> Journal Reader
            </button>
            <button
              onClick={() => setFocusMode(!focusMode)}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: 12.5 }}
            >
              <Clock size={15} color="#F59E0B" /> Pomodoro {focusMode ? 'Active' : ''}
            </button>
            <button
              onClick={loadDashboardData}
              className="btn btn-ghost btn-icon"
              title="Refresh Live Data"
              style={{ border: '1px solid rgba(255, 255, 255, 0.1)', width: 38, height: 38 }}
            >
              <RefreshCw size={16} color="#FFD700" className={dataLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* 4 MODERN SVG CIRCULAR METRIC GAUGE LEVEL LINES */}
        <CircularMetricsGauge
          productivityPercent={metrics.productivityPercent}
          consistencyPercent={metrics.consistencyPercent}
          negligencePercent={metrics.negligencePercent}
          lifeScorePercent={metrics.lifeScorePercent}
          overdueCount={metrics.overdueCount}
          completedCount={metrics.completedCount}
          totalItems={metrics.totalItems}
          streakCount={metrics.streakCount}
        />

        {/* NAVIGATION TAB BAR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: 4,
            overflowX: 'auto',
          }}
        >
          {mainTabs.map(t => {
            const isActive = activeTab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, #1A1C24, #121318)' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#9CA3AF',
                  fontSize: 13,
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderBottom: isActive ? '2px solid #3B82F6' : '2px solid transparent',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.icon}
                <span>{t.label}</span>
                {t.badge !== undefined && t.badge > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: 99,
                      background: isActive ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                      color: isActive ? '#60A5FA' : '#9CA3AF',
                    }}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* TAB 1: MAIN OVERVIEW & DAILY AGENDA */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Real-Time AI Voice Talk Bar & Mistral Audio TTS */}
            <AIVoiceTalkBar userId={user?.id} onActionComplete={loadDashboardData} />

            {/* Grid layout for Today's Tasks & Checklist Todos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
              
              {/* Primary Tasks Board */}
              <div
                style={{
                  background: '#0A0B0D',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  borderRadius: 22,
                  padding: 20,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={18} color="#3B82F6" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Primary Tasks Agenda</h3>
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>{tasks.filter(t => t.status === 'done').length} of {tasks.length} Done</span>
                    </div>
                  </div>
                </div>

                {/* Create Quick Task Form */}
                <form
                  onSubmit={e => {
                    e.preventDefault()
                    if (newTasksTitle) handleCreateTask(newTasksTitle)
                  }}
                  style={{ display: 'flex', gap: 8 }}
                >
                  <input
                    type="text"
                    placeholder="Quick add task..."
                    value={newTasksTitle}
                    onChange={e => setNewTasksTitle(e.target.value)}
                    style={{ flex: 1, height: 36, background: '#121318', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 8, color: '#FFFFFF', fontSize: 12, padding: '0 10px', outline: 'none' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 12, background: '#3B82F6' }}>
                    <Plus size={14} /> Add
                  </button>
                </form>

                {/* Tasks List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                  {tasks.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>No tasks found.</div>
                  ) : (
                    tasks.slice(0, 10).map(t => (
                      <div
                        key={t.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#121318',
                          padding: '10px 14px',
                          borderRadius: 12,
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button onClick={() => handleToggleTaskStatus(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            {t.status === 'done' ? <CheckCircle2 size={18} color="#10B981" /> : <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid #9CA3AF' }} />}
                          </button>
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#FFFFFF', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>
                              {t.title}
                            </div>
                            {t.due_date && <div style={{ fontSize: 10, color: '#9CA3AF' }}>{new Date(t.due_date).toLocaleDateString()}</div>}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: t.status === 'done' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: t.status === 'done' ? '#34D399' : '#60A5FA' }}>
                            {t.status === 'done' ? 'Done' : `P${t.priority || 3}`}
                          </span>
                          <button onClick={() => handleDeleteTask(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 2 }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Daily Checklist Todos Board */}
              <div
                style={{
                  background: '#0A0B0D',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: 22,
                  padding: 20,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CircleCheck size={18} color="#10B981" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Daily Checklist Todos</h3>
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>{todos.filter(t => t.is_done).length} of {todos.length} Checked</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleCreateTodo} style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Add checklist todo..."
                    value={newTodoTitle}
                    onChange={e => setNewTodoTitle(e.target.value)}
                    style={{ flex: 1, height: 36, background: '#121318', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 8, color: '#FFFFFF', fontSize: 12, padding: '0 10px', outline: 'none' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 12, background: '#10B981' }}>
                    <Plus size={14} /> Add
                  </button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                  {todos.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>No checklist todos.</div>
                  ) : (
                    todos.slice(0, 10).map(t => (
                      <div
                        key={t.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#121318',
                          padding: '10px 14px',
                          borderRadius: 12,
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button onClick={() => handleToggleTodoStatus(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            {t.is_done ? <CircleCheck size={18} color="#10B981" /> : <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid #9CA3AF' }} />}
                          </button>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#FFFFFF', textDecoration: t.is_done ? 'line-through' : 'none' }}>
                            {t.title}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button onClick={() => handleDeleteTodo(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 2 }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: DATE TIMELINE EXPLORER & CHRONOLOGICAL FEED */}
        {activeTab === 'timeline' && (
          <DateTimelineFilter
            tasks={tasks}
            todos={todos}
            journalEntries={journalEntries}
            reminders={reminders}
            onToggleTask={handleToggleTaskStatus}
            onDeleteTask={handleDeleteTask}
            onToggleTodo={handleToggleTodoStatus}
            onDeleteTodo={handleDeleteTodo}
            onQuickAddTask={(title, dateStr) => handleCreateTask(title, dateStr)}
          />
        )}

        {/* TAB 3: HABITS & LIFE GOALS */}
        {activeTab === 'habits' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Daily Habits & Streaks */}
            <div style={{ background: '#0A0B0D', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: 22, padding: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Flame size={18} color="#EF4444" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Daily Habits & Streaks</h3>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{habits.length} Active Habits</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreateHabit} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Create new habit (e.g. Read 30 mins)..."
                  value={newHabitName}
                  onChange={e => setNewHabitName(e.target.value)}
                  style={{ flex: 1, height: 36, background: '#121318', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, color: '#FFFFFF', fontSize: 12, padding: '0 10px', outline: 'none' }}
                />
                <button type="submit" className="btn btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 12, background: '#EF4444' }}>
                  <Plus size={14} /> Add Habit
                </button>
              </form>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {habits.map(h => (
                  <div key={h.id} style={{ background: '#121318', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF' }}>{h.name}</div>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <div style={{ fontSize: 10.5, color: '#EF4444', fontWeight: 700, marginTop: 2 }}>Streak: {(h as any).streak_count || 1} Days 🔥</div>
                    </div>
                    <button
                      onClick={() => handleCheckinHabit(h.id)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: 10.5, color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.4)' }}
                    >
                      <Check size={12} /> Check-in
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Life Goals Progress */}
            <div style={{ background: '#0A0B0D', border: '1px solid rgba(139, 92, 246, 0.35)', borderRadius: 22, padding: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Target size={18} color="#8B5CF6" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Life Goals & Vision</h3>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{goals.length} Goals Active</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreateGoal} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Set long-term goal..."
                  value={newGoalTitle}
                  onChange={e => setNewGoalTitle(e.target.value)}
                  style={{ flex: 1, height: 36, background: '#121318', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: 8, color: '#FFFFFF', fontSize: 12, padding: '0 10px', outline: 'none' }}
                />
                <button type="submit" className="btn btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 12, background: '#8B5CF6' }}>
                  <Plus size={14} /> Add Goal
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {goals.map(g => (
                  <div key={g.id} style={{ background: '#121318', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#FFFFFF' }}>{g.title}</span>
                    <span style={{ fontSize: 10, color: '#C084FC', fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'rgba(139, 92, 246, 0.15)' }}>{g.status || 'Active'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SECONDARY & LESS IMPORTANT DATA */}
        {activeTab === 'secondary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header description for Secondary Data */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 16, padding: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={18} color="#9CA3AF" /> Secondary & Archives Folder
              </h3>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '4px 0 0' }}>
                Contains background notes, raw water logs, reminders, and historical metadata.
              </p>
            </div>

            {/* Hydration Log Data */}
            <div style={{ background: '#0A0B0D', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 18, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Droplets size={16} color="#FFD700" />
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF' }}>Water Hydration Logs</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[250, 500].map(amt => (
                    <button
                      key={amt}
                      onClick={() => handleAddWater(amt)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: 11, color: '#FFD700', border: '1px solid rgba(245, 158, 11, 0.4)' }}
                    >
                      +{amt}ml
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#FFD700', fontWeight: 700 }}>Today Total: {waterMl} ml / 2500 ml Target</div>
              <div style={{ width: '100%', height: 6, background: '#121318', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, Math.round((waterMl / 2500) * 100))}%`, background: '#FFD700' }} />
              </div>
            </div>

            {/* Pinned Notes & Drafts */}
            <div style={{ background: '#0A0B0D', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 18, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <StickyNote size={16} color="#9CA3AF" />
                <span style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF' }}>Pinned Notes & Drafts ({pinnedNotes.length})</span>
              </div>
              {pinnedNotes.length === 0 ? (
                <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>No pinned notes found.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  {pinnedNotes.map(n => (
                    <div key={n.id} style={{ background: '#121318', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#FFFFFF' }}>{n.title || 'Untitled Note'}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* System Reminders */}
            <div style={{ background: '#0A0B0D', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 18, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Bell size={16} color="#9CA3AF" />
                <span style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF' }}>Background System Reminders ({reminders.length})</span>
              </div>
              {reminders.length === 0 ? (
                <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>No scheduled reminders.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {reminders.map(r => (
                    <div key={r.id} style={{ background: '#121318', padding: '8px 12px', borderRadius: 8, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: '#FFFFFF' }}>{r.title}</span>
                      <span style={{ fontSize: 10, color: '#9CA3AF' }}>{r.remind_at ? new Date(r.remind_at).toLocaleDateString() : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  )
}
