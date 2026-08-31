'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import LifeScoreRing from '@/components/dashboard/LifeScoreRing'
import StreakBadge from '@/components/dashboard/StreakBadge'
import {
  Settings, CheckCircle2, Circle, Brain,
  TrendingUp, Zap, ChevronRight, Target, Sparkles,
  BookOpen, GraduationCap, Bot, Loader2, ArrowRight, Activity
} from 'lucide-react'
import Link from 'next/link'
import { getGreeting } from '@/lib/utils'
import { toast } from 'sonner'
import type { Task, Todo, DailyPlan, Streak } from '@/lib/supabase/database.types'

interface QuickStat {
  label: string
  value: string | number
  sub: string
  color: string
  icon: React.ElementType
}

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [todayTasks, setTodayTasks] = useState<Task[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [streak, setStreak] = useState<Streak | null>(null)
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [completingTask, setCompletingTask] = useState<string | null>(null)
  const [generatingPlan, setGeneratingPlan] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/auth')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const today = new Date().toISOString().split('T')[0]

      const [tasksRes, todosRes, streakRes, planRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .neq('status', 'done')
          .order('priority', { ascending: false })
          .limit(5),
        supabase
          .from('todos')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_done', false)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('streaks')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'tasks')
          .maybeSingle(),
        supabase
          .from('daily_plans')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle(),
      ])

      setTodayTasks(tasksRes.data ?? [])
      setTodos(todosRes.data ?? [])
      setStreak(streakRes.data)
      setDailyPlan(planRes.data)
      setDataLoading(false)
    }
    load()
  }, [user, supabase])

  async function completeTask(taskId: string) {
    setCompletingTask(taskId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any)
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', taskId)
    setTodayTasks(prev => prev.filter(t => t.id !== taskId))
    setCompletingTask(null)
    toast.success('Task marked as done!')
  }

  async function toggleTodo(todoId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('todos') as any).update({ is_done: true }).eq('id', todoId)
    setTodos(prev => prev.filter(t => t.id !== todoId))
    toast.success('Todo completed!')
  }

  async function generateAIDailyPlan() {
    if (!user) return
    setGeneratingPlan(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Generate a short 2-sentence energetic daily focus brief for me today.' }],
          enableTools: false,
        }),
      })

      if (!res.ok) throw new Error('AI generation failed')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullPlan = ''

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
              if (delta) fullPlan += delta
            } catch {}
          }
        }
      }

      const today = new Date().toISOString().split('T')[0]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: savedPlan } = await (supabase.from('daily_plans') as any).upsert({
        user_id: user.id,
        date: today,
        ai_generated_summary: fullPlan || 'Focus on high priority tasks and maintain deep work sessions today.',
        focus_area: 'Deep Execution'
      }).select().single()

      if (savedPlan) setDailyPlan(savedPlan)
      toast.success('AI Daily Brief generated! ⚡')
    } catch {
      toast.error('Failed to generate daily brief')
    } finally {
      setGeneratingPlan(false)
    }
  }

  if (loading || !user) return <LoadingSkeleton />

  const lifeScore = profile?.life_score ?? 0
  const streakCount = streak?.current_count ?? 0

  const quickStats: QuickStat[] = [
    { label: 'Tasks Due',  value: todayTasks.length, sub: 'open items',  color: '#8B5CF6',  icon: Target  },
    { label: 'Quick Todos',value: todos.length,      sub: 'remaining',   color: '#06B6D4',  icon: CheckCircle2 },
    { label: 'Day Streak', value: streakCount,       sub: 'active days', color: '#F59E0B',  icon: Zap    },
    { label: 'Life Score', value: lifeScore,         sub: '/ 100 max',   color: '#10B981',  icon: TrendingUp },
  ]

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500 }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
              {getGreeting()}, {profile?.display_name?.split(' ')[0] ?? 'Builder'}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/settings" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <Settings size={16} color="var(--text-muted)" />
            </Link>
          </div>
        </div>
      }
    >
      <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Life Score & Progress Hero */}
        <div className="animate-fade-up card" style={{
          padding: 22, display: 'flex', alignItems: 'center', gap: 20,
          background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(6,182,212,0.05) 100%)',
          border: '1px solid rgba(139,92,246,0.2)'
        }}>
          <LifeScoreRing score={lifeScore} size={130} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Productivity Index
            </p>
            <StreakBadge count={streakCount} size="md" />
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <AreaBar label="Career" score={78} color="#60A5FA" />
              <AreaBar label="Health" score={85} color="#10B981" />
              <AreaBar label="Focus" score={70} color="#F59E0B" />
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="animate-fade-up delay-100" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {quickStats.map(({ label, value, sub, color, icon: Icon }, i) => (
            <div key={i} className="card" style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>{label}</span>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} color={color} />
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
                {value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* AI Daily Brief Widget */}
        <div className="animate-fade-up delay-200" style={{
          padding: '16px 18px',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.08))',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: 'var(--radius)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="#A78BFA" />
              <span style={{ fontSize: 12, color: '#A78BFA', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                AI Daily Brief
              </span>
            </div>
            <button
              onClick={generateAIDailyPlan}
              disabled={generatingPlan}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                borderRadius: 'var(--radius-sm)', background: 'rgba(139,92,246,0.2)',
                border: '1px solid rgba(139,92,246,0.4)', cursor: 'pointer',
                color: '#A78BFA', fontSize: 11, fontWeight: 700
              }}
            >
              {generatingPlan ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
              {generatingPlan ? 'Generating...' : 'Refresh AI Brief'}
            </button>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {dailyPlan?.ai_generated_summary || 'Click "Refresh AI Brief" to let NIRMAAN AI analyze your tasks, streak, and goals to generate a personalized focus plan for today.'}
          </p>
        </div>

        {/* Today's Tasks */}
        <section className="animate-fade-up delay-300">
          <SectionHeader title="Priority Tasks" href="/tasks" count={todayTasks.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {dataLoading ? (
              [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 'var(--radius)' }} />)
            ) : todayTasks.length === 0 ? (
              <EmptyState icon={CheckCircle2} msg="All priority tasks clear!" href="/tasks" actionText="Add Task" />
            ) : (
              todayTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  completing={completingTask === task.id}
                  onComplete={() => completeTask(task.id)}
                />
              ))
            )}
          </div>
        </section>

        {/* Quick Todos */}
        <section className="animate-fade-up delay-400">
          <SectionHeader title="Quick Todos" href="/todos" count={todos.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
            {dataLoading ? (
              [1, 2].map(i => <div key={i} className="skeleton" style={{ height: 42, borderRadius: 'var(--radius-sm)' }} />)
            ) : todos.length === 0 ? (
              <EmptyState icon={Activity} msg="Your quick todo list is clear!" href="/todos" actionText="Add Todo" />
            ) : (
              todos.map(todo => (
                <div key={todo.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', background: 'var(--surface)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                }}>
                  <button onClick={() => toggleTodo(todo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                    <Circle size={18} color="var(--text-dim)" strokeWidth={1.5} />
                  </button>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{todo.title}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Quick Navigation Cards (NO EMOJIS - SVG ONLY) */}
        <section className="animate-fade-up delay-500">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <QuickLink href="/journal" icon={BookOpen} label="Journal Entry" color="#A78BFA" />
            <QuickLink href="/learn"   icon={GraduationCap} label="Learning Hub" color="#60A5FA" />
            <QuickLink href="/goals"   icon={Target} label="Goals & Roadmap" color="#10B981" />
            <QuickLink href="/ai"      icon={Bot} label="AI Companion" color="#F59E0B" />
          </div>
        </section>

        <div style={{ height: 8 }} />
      </div>
    </AppShell>
  )
}

function AreaBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--text-dim)', width: 46, flexShrink: 0 }}>{label}</span>
      <div className="progress-track" style={{ flex: 1, height: 6, background: 'var(--surface-3)', borderRadius: 99 }}>
        <div className="progress-fill" style={{ width: `${score}%`, background: color, height: '100%', borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 700, width: 26, textAlign: 'right' }}>{score}</span>
    </div>
  )
}

