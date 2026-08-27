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
  TrendingUp, Zap, ChevronRight, Target, Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { getGreeting, formatDate } from '@/lib/utils'
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
          .single(),
        supabase
          .from('daily_plans')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .single(),
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
  }

  async function toggleTodo(todoId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('todos') as any).update({ is_done: true }).eq('id', todoId)
    setTodos(prev => prev.filter(t => t.id !== todoId))
  }

  if (loading || !user) return <LoadingSkeleton />

  const lifeScore = profile?.life_score ?? 0
  const streakCount = streak?.current_count ?? 0

  const quickStats: QuickStat[] = [
    { label: 'Tasks Due',  value: todayTasks.length, sub: 'open',       color: 'var(--focus)',  icon: Target  },
    { label: 'Todos',      value: todos.length,      sub: 'remaining',  color: 'var(--info)',   icon: CheckCircle2 },
    { label: 'Streak',     value: streakCount,       sub: 'days',       color: 'var(--focus)',  icon: Zap    },
    { label: 'Life Score', value: lifeScore,         sub: '/ 100',      color: 'var(--growth)', icon: TrendingUp },
  ]

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 500 }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>
              {getGreeting()}, {profile?.display_name?.split(' ')[0] ?? 'Builder'} 👋
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
      <div style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Life Score + Streak Hero */}
        <div className="animate-fade-up card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20, background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)' }}>
          <LifeScoreRing score={lifeScore} size={140} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Rebuilding Progress
            </p>
            <StreakBadge count={streakCount} size="md" />
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <AreaBar label="Career" score={72} color="#60A5FA" />
              <AreaBar label="Health" score={85} color="#34D399" />
              <AreaBar label="Skills" score={61} color="#FB923C" />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="animate-fade-up delay-100" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {quickStats.map(({ label, value, sub, color, icon: Icon }, i) => (
            <div key={i} className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                <Icon size={14} color={color} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* AI Daily Brief */}
        {dailyPlan?.ai_generated_summary && (
          <div className="animate-fade-up delay-200" style={{
            padding: '16px 18px',
            background: 'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(52,211,153,0.06))',
            border: '1px solid rgba(167,139,250,0.2)',
            borderRadius: 'var(--radius)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Sparkles size={15} color="#A78BFA" />
              <span style={{ fontSize: 12, color: '#A78BFA', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                AI Daily Brief
              </span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {dailyPlan.ai_generated_summary}
            </p>
          </div>
        )}

        {!dailyPlan?.ai_generated_summary && (
          <Link href="/ai" className="animate-fade-up delay-200" style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '16px 18px',
            background: 'linear-gradient(135deg, rgba(167,139,250,0.08), rgba(52,211,153,0.04))',
            border: '1px solid rgba(167,139,250,0.15)',
            borderRadius: 'var(--radius)',
            textDecoration: 'none',
          }}>
            <Brain size={20} color="#A78BFA" />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Generate daily plan</p>
              <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Let AI prioritize your day</p>
            </div>
            <ChevronRight size={16} color="var(--text-dim)" />
          </Link>
        )}

        {/* Today's Tasks */}
        <section className="animate-fade-up delay-300">
          <SectionHeader title="Open Tasks" href="/tasks" count={todayTasks.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {dataLoading
              ? [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 'var(--radius)' }} />)
              : todayTasks.length === 0
              ? <EmptyState icon="✅" msg="No open tasks. Add one!" href="/tasks" />
              : todayTasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    completing={completingTask === task.id}
                    onComplete={() => completeTask(task.id)}
                  />
                ))
            }
          </div>
        </section>

        {/* Quick Todos */}
        <section className="animate-fade-up delay-400">
          <SectionHeader title="Quick Todos" href="/todos" count={todos.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
            {dataLoading
              ? [1, 2].map(i => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 'var(--radius-sm)' }} />)
              : todos.length === 0
              ? <EmptyState icon="📝" msg="Your todo list is clear!" href="/todos" />
              : todos.map(todo => (
                  <div key={todo.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', background: 'var(--surface)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  }}>
                    <button onClick={() => toggleTodo(todo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                      <Circle size={18} color="var(--border-2)" />
                    </button>
                    <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{todo.title}</span>
                  </div>
                ))
            }
          </div>
        </section>

        {/* Quick Links */}
        <section className="animate-fade-up delay-500">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <QuickLink href="/journal" icon="📓" label="New Journal Entry" color="#A78BFA" />
            <QuickLink href="/learn"   icon="🎓" label="Continue Learning"  color="#60A5FA" />
            <QuickLink href="/goals"   icon="🎯" label="View Goals"         color="#34D399" />
            <QuickLink href="/ai"      icon="🤖" label="Chat with AI"       color="#F59E0B" />
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
      <span style={{ fontSize: 11, color: 'var(--text-dim)', width: 42, flexShrink: 0 }}>{label}</span>
      <div className="progress-track" style={{ flex: 1 }}>
        <div className="progress-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 700, width: 26, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{score}</span>
    </div>
  )
}

function SectionHeader({ title, href, count }: { title: string; href: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
        {count > 0 && (
          <span className="badge badge-muted">{count}</span>
        )}
      </div>
      <Link href={href} style={{ fontSize: 12, color: 'var(--growth)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
        See all <ChevronRight size={14} />
      </Link>
    </div>
  )
}

function TaskRow({ task, completing, onComplete }: { task: Task; completing: boolean; onComplete: () => void }) {
  const priorityColors = ['var(--text-dim)', 'var(--growth)', 'var(--focus)', 'var(--danger)']
  const pColor = priorityColors[Math.min(task.priority - 1, 3)]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', background: 'var(--surface)',
      border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      opacity: completing ? 0.5 : 1, transition: 'opacity 200ms',
    }}>
      <button onClick={onComplete} disabled={completing} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
        <Circle size={20} color={pColor} strokeWidth={1.5} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {task.title}
        </p>
        {task.due_date && (
          <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
            Due {formatDate(task.due_date, 'short')}
          </p>
        )}
      </div>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: pColor, flexShrink: 0 }} />
    </div>
  )
}

function EmptyState({ icon, msg, href }: { icon: string; msg: string; href: string }) {
  return (
    <Link href={href} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      padding: '24px', background: 'var(--surface)',
      border: '1px dashed var(--border)', borderRadius: 'var(--radius)',
      textDecoration: 'none', color: 'var(--text-muted)', fontSize: 14,
    }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span>{msg}</span>
    </Link>
  )
}

function QuickLink({ href, icon, label, color }: { href: string; icon: string; label: string; color: string }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '14px 16px', background: 'var(--surface)',
      border: `1px solid ${color}22`,
      borderRadius: 'var(--radius)',
      textDecoration: 'none', transition: 'border-color 200ms, background 200ms',
    }}>
      <span style={{ fontSize: 20, filter: `drop-shadow(0 0 6px ${color}80)` }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{label}</span>
    </Link>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '80px 16px 16px' }}>
      <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius)', marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius)' }} />)}
      </div>
      <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius)' }} />
    </div>
  )
}
