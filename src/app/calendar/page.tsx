'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { AIInsightCard } from '@/components/helpo/AIComponents'
import {
  Calendar, ChevronLeft, ChevronRight, CheckCircle2,
  Bell, Target, Sparkles, Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { Task, Reminder, Goal } from '@/lib/supabase/database.types'

type CalView = 'month' | 'week' | 'day'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function CalendarPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const router = useRouter()

  const [tasks, setTasks] = useState<Task[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<CalView>('month')

  const now = new Date()
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<string>(now.toISOString().split('T')[0])

  const loadData = useCallback(async () => {
    if (!user) { setLoading(false); return }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any
      const [tasksRes, remindersRes, goalsRes] = await Promise.all([
        client.from('tasks').select('id, title, due_date, status, priority').eq('user_id', user.id).not('due_date', 'is', null),
        client.from('reminders').select('*').eq('user_id', user.id).order('remind_at', { ascending: true }),
        client.from('goals').select('id, title, target_date, status').eq('user_id', user.id).not('target_date', 'is', null),
      ])
      setTasks(tasksRes.data ?? [])
      setReminders(remindersRes.data ?? [])
      setGoals(goalsRes.data ?? [])
    } catch {
      toast.error('Failed to load calendar data')
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => { if (user) loadData() }, [user, loadData])

  // Build calendar grid for current month
  const calDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const startPad = firstDay.getDay()
    const days: (Date | null)[] = []
    for (let i = 0; i < startPad; i++) days.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(currentYear, currentMonth, d))
    return days
  }, [currentYear, currentMonth])

  // Items per day map
  const itemsByDay = useMemo(() => {
    const map: Record<string, { tasks: Task[]; reminders: Reminder[]; goals: Goal[] }> = {}
    tasks.forEach(t => {
      if (!t.due_date) return
      const d = t.due_date.split('T')[0]
      if (!map[d]) map[d] = { tasks: [], reminders: [], goals: [] }
      map[d].tasks.push(t)
    })
    reminders.forEach(r => {
      const d = r.remind_at.split('T')[0]
      if (!map[d]) map[d] = { tasks: [], reminders: [], goals: [] }
      map[d].reminders.push(r)
    })
    goals.forEach(g => {
      if (!g.target_date) return
      const d = g.target_date.split('T')[0]
      if (!map[d]) map[d] = { tasks: [], reminders: [], goals: [] }
      map[d].goals.push(g)
    })
    return map
  }, [tasks, reminders, goals])

  const todayStr = now.toISOString().split('T')[0]
  const selectedItems = itemsByDay[selectedDay] ?? { tasks: [], reminders: [], goals: [] }

  function prevMonth() {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11) }
    else setCurrentMonth(m => m - 1)
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0) }
    else setCurrentMonth(m => m + 1)
  }

  return (
    <AppShell>
      <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={22} color="#22D3EE" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF', margin: 0 }}>Calendar</h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Plan your time visually</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* View toggle */}
            {(['month', 'week', 'day'] as CalView[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '6px 14px', borderRadius: 10,
                  background: view === v ? 'rgba(34,211,238,0.15)' : 'var(--surface)',
                  border: `1px solid ${view === v ? 'rgba(34,211,238,0.4)' : 'var(--border)'}`,
                  color: view === v ? '#22D3EE' : 'var(--text-muted)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
                }}
              >
                {v}
              </button>
            ))}
            <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => router.push('/tasks')}>
              <Plus size={15} /> Add Task
            </button>
          </div>
        </div>

        {/* 2-col layout: Calendar + Day detail */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 16 }}>

          {/* Calendar Grid */}
          <div className="card" style={{ padding: '20px' }}>
            {/* Month nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <button onClick={prevMonth} className="btn btn-ghost btn-icon-sm"><ChevronLeft size={16} /></button>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#FFFFFF' }}>
                {MONTHS[currentMonth]} {currentYear}
              </h2>
              <button onClick={nextMonth} className="btn btn-ghost btn-icon-sm"><ChevronRight size={16} /></button>
            </div>

            {/* Weekday headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
              {WEEKDAYS.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', padding: '4px 0' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {calDays.map((day, i) => {
                if (!day) return <div key={`pad-${i}`} />
                const dayStr = day.toISOString().split('T')[0]
                const isToday = dayStr === todayStr
                const isSelected = dayStr === selectedDay
                const items = itemsByDay[dayStr]
                const hasItems = items && (items.tasks.length + items.reminders.length + items.goals.length > 0)

                return (
                  <button
                    key={dayStr}
                    onClick={() => setSelectedDay(dayStr)}
                    style={{
                      aspectRatio: '1',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      borderRadius: 10,
                      border: `1px solid ${isSelected ? 'rgba(124,58,237,0.6)' : isToday ? 'rgba(34,211,238,0.5)' : 'transparent'}`,
                      background: isSelected ? 'rgba(124,58,237,0.2)' : isToday ? 'rgba(34,211,238,0.1)' : 'transparent',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: isToday || isSelected ? 800 : 500, color: isSelected ? '#FFFFFF' : isToday ? '#22D3EE' : 'var(--text-secondary)' }}>
                      {day.getDate()}
                    </span>
                    {hasItems && (
                      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {items.tasks.length > 0 && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#3B82F6' }} />}
                        {items.reminders.length > 0 && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#FBBF24' }} />}
                        {items.goals.length > 0 && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#FF8A3D' }} />}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 14, marginTop: 16, padding: '12px 0 0', borderTop: '1px solid var(--border)' }}>
              {[
                { color: '#3B82F6', label: 'Tasks' },
                { color: '#FBBF24', label: 'Reminders' },
                { color: '#FF8A3D', label: 'Goal Dates' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Day Detail Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card" style={{ padding: '16px 18px' }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', margin: '0 0 12px' }}>
                {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>

              {selectedItems.tasks.length === 0 && selectedItems.reminders.length === 0 && selectedItems.goals.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Nothing scheduled for this day</p>
                  <button className="btn btn-primary" style={{ fontSize: 12, marginTop: 12 }} onClick={() => router.push('/tasks')}>
                    <Plus size={13} /> Add Task
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedItems.tasks.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10 }}>
                      <CheckCircle2 size={16} color={t.status === 'done' ? '#10B981' : '#3B82F6'} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: t.status === 'done' ? 'var(--text-muted)' : '#FFFFFF', textDecoration: t.status === 'done' ? 'line-through' : 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                    </div>
                  ))}
                  {selectedItems.reminders.map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10 }}>
                      <Bell size={14} color="#FBBF24" />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#FFFFFF', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{new Date(r.remind_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                  {selectedItems.goals.map(g => (
                    <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,138,61,0.08)', border: '1px solid rgba(255,138,61,0.2)', borderRadius: 10 }}>
                      <Target size={14} color="#FF8A3D" />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#FFFFFF', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</span>
                      <span className="badge badge-orange" style={{ fontSize: 10 }}>Goal</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick AI */}
            <AIInsightCard
              title="AI Planner"
              content="Want me to optimize your schedule for this day? I can rearrange tasks based on priority and energy levels."
              onAction={() => router.push('/ai?q=Optimize+my+schedule+for+today')}
              actionLabel="Optimize my day with AI"
            />

            {/* Quick stats */}
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>THIS MONTH</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Tasks', value: tasks.filter(t => t.due_date?.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`)).length, color: '#3B82F6' },
                  { label: 'Reminders', value: reminders.filter(r => r.remind_at?.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`)).length, color: '#FBBF24' },
                  { label: 'Goal Dates', value: goals.filter(g => g.target_date?.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`)).length, color: '#FF8A3D' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <button className="btn btn-ai" style={{ width: '100%', fontSize: 13 }} onClick={() => router.push('/ai?q=Plan+my+month')}>
              <Sparkles size={15} /> AI: Plan My Month
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