function SectionHeader({ title, href, count }: { title: string; href: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{title}</span>
        {count > 0 && <span className="badge badge-muted" style={{ fontSize: 11 }}>{count}</span>}
      </div>
      <Link href={href} style={{ fontSize: 12, color: '#A78BFA', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
        View all <ChevronRight size={13} />
      </Link>
    </div>
  )
}

function TaskRow({ task, completing, onComplete }: { task: Task; completing: boolean; onComplete: () => void }) {
  const priorityColors = ['var(--text-dim)', '#10B981', '#F59E0B', '#EF4444']
  const pColor = priorityColors[Math.min(task.priority - 1, 3)]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', background: 'var(--surface)',
      border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      opacity: completing ? 0.5 : 1, transition: 'opacity 200ms',
    }}>
      <button onClick={onComplete} disabled={completing} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
        <Circle size={18} color={pColor} strokeWidth={1.5} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {task.title}
        </p>
      </div>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: pColor, flexShrink: 0 }} />
    </div>
  )
}

function EmptyState({ icon: Icon, msg, href, actionText }: { icon: React.ElementType; msg: string; href: string; actionText: string }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px', background: 'var(--surface)',
      border: '1px dashed var(--border)', borderRadius: 'var(--radius)',
      textDecoration: 'none', color: 'var(--text-muted)', fontSize: 13,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon size={18} color="#A78BFA" />
        <span>{msg}</span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#A78BFA', display: 'flex', alignItems: 'center', gap: 4 }}>
        {actionText} <ArrowRight size={12} />
      </span>
    </Link>
  )
}

function QuickLink({ href, icon: Icon, label, color }: { href: string; icon: React.ElementType; label: string; color: string }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px', background: 'var(--surface)',
      border: `1px solid ${color}25`,
      borderRadius: 'var(--radius)',
      textDecoration: 'none', transition: 'border-color 200ms, background 200ms',
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={16} color={color} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
    </Link>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '80px 16px 16px' }}>
      <div className="skeleton" style={{ height: 180, borderRadius: 'var(--radius)', marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius)' }} />)}
      </div>
      <div className="skeleton" style={{ height: 100, borderRadius: 'var(--radius)' }} />
    </div>
  )
}
