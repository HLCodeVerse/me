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
  BookOpen, Bot, Clock, ChevronRight, Send, ShieldCheck, Calendar,
  Play, Pause, CircleCheck, CircleX
} from 'lucide-react'
import { toast } from 'sonner'
import type { Task, Todo, Habit, Reminder, Note, Goal, JournalEntry } from '@/lib/supabase/database.types'

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
  const [todayMood, setTodayMood] = useState<string | null>(null)
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

  // Modals & Timers
  const [focusMode, setFocusMode] = useState(false)
  const [focusTime, setFocusTime] = useState(25 * 60)
  const [focusTimerRunning, setFocusTimerRunning] = useState(false)
  const [quickAddTitle, setQuickAddTitle] = useState('')
  const [quickAddDueDate, setQuickAddDueDate] = useState('')
  const [quickAddDueTime, setQuickAddDueTime] = useState('')
  const [quickAddPriority, setQuickAddPriority] = useState(3)
  const [savingItem, setSavingItem] = useState(false)
  const [journalContent, setJournalContent] = useState('')

  // Load All Live Supabase Table Data (Including Completed Items!)
  const loadDashboardData = useCallback(async () => {
    if (!user) return
    setDataLoading(true)
    const today = new Date().toISOString().split('T')[0]

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any
      const [tasksRes, todosRes, habitsRes, goalsRes, remindersRes, notesRes, journalRes, waterRes] = await Promise.all([
        client.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(25),
        client.from('todos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(25),
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
    if (!authLoading && !user) router.replace('/auth')
    if (user) loadDashboardData()
  }, [user, authLoading, router, loadDashboardData])

  // Focus Pomodoro Timer Effect
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (focusTimerRunning && focusTime > 0) {
      timer = setInterval(() => setFocusTime(t => t - 1), 1000)
    } else if (focusTime === 0) {
      setFocusTimerRunning(false)
      toast.success('Focus Session Completed! 🏆 +50 XP Earned')
    }
    return () => clearInterval(timer)
  }, [focusTimerRunning, focusTime])

  // Execute AI Assistant Command
  async function handleAICommandSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!aiCommandPrompt.trim() || !user) return
    setExecutingAICommand(true)
    const userQuery = aiCommandPrompt.trim()
    setAiCommandPrompt('')

    try {
      const customGrokKey = typeof window !== 'undefined' ? localStorage.getItem('nirmaan_grok_key') : null
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: userQuery,
            },
          ],
          model: 'x-ai/grok-2-1212',
          enableTools: true,
          grokApiKey: customGrokKey,
        }),
      })

      if (res.ok) {
        const text = await res.text()
        if (text) {
          const lines = text.split('\n').filter(l => l.startsWith('data: ')).map(l => l.replace('data: ', ''))
          let fullOutput = ''
          for (const line of lines) {
            if (line === '[DONE]') continue
            try {
              const parsed = JSON.parse(line)
              const chunk = parsed.choices?.[0]?.delta?.content || ''
              fullOutput += chunk
            } catch {}
          }
          if (fullOutput.trim()) {
            setAiCommandResponse(fullOutput.trim())
            toast.success('AI Command Executed! ⚡')
            loadDashboardData()
          }
        }
      }
    } catch {
      toast.error('Failed to execute AI command.')
    } finally {
      setExecutingAICommand(false)
    }
  }

  // Generate AI Daily Brief
  async function generateAIDailyBrief() {
    if (!user) return
    setGeneratingBrief(true)
    toast.info('AI is generating your fresh Daily Focus Brief...')

    try {
      const customGrokKey = typeof window !== 'undefined' ? localStorage.getItem('nirmaan_grok_key') : null
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'Generate a short, high-energy 3-sentence Daily Focus Brief for my dashboard based on my active goals and tasks.',
            },
          ],
          model: 'x-ai/grok-2-1212',
          enableTools: false,
          grokApiKey: customGrokKey,
        }),
      })

      if (res.ok) {
        const text = await res.text()
        if (text) {
          const lines = text.split('\n').filter(l => l.startsWith('data: ')).map(l => l.replace('data: ', ''))
          let fullOutput = ''
          for (const line of lines) {
            if (line === '[DONE]') continue
            try {
              const parsed = JSON.parse(line)
              const chunk = parsed.choices?.[0]?.delta?.content || ''
              fullOutput += chunk
            } catch {}
          }
          if (fullOutput.trim()) {
            setAiDailyBrief(fullOutput.trim())
            toast.success('AI Daily Brief updated!')
          }
        }
      }
    } catch {
      toast.error('AI Brief generation failed.')
    } finally {
      setGeneratingBrief(false)
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
        toast.success('Task added to workspace! 📋')
      } else if (activeTab === 'todos') {
        await client.from('todos').insert({
          user_id: user.id,
          title: quickAddTitle.trim(),
          due_date: quickAddDueDate || null,
          due_time: quickAddDueTime || null,
          is_done: false,
        })
        toast.success('Todo added! 📝')
      } else if (activeTab === 'goals') {
        await client.from('goals').insert({
          user_id: user.id,
          title: quickAddTitle.trim(),
          status: 'active',
          priority: 2,
        })
        toast.success('Life Goal created! 🎯')
      } else if (activeTab === 'reminders') {
        await client.from('reminders').insert({
          user_id: user.id,
          title: quickAddTitle.trim(),
          remind_at: quickAddDueDate ? new Date(`${quickAddDueDate}T${quickAddDueTime || '09:00'}`).toISOString() : new Date(Date.now() + 3600000).toISOString(),
          is_sent: false,
        })
        toast.success('Reminder set! 🔔')
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

  async function handleSaveJournalEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!journalContent.trim() || !user) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('journal_entries') as any).insert({
        user_id: user.id,
        content: journalContent.trim(),
        mood: todayMood || 'good',
        entry_type: 'free',
      })
      toast.success('Journal entry logged! 📖')
      setJournalContent('')
      loadDashboardData()
    } catch {
      toast.error('Failed to save journal entry')
    }
  }

  // Filter Tasks & Todos
  const filteredTasksList = tasks.filter(t => {
    if (taskFilter === 'pending') return t.status !== 'done'
    if (taskFilter === 'completed') return t.status === 'done'
    return true
  })

  const filteredTodosList = todos.filter(t => {
    if (todoFilter === 'pending') return !t.is_done
    if (todoFilter === 'completed') return t.is_done
    return true
  })

  const lifeScore = profile?.life_score ?? 85
  const currentStreak = profile?.current_streak ?? 1
  const name = profile?.display_name || profile?.username || 'Builder'

  return (
    <AppShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>

        {/* Top Hero KPI Dashboard Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #0A0B0D 0%, #121318 50%, #1A1C24 100%)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: 24,
          padding: '28px 24px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Ambient Top Glow */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-10%',
            width: 350,
            height: 350,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }} />

          {/* Header Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-warning">
                  <Zap size={13} color="#FFD700" /> NIRMAAN Personal OS v4.5
                </span>
                <span className="badge badge-success">
                  <ShieldCheck size={13} color="#10B981" /> Live Sync Active
                </span>
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: '#FFFFFF', margin: '8px 0 2px', letterSpacing: '-0.02em' }}>
                Welcome back, {name}! ⚡
              </h1>
              <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
                Here is your real-time command center across all life areas & workspace tools.
              </p>
            </div>

            {/* Quick Action Buttons */}
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

          {/* Grid Stat KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
          }}>
            {/* Life Score Card */}
            <div style={{
              background: '#0A0B0D',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 18,
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: '0.04em' }}>LIFE SCORE</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#FFD700', marginTop: 2 }}>{lifeScore} <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>/ 100</span></div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={22} color="#FFD700" />
              </div>
            </div>

            {/* Streak Card */}
            <div style={{
              background: '#0A0B0D',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 18,
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: '0.04em' }}>DAY STREAK</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#EF4444', marginTop: 2 }}>{currentStreak} <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>Days</span></div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Flame size={22} color="#EF4444" />
              </div>
            </div>

            {/* Total & Open Tasks Card */}
            <div style={{
              background: '#0A0B0D',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 18,
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: '0.04em' }}>TASKS VELOCITY</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#3B82F6', marginTop: 2 }}>
                  {tasks.filter(t => t.status !== 'done').length} <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>Open</span> • <span style={{ color: '#10B981' }}>{tasks.filter(t => t.status === 'done').length} Done</span>
                </div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={22} color="#3B82F6" />
              </div>
            </div>

            {/* Water Hydration Card */}
            <div style={{
              background: '#0A0B0D',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 18,
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: '0.04em' }}>HYDRATION</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#10B981', marginTop: 2 }}>{waterMl} <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>ml</span></div>
              </div>
              <button
                onClick={() => handleAddWater(250)}
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: 12,
                  padding: '8px 10px',
                  color: '#10B981',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                title="Log 250ml water"
              >
                <Droplets size={15} color="#10B981" /> +250
              </button>
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

        {/* AI Daily Focus Brief Card */}
        <div style={{
          background: '#0A0B0D',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: 20,
          padding: '22px 24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #FFD700, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000000' }}>
                <Bot size={20} color="#000000" />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>NIRMAAN AI Daily Brief</h3>
                <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>Synthesized focus guidance based on active goals</span>
              </div>
            </div>

            <button
              onClick={generateAIDailyBrief}
              disabled={generatingBrief}
              className="btn btn-primary"
              style={{ padding: '7px 14px', fontSize: 12 }}
            >
              {generatingBrief ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span>{generatingBrief ? 'Generating...' : 'Generate New Brief'}</span>
            </button>
          </div>

          <div style={{ background: '#121318', padding: '16px', borderRadius: 14, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <FormattedAIResponse content={aiDailyBrief} />
          </div>
        </div>

        {/* Workspace Tables Section Header & Tabs */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                Workspace Command Center <ChevronRight size={16} color="#F59E0B" />
              </h2>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>Access live records across all system tables (Pending & Completed)</p>
            </div>

            {/* Quick Create Input Form */}
            <form onSubmit={handleCreateItemSubmit} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1, maxWidth: 540 }}>
              <input
                type="text"
                placeholder={`Add new ${activeTab.slice(0, -1)}...`}
                value={quickAddTitle}
                onChange={e => setQuickAddTitle(e.target.value)}
                required
                style={{
                  flex: 1,
                  minWidth: 180,
                  height: 40,
                  background: '#121318',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 10,
                  color: '#FFFFFF',
                  fontSize: 13,
                  padding: '0 12px',
                  outline: 'none',
                }}
              />
              <input
                type="date"
                value={quickAddDueDate}
                onChange={e => setQuickAddDueDate(e.target.value)}
                style={{ height: 40, width: 130, background: '#121318', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 10, color: '#FFFFFF', fontSize: 12, padding: '0 8px', outline: 'none' }}
              />
              <input
                type="time"
                value={quickAddDueTime}
                onChange={e => setQuickAddDueTime(e.target.value)}
                style={{ height: 40, width: 105, background: '#121318', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 10, color: '#FFFFFF', fontSize: 12, padding: '0 6px', outline: 'none' }}
              />
              <button type="submit" disabled={savingItem} className="btn btn-primary" style={{ height: 40, padding: '0 14px', fontSize: 13 }}>
                <Plus size={16} /> Add
              </button>
            </form>
          </div>

          {/* Tab Navigation Bar */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
            {[
              { id: 'tasks', label: `📋 Tasks (${tasks.length})` },
              { id: 'todos', label: `📝 Todos (${todos.length})` },
              { id: 'habits', label: `🔥 Habits (${habits.length})` },
              { id: 'goals', label: `🎯 Goals (${goals.length})` },
              { id: 'reminders', label: `🔔 Reminders (${reminders.length})` },
              { id: 'journal', label: `📖 Journal (${journalEntries.length})` },
              { id: 'notes', label: `📌 Notes (${pinnedNotes.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                style={{
                  padding: '9px 16px',
                  borderRadius: 12,
                  border: `1px solid ${activeTab === tab.id ? '#F59E0B' : 'rgba(245, 158, 11, 0.25)'}`,
                  background: activeTab === tab.id ? 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)' : '#121318',
                  color: activeTab === tab.id ? '#000000' : '#FFFFFF',
                  fontSize: 13,
                  fontWeight: activeTab === tab.id ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 150ms ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Display Area */}
        <div style={{
          background: '#0A0B0D',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 20,
          padding: 20,
          minHeight: 280,
        }}>

          {/* TAB 1: TASKS (Pending & Completed) */}
          {activeTab === 'tasks' && (
            <div>
              {/* Task Filter Sub-Bar */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {[
                  { id: 'all', label: 'All Tasks' },
                  { id: 'pending', label: '⏳ Pending' },
                  { id: 'completed', label: '✓ Completed' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setTaskFilter(f.id as TaskFilter)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      border: `1px solid ${taskFilter === f.id ? '#F59E0B' : 'rgba(245, 158, 11, 0.2)'}`,
                      background: taskFilter === f.id ? 'rgba(245, 158, 11, 0.2)' : '#121318',
                      color: taskFilter === f.id ? '#FFD700' : '#9CA3AF',
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {filteredTasksList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: '#9CA3AF' }}>
                  <CheckCircle2 size={36} color="#F59E0B" style={{ margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>No tasks in this view!</p>
                  <p style={{ fontSize: 12, margin: '4px 0 0' }}>Type a title above to create your first task with due date & time.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredTasksList.map(task => {
                    const isDone = task.status === 'done'
                    return (
                      <div
                        key={task.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 16px',
                          background: isDone ? 'rgba(16, 185, 129, 0.08)' : '#121318',
                          border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.2)'}`,
                          borderRadius: 14,
                          gap: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                          <button
                            onClick={() => handleToggleTaskStatus(task)}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              border: `2px solid ${isDone ? '#10B981' : '#F59E0B'}`,
                              background: isDone ? '#10B981' : 'none',
                              color: '#000000',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0,
                              fontSize: 12,
                              fontWeight: 900,
                            }}
                            title={isDone ? 'Reopen task' : 'Mark done'}
                          >
                            {isDone && '✓'}
                          </button>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: isDone ? '#9CA3AF' : '#FFFFFF',
                              textDecoration: isDone ? 'line-through' : 'none',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {task.title}
                            </div>
                            {task.description && (
                              <div style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {task.description}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          {isDone ? (
                            <span className="badge badge-success">✓ Completed</span>
                          ) : (
                            <>
                              {task.due_date && (
                                <span style={{ fontSize: 11, color: '#FFD700', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Calendar size={12} /> {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              )}
                              {task.due_time && (
                                <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Clock size={12} /> {task.due_time}
                                </span>
                              )}
                              <span className={`badge ${task.priority === 4 ? 'badge-p1' : task.priority === 3 ? 'badge-p2' : 'badge-p3'}`}>
                                P{5 - task.priority}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TODOS (Pending & Completed) */}
          {activeTab === 'todos' && (
            <div>
              {/* Todo Filter Sub-Bar */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {[
                  { id: 'all', label: 'All Todos' },
                  { id: 'pending', label: '⏳ Pending' },
                  { id: 'completed', label: '✓ Completed' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setTodoFilter(f.id as TaskFilter)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      border: `1px solid ${todoFilter === f.id ? '#10B981' : 'rgba(16, 185, 129, 0.2)'}`,
                      background: todoFilter === f.id ? 'rgba(16, 185, 129, 0.2)' : '#121318',
                      color: todoFilter === f.id ? '#10B981' : '#9CA3AF',
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {filteredTodosList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: '#9CA3AF' }}>
                  <CheckCircle2 size={36} color="#10B981" style={{ margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>No todos found!</p>
                  <p style={{ fontSize: 12, margin: '4px 0 0' }}>Add a quick todo item using the input form above.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredTodosList.map(todo => (
                    <div
                      key={todo.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: todo.is_done ? 'rgba(16, 185, 129, 0.08)' : '#121318',
                        border: `1px solid ${todo.is_done ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.2)'}`,
                        borderRadius: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                          onClick={() => handleToggleTodoStatus(todo)}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 6,
                            border: `2px solid ${todo.is_done ? '#10B981' : '#9CA3AF'}`,
                            background: todo.is_done ? '#10B981' : 'none',
                            color: '#000000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: 11,
                            fontWeight: 900,
                          }}
                          title={todo.is_done ? 'Mark pending' : 'Mark done'}
                        >
                          {todo.is_done && '✓'}
                        </button>
                        <span style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: todo.is_done ? '#9CA3AF' : '#FFFFFF',
                          textDecoration: todo.is_done ? 'line-through' : 'none',
                        }}>
                          {todo.title}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {todo.is_done && <span className="badge badge-success">✓ Done</span>}
                        {todo.due_time && (
                          <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700 }}>{todo.due_time}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HABITS */}
          {activeTab === 'habits' && (
            <div>
              {habits.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: '#9CA3AF' }}>
                  <Flame size={36} color="#EF4444" style={{ margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>No habits configured!</p>
                  <button onClick={() => router.push('/habits')} className="btn btn-primary" style={{ marginTop: 10, fontSize: 12 }}>
                    Go to Habits Hub
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {habits.map(habit => (
                    <div
                      key={habit.id}
                      style={{
                        background: '#121318',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        borderRadius: 16,
                        padding: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>{habit.name}</div>
                        <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600, marginTop: 2 }}>Frequency: {habit.frequency}</div>
                      </div>
                      <button
                        onClick={() => toast.success(`Logged habit "${habit.name}" for today! 🔥`)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          borderRadius: 10,
                          padding: '6px 12px',
                          color: '#EF4444',
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        <Flame size={14} /> Log Today
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: GOALS */}
          {activeTab === 'goals' && (
            <div>
              {goals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: '#9CA3AF' }}>
                  <Target size={36} color="#10B981" style={{ margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>No active life goals set.</p>
                  <button onClick={() => router.push('/goals')} className="btn btn-primary" style={{ marginTop: 10, fontSize: 12 }}>
                    Open Goals Hub
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                  {goals.map(goal => (
                    <div
                      key={goal.id}
                      style={{
                        background: '#121318',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: 16,
                        padding: 16,
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF' }}>{goal.title}</div>
                      {goal.description && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{goal.description}</div>}
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#10B981', fontWeight: 700 }}>
                        <span>Status: {goal.status}</span>
                        {goal.target_date && <span>Target: {new Date(goal.target_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: REMINDERS */}
          {activeTab === 'reminders' && (
            <div>
              {reminders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: '#9CA3AF' }}>
                  <Bell size={36} color="#EF4444" style={{ margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>No scheduled reminders.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {reminders.map(reminder => (
                    <div
                      key={reminder.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: '#121318',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>{reminder.title}</div>
                        {reminder.message && <div style={{ fontSize: 12, color: '#9CA3AF' }}>{reminder.message}</div>}
                      </div>
                      <span style={{ fontSize: 11.5, color: '#EF4444', fontWeight: 800 }}>
                        ⏰ {new Date(reminder.remind_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: JOURNAL */}
          {activeTab === 'journal' && (
            <div>
              <form onSubmit={handleSaveJournalEntry} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 700 }}>SELECT MOOD:</span>
                  {[
                    { id: 'amazing', label: '😁 Amazing' },
                    { id: 'good', label: '😊 Good' },
                    { id: 'meh', label: '😐 Meh' },
                    { id: 'bad', label: '😔 Bad' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setTodayMood(m.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        border: `1px solid ${todayMood === m.id ? '#F59E0B' : 'rgba(245, 158, 11, 0.2)'}`,
                        background: todayMood === m.id ? 'rgba(245, 158, 11, 0.2)' : '#121318',
                        color: todayMood === m.id ? '#FFD700' : '#FFFFFF',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Log quick reflection or micro-journal entry..."
                  value={journalContent}
                  onChange={e => setJournalContent(e.target.value)}
                  rows={3}
                  style={{ background: '#121318', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 12, color: '#FFFFFF', padding: 12, fontSize: 13, resize: 'none', outline: 'none' }}
                />
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: 13 }}>
                  <BookOpen size={15} /> Save Journal Log
                </button>
              </form>

              {journalEntries.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {journalEntries.map(entry => (
                    <div key={entry.id} style={{ background: '#121318', border: '1px solid rgba(245, 158, 11, 0.2)', padding: 12, borderRadius: 12 }}>
                      <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700 }}>Mood: {entry.mood} • {new Date(entry.created_at).toLocaleDateString()}</div>
                      <div style={{ fontSize: 13, color: '#FFFFFF', marginTop: 4 }}>{entry.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: NOTES */}
          {activeTab === 'notes' && (
            <div>
              {pinnedNotes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: '#9CA3AF' }}>
                  <StickyNote size={36} color="#FACC15" style={{ margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>No notes saved.</p>
                  <button onClick={() => router.push('/notes')} className="btn btn-primary" style={{ marginTop: 10, fontSize: 12 }}>
                    Open Notes Hub
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {pinnedNotes.map(note => (
                    <div key={note.id} style={{ background: '#121318', border: '1px solid rgba(250, 204, 21, 0.3)', borderRadius: 14, padding: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#FACC15' }}>{note.title || 'Untitled Note'}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{note.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Pomodoro Focus Timer Modal */}
      {focusMode && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, backdropFilter: 'blur(8px)' }}
            onClick={() => setFocusMode(false)}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 210,
            width: '90%',
            maxWidth: 420,
            background: '#0A0B0D',
            border: '1px solid #F59E0B',
            borderRadius: 24,
            padding: '28px 24px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.95)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={20} color="#F59E0B" /> Pomodoro Focus Session
              </div>
              <button onClick={() => setFocusMode(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{
              fontSize: 54,
              fontWeight: 900,
              fontFamily: 'monospace',
              color: '#FFD700',
              margin: '20px 0',
              letterSpacing: '0.04em',
            }}>
              {Math.floor(focusTime / 60)}:{focusTime % 60 < 10 ? '0' : ''}{focusTime % 60}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setFocusTimerRunning(p => !p)}
                className="btn btn-primary"
                style={{ padding: '12px 24px', fontSize: 15 }}
              >
                {focusTimerRunning ? <Pause size={18} /> : <Play size={18} />}
                <span>{focusTimerRunning ? 'Pause' : 'Start Focus'}</span>
              </button>
              <button
                onClick={() => { setFocusTime(25 * 60); setFocusTimerRunning(false) }}
                className="btn btn-secondary"
                style={{ padding: '12px 18px', fontSize: 14 }}
              >
                <RotateCcw size={16} /> Reset
              </button>
            </div>
          </div>
        </>
      )}
    </AppShell>
  )
}
