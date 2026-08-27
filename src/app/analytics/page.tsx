'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar } from 'recharts'
import { TrendingUp, Flame, Target, BookOpen } from 'lucide-react'

function generateMockData() {
  const days = 14
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    return {
      date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      score: Math.floor(50 + Math.random() * 40),
      tasks: Math.floor(Math.random() * 8),
      mood: Math.floor(40 + Math.random() * 60),
    }
  })
}

export default function AnalyticsPage() {
  const { user, profile } = useAuth()
  const supabase = createClient()
  const [data] = useState(generateMockData)
  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0, rate: 0 })
  const [streakData, setStreakData] = useState<{ type: string; current: number; longest: number }[]>([])
  const [journalCount, setJournalCount] = useState(0)

  const loadStats = useCallback(async () => {
    if (!user) return
    const [tasksRes, streaksRes, journalRes] = await Promise.all([
      supabase.from('tasks').select('id, status').eq('user_id', user.id),
      supabase.from('streaks').select('*').eq('user_id', user.id),
      supabase.from('journal_entries').select('id').eq('user_id', user.id),
    ])
    const tasks = (tasksRes.data ?? []) as { id: string; status: string }[]
    const done = tasks.filter(t => t.status === 'done').length
    setTaskStats({ total: tasks.length, completed: done, rate: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0 })
    const streaks = (streaksRes.data ?? []) as { type: string; current_count: number; longest_count: number }[]
    setStreakData(streaks.map(s => ({ type: s.type, current: s.current_count, longest: s.longest_count })))
    setJournalCount(journalRes.data?.length ?? 0)
  }, [user, supabase])

  useEffect(() => { loadStats() }, [loadStats])

  const TOOLTIP_STYLE = {
    contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 },
    labelStyle: { color: 'var(--text-muted)', fontSize: 11 },
    cursor: { stroke: 'var(--border-2)' },
  }

  return (
    <AppShell
      header={
        <div style={{ width: '100%' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Analytics</h1>
        </div>
      }
    >
      <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Life Score',      value: profile?.life_score ?? 0,  unit: '',    icon: TrendingUp, color: 'var(--growth)' },
            { label: 'Task Rate',       value: taskStats.rate,             unit: '%',   icon: Target,     color: 'var(--focus)'  },
            { label: 'Journal Entries', value: journalCount,               unit: '',    icon: BookOpen,   color: 'var(--purple)' },
            { label: 'Day Streak',      value: profile?.current_streak ?? 0, unit: 'd', icon: Flame,      color: 'var(--focus)'  },
          ].map(({ label, value, unit, icon: Icon, color }) => (
            <div key={label} className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
                <Icon size={14} color={color} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
                {value}{unit}
              </div>
            </div>
          ))}
        </div>

        {/* Life Score Trend */}
        <div className="card" style={{ padding: '18px 16px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Life Score Trend</h3>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34D399" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="score" stroke="#34D399" strokeWidth={2} fill="url(#scoreGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tasks Completed */}
        <div className="card" style={{ padding: '18px 16px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Daily Tasks Completed</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--focus)' }}>{taskStats.completed}</span>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>of {taskStats.total} total</div>
              <div style={{ fontSize: 12, color: 'var(--growth)', fontWeight: 700 }}>{taskStats.rate}% completion rate</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={data}>
              <XAxis dataKey="date" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="tasks" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Mood Trend */}
        <div className="card" style={{ padding: '18px 16px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Mood Trend</h3>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={data}>
              <XAxis dataKey="date" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="mood" stroke="#A78BFA" strokeWidth={2.5} dot={false} strokeLinecap="round" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Streaks */}
        {streakData.length > 0 && (
          <div className="card" style={{ padding: '18px 16px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Streaks</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {streakData.map(s => (
                <div key={s.type} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Flame size={16} color="var(--focus)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{s.type}</span>
                      <span style={{ fontSize: 12, color: 'var(--focus)', fontWeight: 700 }}>{s.current}d streak</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${s.longest > 0 ? (s.current / s.longest) * 100 : 0}%`, background: 'var(--focus)' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>Best: {s.longest} days</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
