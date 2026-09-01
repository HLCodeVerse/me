'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'

// Dashboard Components
import HeroProductivityCard from '@/components/dashboard/HeroProductivityCard'
import StatCard from '@/components/dashboard/StatCard'
import AIDailyBriefCard from '@/components/dashboard/AIDailyBriefCard'
import PriorityTasksList from '@/components/dashboard/PriorityTasksList'
import MiniCalendarWidget from '@/components/dashboard/MiniCalendarWidget'
import UpcomingEventsList from '@/components/dashboard/UpcomingEventsList'
import QuickActionsGrid from '@/components/dashboard/QuickActionsGrid'
import MotivationCard from '@/components/dashboard/MotivationCard'

import { Target, CheckCircle2, Flame, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import type { Task, Todo, DailyPlan, Streak } from '@/lib/supabase/database.types'

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [todayTasks, setTodayTasks] = useState<Task[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [streak, setStreak] = useState<Streak | null>(null)
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
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

  async function toggleTask(taskId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tasks') as any)
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', taskId)
    setTodayTasks(prev => prev.filter(t => t.id !== taskId))
    toast.success('Task marked as done!')
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

  if (loading || !user || dataLoading) return <LoadingSkeleton />

  const lifeScore = profile?.life_score ?? 85
  const streakCount = streak?.current_count ?? 7

  return (
    <AppShell>
      <div className="dashboard-grid animate-fade-in">
        {/* Main Content (Left Column) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 1. Hero Productivity Index Card */}
          <HeroProductivityCard
            score={lifeScore}
            streak={streakCount}
            careerScore={78}
            healthScore={85}
            focusScore={70}
          />

          {/* 2. 4 Stat Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <StatCard
              label="Tasks Due"
              value={todayTasks.length > 0 ? todayTasks.length : 5}
              sublabel="Open tasks"
              icon={Target}
              iconColor="#7C3AED"
              iconBg="rgba(124, 58, 237, 0.08)"
            />
            <StatCard
              label="Quick Todos"
              value={todos.length > 0 ? todos.length : 4}
              sublabel="Remaining"
              icon={CheckCircle2}
              iconColor="#10B981"
              iconBg="rgba(16, 185, 129, 0.08)"
            />
            <StatCard
              label="Day Streak"
              value={streakCount}
              sublabel="Days active"
              icon={Flame}
              iconColor="#F59E0B"
              iconBg="rgba(245, 158, 11, 0.08)"
            />
            <StatCard
              label="Life Score"
              value={lifeScore}
              sublabel="/ 100 max"
              icon={TrendingUp}
              iconColor="#3B82F6"
              iconBg="rgba(59, 130, 246, 0.08)"
            />
          </div>

          {/* 3. AI Daily Brief Widget */}
          <AIDailyBriefCard
            summary={dailyPlan?.ai_generated_summary}
            loading={generatingPlan}
            onGenerate={generateAIDailyPlan}
          />

          {/* 4. Priority Tasks List */}
          <PriorityTasksList
            tasks={todayTasks}
            onToggleTask={toggleTask}
          />
        </div>

        {/* Right Panel Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Mini Calendar Widget */}
          <MiniCalendarWidget />

          {/* Today's Schedule / Upcoming Events */}
          <UpcomingEventsList />

          {/* Quick Actions 2x2 Grid */}
          <QuickActionsGrid />

          {/* Motivation Quote Accent Card */}
          <MotivationCard />
        </div>
      </div>
    </AppShell>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-card)', marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-card)' }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-card)' }} />
    </div>
  )
}
