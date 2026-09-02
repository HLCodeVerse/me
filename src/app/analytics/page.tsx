'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar } from 'recharts'
import { TrendingUp, Zap, Target, BookOpen, Sparkles, Brain, Loader2, BarChart2 } from 'lucide-react'
import { toast } from 'sonner'

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
  const [auditing, setAuditing] = useState(false)
  const [aiReport, setAiReport] = useState<string | null>(null)

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

  async function generateAIGrowthAudit() {
    if (!user) return
    setAuditing(true)
    toast.info('AI is generating your performance growth audit...')
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Analyze my metrics: Life Score=${profile?.life_score ?? 0}, Task completion rate=${taskStats.rate}%, Streak=${profile?.current_streak ?? 0} days, Journal Entries=${journalCount}. Give me a 3-bullet growth recommendations audit.`
          }],
          enableTools: false
        })
      })

      if (!res.ok) throw new Error('AI audit failed')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let resultText = ''

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
              if (delta) resultText += delta
            } catch {}
          }
        }
      }

      setAiReport(resultText)
      toast.success('AI Audit report ready!')
    } catch {
      toast.error('Could not generate AI Audit')
    } finally {
      setAuditing(false)
    }
  }

  const TOOLTIP_STYLE = {
    contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 },
    labelStyle: { color: 'var(--text-muted)', fontSize: 11 },
    cursor: { stroke: 'var(--border)' },
  }

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={20} color="#06B6D4" />
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Analytics & Insights</h1>
          </div>
          <button
            onClick={generateAIGrowthAudit}
            disabled={auditing}
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: 12 }}
          >
            {auditing ? <Loader2 size={13} className="animate-spin" /> : <Brain size={13} />}
            AI Growth Audit
          </button>
        </div>
      }
    >
      <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* AI Growth Audit Banner */}
        {aiReport && (
          <div className="card" style={{
            padding: '16px 18px',
            background: 'var(--surface-2)',
            border: '1px solid #06B6D4',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Sparkles size={16} color="#06B6D4" />
              <span style={{ fontSize: 12, color: '#06B6D4', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                AI Executive Growth Audit
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {aiReport}
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Life Score',      value: profile?.life_score ?? 0,  unit: '',    icon: TrendingUp, color: '#10B981' },
            { label: 'Task Completion', value: taskStats.rate,             unit: '%',   icon: Target,     color: '#06B6D4' },
            { label: 'Journal Entries', value: journalCount,               unit: '',    icon: BookOpen,   color: '#10B981' },
            { label: 'Current Streak',  value: profile?.current_streak ?? 0, unit: ' days', icon: Zap,    color: '#EF4444' },
          ].map(({ label, value, unit, icon: Icon, color }) => (
            <div key={label} className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
                <Icon size={14} color={color} />
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color }}>
                {value}{unit}
              </div>
            </div>
          ))}
        </div>

        {/* Life Score Trend */}
        <div className="card" style={{ padding: '18px 16px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Life Score Velocity</h3>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="score" stroke="#10B981" strokeWidth={2.5} fill="url(#scoreGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tasks Completed */}
        <div className="card" style={{ padding: '18px 16px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Daily Tasks Completed</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#06B6D4' }}>{taskStats.completed}</span>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>of {taskStats.total} total tasks</div>
              <div style={{ fontSize: 12, color: '#10B981', fontWeight: 700 }}>{taskStats.rate}% completion rate</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={data}>
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="tasks" fill="#06B6D4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Mood Trend */}
        <div className="card" style={{ padding: '18px 16px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Mood Index</h3>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={data}>
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="mood" stroke="#10B981" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Streaks */}
        {streakData.length > 0 && (
          <div className="card" style={{ padding: '18px 16px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Consistency Streaks</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {streakData.map(s => (
                <div key={s.type} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Zap size={16} color="#EF4444" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{s.type}</span>
                      <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 700 }}>{s.current}d streak</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${s.longest > 0 ? (s.current / s.longest) * 100 : 0}%`, background: '#EF4444', height: '100%', borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Best: {s.longest} days</div>
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
