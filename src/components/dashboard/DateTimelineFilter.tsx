'use client'

import React, { useState, useMemo } from 'react'
import {
  Calendar as CalendarIcon, CheckCircle2, CircleCheck, BookOpen, Bell,
  CalendarDays, Trash2, Plus
} from 'lucide-react'
import type { Task, Todo, Reminder, JournalEntry, DailyPlan } from '@/lib/supabase/database.types'

export type DateFilterMode = 'today' | 'tomorrow' | 'overdue' | 'upcoming' | 'custom' | 'all'

interface DateTimelineFilterProps {
  tasks: Task[]
  todos: Todo[]
  journalEntries: JournalEntry[]
  reminders: Reminder[]
  dailyPlans?: DailyPlan[]
  onToggleTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
  onToggleTodo: (todo: Todo) => void
  onDeleteTodo: (todoId: string) => void
  onQuickAddTask: (title: string, dateStr: string) => void
}

export default function DateTimelineFilter({
  tasks,
  todos,
  journalEntries,
  reminders,
  onToggleTask,
  onDeleteTask,
  onToggleTodo,
  onDeleteTodo,
  onQuickAddTask,
}: DateTimelineFilterProps) {
  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrowObj = new Date()
  tomorrowObj.setDate(tomorrowObj.getDate() + 1)
  const tomorrowStr = tomorrowObj.toISOString().split('T')[0]

  const [filterMode, setFilterMode] = useState<DateFilterMode>('today')
  const [customDate, setCustomDate] = useState<string>(todayStr)
  const [quickTitle, setQuickTitle] = useState('')

  // Selected date string derived from filterMode
  const activeDateStr = useMemo(() => {
    if (filterMode === 'today') return todayStr
    if (filterMode === 'tomorrow') return tomorrowStr
    if (filterMode === 'custom') return customDate
    return todayStr
  }, [filterMode, todayStr, tomorrowStr, customDate])

  // Count helper functions
  const counts = useMemo(() => {
    const overdueTasks = tasks.filter(t => t.due_date && t.due_date.split('T')[0] < todayStr && t.status !== 'done').length
    const overdueTodos = todos.filter(t => t.due_date && t.due_date < todayStr && !t.is_done).length
    
    const todayTasks = tasks.filter(t => t.due_date && t.due_date.split('T')[0] === todayStr).length
    const todayTodos = todos.filter(t => !t.due_date || t.due_date === todayStr).length

    const tomorrowTasks = tasks.filter(t => t.due_date && t.due_date.split('T')[0] === tomorrowStr).length
    const tomorrowTodos = todos.filter(t => t.due_date === tomorrowStr).length

    const upcomingTasks = tasks.filter(t => t.due_date && t.due_date.split('T')[0] > todayStr).length

    return {
      overdue: overdueTasks + overdueTodos,
      today: todayTasks + todayTodos,
      tomorrow: tomorrowTasks + tomorrowTodos,
      upcoming: upcomingTasks,
      all: tasks.length + todos.length + journalEntries.length,
    }
  }, [tasks, todos, journalEntries, todayStr, tomorrowStr])

  // Filtered items based on filterMode
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!t.due_date) return filterMode === 'all' || filterMode === 'today'
      const itemDate = t.due_date.split('T')[0]
      if (filterMode === 'today') return itemDate === todayStr
      if (filterMode === 'tomorrow') return itemDate === tomorrowStr
      if (filterMode === 'overdue') return itemDate < todayStr && t.status !== 'done'
      if (filterMode === 'upcoming') return itemDate > todayStr
      if (filterMode === 'custom') return itemDate === customDate
      return true
    })
  }, [tasks, filterMode, todayStr, tomorrowStr, customDate])

  const filteredTodos = useMemo(() => {
    return todos.filter(t => {
      if (!t.due_date) return filterMode === 'all' || filterMode === 'today'
      const itemDate = t.due_date
      if (filterMode === 'today') return itemDate === todayStr
      if (filterMode === 'tomorrow') return itemDate === tomorrowStr
      if (filterMode === 'overdue') return itemDate < todayStr && !t.is_done
      if (filterMode === 'upcoming') return itemDate > todayStr
      if (filterMode === 'custom') return itemDate === customDate
      return true
    })
  }, [todos, filterMode, todayStr, tomorrowStr, customDate])

  const filteredJournals = useMemo(() => {
    return journalEntries.filter(j => {
      if (!j.created_at) return false
      const itemDate = j.created_at.split('T')[0]
      if (filterMode === 'today') return itemDate === todayStr
      if (filterMode === 'tomorrow') return itemDate === tomorrowStr
      if (filterMode === 'custom') return itemDate === customDate
      if (filterMode === 'all') return true
      return false
    })
  }, [journalEntries, filterMode, todayStr, tomorrowStr, customDate])

  const filteredReminders = useMemo(() => {
    return reminders.filter(r => {
      if (!r.remind_at) return false
      const itemDate = r.remind_at.split('T')[0]
      if (filterMode === 'today') return itemDate === todayStr
      if (filterMode === 'tomorrow') return itemDate === tomorrowStr
      if (filterMode === 'overdue') return itemDate < todayStr && !r.is_sent
      if (filterMode === 'upcoming') return itemDate > todayStr
      if (filterMode === 'custom') return itemDate === customDate
      return true
    })
  }, [reminders, filterMode, todayStr, tomorrowStr, customDate])

  function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!quickTitle.trim()) return
    onQuickAddTask(quickTitle.trim(), activeDateStr)
    setQuickTitle('')
  }

  const filterButtons: { mode: DateFilterMode; label: string; count: number; badgeColor?: string }[] = [
    { mode: 'today', label: 'Today', count: counts.today, badgeColor: '#3B82F6' },
    { mode: 'tomorrow', label: 'Tomorrow', count: counts.tomorrow, badgeColor: '#10B981' },
    { mode: 'overdue', label: 'Overdue', count: counts.overdue, badgeColor: '#F43F5E' },
    { mode: 'upcoming', label: 'Upcoming', count: counts.upcoming, badgeColor: '#8B5CF6' },
    { mode: 'all', label: 'All Dates', count: counts.all },
    { mode: 'custom', label: 'Custom Date', count: 0 },
  ]

  return (
    <div
      style={{
        background: '#0A0B0D',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 22,
        padding: 22,
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Date Filter Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
            }}
          >
            <CalendarDays size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em' }}>
              Date Timeline & Multi-Item Agenda
            </h3>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
              Organized chronologically by dates across tasks, todos, journals & reminders
            </span>
          </div>
        </div>

        {/* Date Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {filterButtons.map(b => {
            const isActive = filterMode === b.mode
            return (
              <button
                key={b.mode}
                onClick={() => setFilterMode(b.mode)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 10,
                  border: isActive ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.06)',
                  background: isActive ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : '#121318',
                  color: isActive ? '#FFFFFF' : '#9CA3AF',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{b.label}</span>
                {b.mode !== 'custom' && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: 99,
                      background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                      color: isActive ? '#FFFFFF' : b.badgeColor || '#9CA3AF',
                    }}
                  >
                    {b.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom Date Picker & Quick Add Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          background: '#121318',
          padding: 12,
          borderRadius: 14,
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {filterMode === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF' }}>Pick Date:</span>
            <input
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              style={{
                height: 36,
                background: '#0A0B0D',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: 8,
                color: '#FFFFFF',
                fontSize: 12,
                padding: '0 10px',
                outline: 'none',
              }}
            />
          </div>
        )}

        <form onSubmit={handleQuickSubmit} style={{ display: 'flex', gap: 8, flex: 1 }}>
          <input
            type="text"
            placeholder={`Add new task/item for ${filterMode === 'all' ? 'Today' : filterMode.toUpperCase()} (${activeDateStr})...`}
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            style={{
              flex: 1,
              height: 36,
              background: '#0A0B0D',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              color: '#FFFFFF',
              fontSize: 12.5,
              padding: '0 12px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              height: 36,
              padding: '0 14px',
              borderRadius: 8,
              background: '#3B82F6',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Plus size={14} /> Schedule
          </button>
        </form>
      </div>

      {/* Unified Timeline Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 420, overflowY: 'auto' }}>
        {filteredTasks.length === 0 && filteredTodos.length === 0 && filteredJournals.length === 0 && filteredReminders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: '#9CA3AF' }}>
            <CalendarIcon size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F3F4F6' }}>No items scheduled for this date filter</div>
            <p style={{ fontSize: 12, margin: '4px 0 0' }}>Use the quick bar above to schedule a new task or todo!</p>
          </div>
        ) : (
          <>
            {/* 1. TASKS SECTION */}
            {filteredTasks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#3B82F6', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={13} /> Tasks ({filteredTasks.length})
                </div>
                {filteredTasks.map(t => (
                  <div
                    key={`task-${t.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#121318',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      padding: '10px 14px',
                      borderRadius: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        onClick={() => onToggleTask(t)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                      >
                        {t.status === 'done' ? (
                          <CheckCircle2 size={18} color="#10B981" />
                        ) : (
                          <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid #9CA3AF' }} />
                        )}
                      </button>
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: '#FFFFFF',
                            textDecoration: t.status === 'done' ? 'line-through' : 'none',
                          }}
                        >
                          {t.title}
                        </div>
                        {t.due_date && (
                          <div style={{ fontSize: 10.5, color: t.due_date.split('T')[0] < todayStr && t.status !== 'done' ? '#F43F5E' : '#9CA3AF' }}>
                            {t.due_date.split('T')[0] < todayStr && t.status !== 'done' ? '⚠️ Overdue: ' : 'Due: '}
                            {new Date(t.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: t.status === 'done' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: t.status === 'done' ? '#34D399' : '#60A5FA',
                        }}
                      >
                        {t.status === 'done' ? 'Completed' : `P${t.priority || 3}`}
                      </span>
                      <button
                        onClick={() => onDeleteTask(t.id)}
                        style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: 2 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. TODOS CHECKLIST SECTION */}
            {filteredTodos.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#10B981', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CircleCheck size={13} /> Daily Todos ({filteredTodos.length})
                </div>
                {filteredTodos.map(t => (
                  <div
                    key={`todo-${t.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#121318',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      padding: '10px 14px',
                      borderRadius: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        onClick={() => onToggleTodo(t)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                      >
                        {t.is_done ? (
                          <CircleCheck size={18} color="#10B981" />
                        ) : (
                          <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid #9CA3AF' }} />
                        )}
                      </button>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#FFFFFF',
                          textDecoration: t.is_done ? 'line-through' : 'none',
                        }}
                      >
                        {t.title}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: t.is_done ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: t.is_done ? '#34D399' : '#FBBF24',
                        }}
                      >
                        {t.is_done ? 'Checked' : 'Pending'}
                      </span>
                      <button
                        onClick={() => onDeleteTodo(t.id)}
                        style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: 2 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. JOURNAL ENTRIES SECTION */}
            {filteredJournals.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#8B5CF6', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={13} /> Journal Entries ({filteredJournals.length})
                </div>
                {filteredJournals.map(j => (
                  <div
                    key={`journal-${j.id}`}
                    style={{
                      background: '#121318',
                      border: '1px solid rgba(139, 92, 246, 0.25)',
                      padding: '10px 14px',
                      borderRadius: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#E9D5FF' }}>
                        {j.title || 'Untitled Journal Entry'}
                      </div>
                      <span style={{ fontSize: 10, color: '#C084FC', fontWeight: 700 }}>
                        {j.mood ? `Mood: ${j.mood}` : 'Journal'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {j.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 4. REMINDERS SECTION */}
            {filteredReminders.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#F59E0B', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Bell size={13} /> System Reminders ({filteredReminders.length})
                </div>
                {filteredReminders.map(r => (
                  <div
                    key={`rem-${r.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#121318',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      padding: '10px 14px',
                      borderRadius: 12,
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#FCD34D' }}>{r.title}</div>
                    <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                      {r.remind_at ? new Date(r.remind_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
