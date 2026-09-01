'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import FormattedAIResponse from '@/components/common/FormattedAIResponse'
import {
  Zap, Flame, Target, CheckCircle2, Droplets, Bell,
  Sparkles, X, RotateCcw, RefreshCw, Award, StickyNote, Plus,
  BookOpen, Bot, Clock, ChevronRight, ChevronLeft, Send, ShieldCheck, Calendar as CalendarIcon,
  Play, Pause, CircleCheck, CircleX, Check, Trash2, ListTodo, FileText
} from 'lucide-react'
import { toast } from 'sonner'
import type { Task, Todo, Habit, Reminder, Note, Goal, JournalEntry } from '@/lib/supabase/database.types'
import { createTodoistTask } from '@/lib/todoist'

type ActiveTab = 'tasks' | 'todos' | 'habits' | 'goals' | 'reminders' | 'journal' | 'notes'
type TaskFilter = 'all' | 'pending' | 'completed'

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

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

  // AI Daily Brief State
  const [aiDailyBrief, setAiDailyBrief] = useState<string>(
    '## 🚀 Daily Focus Brief\n**Today is your canvas — paint it bold.** 💥\n🎯 **Your mission**: tackle your most important task first, stay present, and celebrate every win — no matter how small. **You\'ve got this.** ⚡'
  )
  const [generatingBrief, setGeneratingBrief] = useState(false)

  // AI Assistant Command Box State
  const [aiCommandPrompt, setAiCommandPrompt] = useState('')
  const [aiCommandResponse, setAiCommandResponse] = useState<string | null>(null)
  const [executingAICommand, setExecutingAICommand] = useState(false)

  // Workspace Tab & Filters
  const [activeTab, setActiveTab] = useState<ActiveTab>('tasks')
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all')
  const [todoFilter, setTodoFilter] = useState<TaskFilter>('all')

  // Calendar State
  const todayStr = new Date().toISOString().split('T')[0]
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth()) // 0-indexed
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(todayStr)
  const [calendarQuickTaskTitle, setCalendarQuickTaskTitle] = useState('')

  // Quick Add Item State
  const [quickAddTitle, setQuickAddTitle] = useState('')
  const [quickAddDueDate, setQuickAddDueDate] = useState('')
  const [quickAddDueTime, setQuickAddDueTime] = useState('')
  const [quickAddPriority, setQuickAddPriority] = useState(3)
  const [savingItem, setSavingItem] = useState(false)

  // Pomodoro Focus Mode State
  const [focusMode, setFocusMode] = useState(false)
  const [focusTime, setFocusTime] = useState(25 * 60)
  const [focusTimerRunning, setFocusTimerRunning] = useState(false)

  // Load All Live Supabase Table Data
  const loadDashboardData = useCallback(async () => {
    if (!user) return
    setDataLoading(true)
    const today = new Date().toISOString().split('T')[0]

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any
      const [tasksRes, todosRes, habitsRes, goalsRes, remindersRes, notesRes, journalRes, waterRes] = await Promise.all([
        client.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(40),
        client.from('todos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(40),
        client.from('habits').select('*').eq('user_id', user.id).eq('archived', false).limit(10),
        client.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        client.from('reminders').select('*').eq('user_id', user.id).order('remind_at', { ascending: true }).limit(8),
        client.from('notes').select('*').eq('user_id', user.id).limit(10),
        client.from('journal_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
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

  // Execute Direct AI Natural Language Command
  async function handleAICommandSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!aiCommandPrompt.trim() || !user) return

    setExecutingAICommand(true)
    setAiCommandResponse(null)
    toast.info('AI is processing & performing action...')

    try {
      const customGrokKey = typeof window !== 'undefined' ? localStorage.getItem('nirmaan_grok_key') : null
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: aiCommandPrompt }],
          model: 'x-ai/grok-2-1212',
          enableTools: true,
          grokApiKey: customGrokKey,
        }),
      })

      if (res.ok) {
        const text = await res.text()
        const lines = text.split('\n').filter(l => l.startsWith('data: ')).map(l => l.replace('data: ', ''))
        let fullOutput = ''
        for (const line of lines) {
          if (line === '[DONE]') continue
          try {
            const parsed = JSON.parse(line)
            fullOutput += parsed.choices?.[0]?.delta?.content || ''
          } catch {}
        }

        setAiCommandResponse(fullOutput.trim() || 'Command executed successfully.')
        toast.success('Action performed! Updating dashboard...')
        setAiCommandPrompt('')
        loadDashboardData()
      } else {
        toast.error('AI command execution failed')
      }
    } catch {
      toast.error('Error executing AI command')
    } finally {
      setExecutingAICommand(false)
    }
  }

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

  async function handleCreateItemSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!quickAddTitle.trim() || !user) return
    setSavingItem(true)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any
      if (activeTab === 'tasks') {
        await client.from('tasks').insert({
          user_id: user.id,
          title: quickAddTitle.trim(),
          priority: quickAddPriority,
          due_date: quickAddDueDate ? new Date(quickAddDueDate).toISOString() : null,
          due_time: quickAddDueTime || null,
          status: 'todo',
        })
        createTodoistTask(quickAddTitle.trim(), undefined, quickAddDueDate, quickAddDueTime, quickAddPriority).catch(() => {})
        toast.success('Task added to workspace & synced to Todoist! 📋')
      } else if (activeTab === 'todos') {
        await client.from('todos').insert({
          user_id: user.id,
          title: quickAddTitle.trim(),
          due_date: quickAddDueDate || null,
          due_time: quickAddDueTime || null,
          is_done: false,
        })
        createTodoistTask(quickAddTitle.trim(), undefined, quickAddDueDate).catch(() => {})
        toast.success('Todo added & synced to Todoist! 📝')
      } else if (activeTab === 'habits') {
        await client.from('habits').insert({
          user_id: user.id,
          name: quickAddTitle.trim(),
          frequency: 'daily',
          target_count: 1,
          archived: false,
        })
        toast.success('New Habit Created! 🔥')
      } else if (activeTab === 'goals') {
        await client.from('goals').insert({
          user_id: user.id,
          title: quickAddTitle.trim(),
          status: 'in_progress',
        })
        toast.success('New Goal Set! 🎯')
      }
      setQuickAddTitle('')
      setQuickAddDueDate('')
      setQuickAddDueTime('')
      loadDashboardData()
    } catch {
      toast.error('Failed to create item')
    } finally {
      setSavingItem(false)
    }
  }

  // Quick Add Task Scheduled for Selected Calendar Date
  async function handleAddCalendarTask(e: React.FormEvent) {
    e.preventDefault()
    if (!calendarQuickTaskTitle.trim() || !user) return

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('tasks') as any).insert({
        user_id: user.id,
        title: calendarQuickTaskTitle.trim(),
        priority: 3,
        due_date: new Date(selectedCalendarDate).toISOString(),
        status: 'todo',
      }).select().single()

      if (!error && data) {
        setTasks(prev => [data, ...prev])
        createTodoistTask(calendarQuickTaskTitle.trim(), undefined, selectedCalendarDate).catch(() => {})
        toast.success(`Task scheduled for ${selectedCalendarDate}! 📅`)
        setCalendarQuickTaskTitle('')
      }
    } catch {
      toast.error('Could not schedule task')
    }
  }

  // Calendar Days Calculation
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay() // 0 = Sun
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  function prevMonth() {
    if (calendarMonth === 0) {
      setCalendarMonth(11)
      setCalendarYear(y => y - 1)
    } else {
      setCalendarMonth(m => m - 1)
    }
  }

  function nextMonth() {
    if (calendarMonth === 11) {
      setCalendarMonth(0)
      setCalendarYear(y => y + 1)
    } else {
      setCalendarMonth(m => m + 1)
    }
  }

  // Tasks & Todos for Selected Calendar Date
  const calendarTasks = tasks.filter(t => {
    if (!t.due_date) return false
    const d = new Date(t.due_date).toISOString().split('T')[0]
    return d === selectedCalendarDate
  })

  const calendarTodos = todos.filter(t => {
    if (!t.due_date) return false
    return t.due_date === selectedCalendarDate
  })

  // KPI Calculations
  const name = profile?.display_name || user?.email?.split('@')[0] || 'Member'
  const doneTasksCount = tasks.filter(t => t.status === 'done').length
  const totalTasksCount = tasks.length
  const tasksPercent = totalTasksCount > 0 ? Math.round((doneTasksCount / totalTasksCount) * 100) : 0

  const doneTodosCount = todos.filter(t => t.is_done).length
  const totalTodosCount = todos.length
  const todosPercent = totalTodosCount > 0 ? Math.round((doneTodosCount / totalTodosCount) * 100) : 0

  // Filtered Task & Todo Tab Lists
  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'pending') return t.status !== 'done'
    if (taskFilter === 'completed') return t.status === 'done'
    return true
  })

  const filteredTodos = todos.filter(t => {
    if (todoFilter === 'pending') return !t.is_done
    if (todoFilter === 'completed') return t.is_done
    return true
  })

  return (
    <AppShell>
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Welcome Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="badge badge-warning">
                <Zap size={13} color="#FFD700" /> NIRMAAN Personal OS
              </span>
              <span className="badge badge-success">
                <ShieldCheck size={13} color="#10B981" /> Live Sync Active
              </span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#FFFFFF', margin: '6px 0 2px', letterSpacing: '-0.02em' }}>
              Welcome back, {name}! ⚡
            </h1>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
              Real-time workspace stats, interactive task calendar & AI command center.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setFocusMode(true)}
              className="btn btn-secondary"
              style={{ padding: '9px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Clock size={16} color="#F59E0B" /> Pomodoro Timer
            </button>
            <button
              onClick={loadDashboardData}
              className="btn btn-ghost btn-icon"
              title="Refresh Live Data"
              style={{ border: '1px solid rgba(245, 158, 11, 0.3)', width: 40, height: 40 }}
            >
              <RefreshCw size={17} color="#FFD700" className={dataLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* DETAILED STATS & PROGRESS COUNTER CARDS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
        }}>
          {/* Tasks Done KPI Card */}
          <div style={{
            background: '#0A0B0D',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: 18,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 800, letterSpacing: '0.04em' }}>TASKS COMPLETED</div>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={18} color="#3B82F6" />
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF' }}>
                {doneTasksCount} <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 500 }}>/ {totalTasksCount}</span>
                <span className="badge badge-info" style={{ marginLeft: 8, fontSize: 11 }}>{tasksPercent}%</span>
              </div>
              <div style={{ width: '100%', height: 4, background: '#1A1C24', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${tasksPercent}%`, background: '#3B82F6' }} />
              </div>
            </div>
          </div>

          {/* Todos Completed KPI Card */}
          <div style={{
            background: '#0A0B0D',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: 18,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 800, letterSpacing: '0.04em' }}>TODOS CHECKED</div>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircleCheck size={18} color="#10B981" />
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF' }}>
                {doneTodosCount} <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 500 }}>/ {totalTodosCount}</span>
                <span className="badge badge-success" style={{ marginLeft: 8, fontSize: 11 }}>{todosPercent}%</span>
              </div>
              <div style={{ width: '100%', height: 4, background: '#1A1C24', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${todosPercent}%`, background: '#10B981' }} />
              </div>
            </div>
          </div>

          {/* Water Intake / Health Card */}
          <div style={{
            background: '#0A0B0D',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: 18,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 800, letterSpacing: '0.04em' }}>WATER HYDRATION</div>
              <button
                onClick={() => handleAddWater(250)}
                style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 8, padding: '4px 8px', color: '#FFD700', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Droplets size={13} color="#FFD700" /> +250ml
              </button>
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#FFD700' }}>
                {waterMl} <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>/ 2500 ml</span>
              </div>
              <div style={{ width: '100%', height: 4, background: '#1A1C24', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, Math.round((waterMl / 2500) * 100))}%`, background: 'linear-gradient(90deg, #FFD700, #F59E0B)' }} />
              </div>
            </div>
          </div>

          {/* Active Goals Card */}
          <div style={{
            background: '#0A0B0D',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 18,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 800, letterSpacing: '0.04em' }}>LIFE GOALS & HABITS</div>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={18} color="#EF4444" />
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF' }}>
                {goals.length} <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>Goals</span> • <span style={{ color: '#EF4444' }}>{habits.length} Habits</span>
              </div>
            </div>
          </div>
        </div>

        {/* INTERACTIVE TASK CALENDAR WIDGET */}
        <div style={{
          background: 'linear-gradient(135deg, #0A0B0D 0%, #121318 100%)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: 22,
          padding: 22,
          boxShadow: '0 15px 45px rgba(0,0,0,0.75)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}>
          {/* Calendar Month Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                <CalendarIcon size={20} color="#FFFFFF" />
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  Interactive Task & Schedule Calendar
                </h2>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>Select any date to view and schedule tasks</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF' }}>
                {monthNames[calendarMonth]} {calendarYear}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={prevMonth} className="btn-ghost btn-icon" style={{ width: 32, height: 32, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <ChevronLeft size={16} />
                </button>
                <button onClick={nextMonth} className="btn-ghost btn-icon" style={{ width: 32, height: 32, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {/* Month Calendar Grid */}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8, textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#10B981' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {/* Empty Padding Days */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ height: 38 }} />
                ))}

                {/* Month Days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1
                  const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                  const isToday = dateStr === todayStr
                  const isSelected = dateStr === selectedCalendarDate

                  // Check if date has tasks or todos scheduled
                  const dayTaskCount = tasks.filter(t => t.due_date && new Date(t.due_date).toISOString().split('T')[0] === dateStr).length
                  const dayTodoCount = todos.filter(t => t.due_date === dateStr).length
                  const hasItems = dayTaskCount > 0 || dayTodoCount > 0

                  return (
                    <button
                      key={dayNum}
                      onClick={() => setSelectedCalendarDate(dateStr)}
                      style={{
                        height: 38,
                        borderRadius: 10,
                        border: isSelected ? '2px solid #10B981' : isToday ? '1px solid #FFD700' : '1px solid rgba(255,255,255,0.08)',
                        background: isSelected ? 'rgba(16, 185, 129, 0.25)' : isToday ? 'rgba(255, 215, 0, 0.1)' : '#121318',
                        color: isSelected ? '#10B981' : isToday ? '#FFD700' : '#FFFFFF',
                        fontSize: 12.5,
                        fontWeight: isSelected || isToday ? 800 : 600,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      <span>{dayNum}</span>
                      {hasItems && (
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#10B981', position: 'absolute', bottom: 3 }} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selected Date Tasks & Schedule Drawer */}
            <div style={{ background: '#121318', borderRadius: 16, border: '1px solid rgba(16, 185, 129, 0.3)', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(16, 185, 129, 0.2)', paddingBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#10B981', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CalendarIcon size={14} color="#10B981" /> Tasks for {new Date(selectedCalendarDate).toLocaleDateString()}
                </span>
                <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700 }}>
                  {calendarTasks.length + calendarTodos.length} Scheduled
                </span>
              </div>

              {/* Quick Add Task for Selected Date */}
              <form onSubmit={handleAddCalendarTask} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder={`Schedule task for ${selectedCalendarDate}...`}
                  value={calendarQuickTaskTitle}
                  onChange={e => setCalendarQuickTaskTitle(e.target.value)}
                  style={{ flex: 1, height: 36, background: '#0A0B0D', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 10, color: '#FFFFFF', fontSize: 12, padding: '0 12px', outline: 'none' }}
                />
                <button type="submit" className="btn btn-primary" style={{ height: 36, padding: '0 12px', fontSize: 12 }}>
                  <Plus size={14} /> Add
                </button>
              </form>

              {/* Tasks & Todos Scheduled List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {calendarTasks.length === 0 && calendarTodos.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                    No tasks or todos scheduled for {selectedCalendarDate}.
                  </div>
                ) : (
                  <>
                    {calendarTasks.map(t => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0A0B0D', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button onClick={() => handleToggleTaskStatus(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.status === 'done' ? '#10B981' : '#9CA3AF' }}>
                            {t.status === 'done' ? <CheckCircle2 size={16} color="#10B981" /> : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid #9CA3AF' }} />}
                          </button>
                          <span style={{ fontSize: 12.5, color: '#FFFFFF', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>
                            {t.title}
                          </span>
                        </div>
                        <span className="badge badge-info" style={{ fontSize: 10 }}>Task</span>
                      </div>
                    ))}

                    {calendarTodos.map(t => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0A0B0D', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button onClick={() => handleToggleTodoStatus(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.is_done ? '#10B981' : '#9CA3AF' }}>
                            {t.is_done ? <CircleCheck size={16} color="#10B981" /> : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid #9CA3AF' }} />}
                          </button>
                          <span style={{ fontSize: 12.5, color: '#FFFFFF', textDecoration: t.is_done ? 'line-through' : 'none' }}>
                            {t.title}
                          </span>
                        </div>
                        <span className="badge badge-warning" style={{ fontSize: 10 }}>Todo</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* INLINE AI ASSISTANT COMMAND BAR */}
        <div style={{
          background: 'linear-gradient(135deg, #121318 0%, #1A1C24 100%)',
          border: '1px solid #F59E0B',
          borderRadius: 20,
          padding: '18px 20px',
          boxShadow: '0 12px 36px rgba(245, 158, 11, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #FFD700, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000000' }}>
              <Bot size={18} color="#000000" />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                NIRMAAN AI Direct Command Bar <Sparkles size={14} color="#FFD700" />
              </h3>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>Execute actions & create tasks/todos/goals directly with natural language</span>
            </div>
          </div>

          <form onSubmit={handleAICommandSubmit} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Ask AI or command: e.g. 'Create task Build Auth at 5pm', 'Log 500ml water', 'Create goal Launch Product'..."
              value={aiCommandPrompt}
              onChange={e => setAiCommandPrompt(e.target.value)}
              style={{
                flex: 1,
                height: 44,
                background: '#0A0B0D',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: 12,
                color: '#FFFFFF',
                fontSize: 13,
                padding: '0 14px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={executingAICommand}
              className="btn btn-primary"
              style={{ height: 44, padding: '0 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {executingAICommand ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              <span>{executingAICommand ? 'Executing...' : 'Send AI'}</span>
            </button>
          </form>

          {aiCommandResponse && (
            <div style={{ background: '#0A0B0D', border: '1px solid rgba(245, 158, 11, 0.3)', padding: 14, borderRadius: 12, marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#FFD700', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Sparkles size={12} color="#FFD700" /> AI EXECUTION RESPONSE:
              </div>
              <FormattedAIResponse content={aiCommandResponse} />
            </div>
          )}
        </div>

        {/* WORKSPACE COMMAND CENTER TABBED RECORD HUBS */}
        <div style={{
          background: '#0A0B0D',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 22,
          padding: 22,
          boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}>
          {/* Header & Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                Workspace Command Center <ChevronRight size={16} color="#F59E0B" />
              </h2>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>Access live records across all system tables (Pending & Completed)</p>
            </div>

            {/* Tab Navigation Pill Bar */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', background: '#121318', padding: 6, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
              {[
                { id: 'tasks', label: `Tasks (${tasks.length})`, icon: CheckCircle2 },
                { id: 'todos', label: `Todos (${todos.length})`, icon: ListTodo },
                { id: 'habits', label: `Habits (${habits.length})`, icon: Flame },
                { id: 'goals', label: `Goals (${goals.length})`, icon: Target },
                { id: 'journal', label: `Journal (${journalEntries.length})`, icon: BookOpen },
                { id: 'notes', label: `Notes (${pinnedNotes.length})`, icon: FileText },
              ].map(tab => {
                const IconComponent = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as ActiveTab)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 10,
                      border: 'none',
                      background: isActive ? 'linear-gradient(135deg, #FFD700, #F59E0B)' : 'transparent',
                      color: isActive ? '#000000' : '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <IconComponent size={14} color={isActive ? '#000000' : '#F59E0B'} />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick Create Entry Form */}
          <form onSubmit={handleCreateItemSubmit} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#121318', padding: 12, borderRadius: 14, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <input
              type="text"
              placeholder={`Add new ${activeTab.slice(0, -1)}...`}
              value={quickAddTitle}
              onChange={e => setQuickAddTitle(e.target.value)}
              style={{ flex: 1, height: 38, background: '#0A0B0D', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 10, color: '#FFFFFF', fontSize: 12.5, padding: '0 12px', outline: 'none' }}
            />
            {activeTab === 'tasks' && (
              <input
                type="date"
                value={quickAddDueDate}
                onChange={e => setQuickAddDueDate(e.target.value)}
                style={{ height: 38, background: '#0A0B0D', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 10, color: '#FFFFFF', fontSize: 12, padding: '0 8px', outline: 'none' }}
              />
            )}
            <button type="submit" disabled={savingItem} className="btn btn-primary" style={{ height: 38, padding: '0 16px', fontSize: 12.5 }}>
              <Plus size={15} /> Add Item
            </button>
          </form>

          {/* Active Tab Records Display */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>

            {/* TAB 1: TASKS */}
            {activeTab === 'tasks' && (
              filteredTasks.length === 0 ? (
                <div style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>No tasks found in workspace.</div>
              ) : (
                filteredTasks.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#121318', padding: '12px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button onClick={() => handleToggleTaskStatus(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.status === 'done' ? '#10B981' : '#9CA3AF' }}>
                        {t.status === 'done' ? <CheckCircle2 size={18} color="#10B981" /> : <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid #9CA3AF' }} />}
                      </button>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#FFFFFF', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>
                          {t.title}
                        </div>
                        {t.due_date && (
                          <div style={{ fontSize: 11, color: '#9CA3AF' }}>Due: {new Date(t.due_date).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                    <span className={`badge ${t.status === 'done' ? 'badge-success' : 'badge-info'}`}>
                      {t.status === 'done' ? 'Completed' : `Priority ${t.priority || 3}`}
                    </span>
                  </div>
                ))
              )
            )}

            {/* TAB 2: TODOS */}
            {activeTab === 'todos' && (
              filteredTodos.length === 0 ? (
                <div style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>No checklist todos found.</div>
              ) : (
                filteredTodos.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#121318', padding: '12px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button onClick={() => handleToggleTodoStatus(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.is_done ? '#10B981' : '#9CA3AF' }}>
                        {t.is_done ? <CircleCheck size={18} color="#10B981" /> : <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid #9CA3AF' }} />}
                      </button>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#FFFFFF', textDecoration: t.is_done ? 'line-through' : 'none' }}>
                        {t.title}
                      </div>
                    </div>
                    <span className={`badge ${t.is_done ? 'badge-success' : 'badge-warning'}`}>
                      {t.is_done ? 'Checked' : 'Pending'}
                    </span>
                  </div>
                ))
              )
            )}

            {/* TAB 3: HABITS */}
            {activeTab === 'habits' && (
              habits.length === 0 ? (
                <div style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>No daily habits recorded.</div>
              ) : (
                habits.map(h => (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#121318', padding: '12px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Flame size={18} color="#FFD700" />
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#FFFFFF' }}>{h.name}</div>
                    </div>
                    <span className="badge badge-warning">Streak: {h.streak_count || 0} Days</span>
                  </div>
                ))
              )
            )}

            {/* TAB 4: GOALS */}
            {activeTab === 'goals' && (
              goals.length === 0 ? (
                <div style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>No life goals set.</div>
              ) : (
                goals.map(g => (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#121318', padding: '12px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Target size={18} color="#EF4444" />
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#FFFFFF' }}>{g.title}</div>
                    </div>
                    <span className="badge badge-danger">{g.status || 'in_progress'}</span>
                  </div>
                ))
              )
            )}

            {/* TAB 5: JOURNAL */}
            {activeTab === 'journal' && (
              journalEntries.length === 0 ? (
                <div style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>No journal reflections recorded.</div>
              ) : (
                journalEntries.map(j => (
                  <div key={j.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#121318', padding: '12px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <BookOpen size={18} color="#10B981" />
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#FFFFFF' }}>{j.title || 'Journal Entry'}</div>
                        <div style={{ fontSize: 11, color: '#9CA3AF' }}>{new Date(j.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <span className="badge badge-success">Mood: {j.mood || 'good'}</span>
                  </div>
                ))
              )
            )}

            {/* TAB 6: NOTES */}
            {activeTab === 'notes' && (
              pinnedNotes.length === 0 ? (
                <div style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>No scratchpad notes found.</div>
              ) : (
                pinnedNotes.map(n => (
                  <div key={n.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#121318', padding: '12px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileText size={18} color="#F59E0B" />
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#FFFFFF' }}>{n.title || 'Untitled Note'}</div>
                    </div>
                    <span className="badge badge-warning">Note</span>
                  </div>
                ))
              )
            )}

          </div>
        </div>

      </div>
    </AppShell>
  )
}
