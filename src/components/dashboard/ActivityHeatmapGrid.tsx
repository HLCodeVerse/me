'use client'

import React, { useMemo } from 'react'
import { Flame } from 'lucide-react'
import type { Task, Todo, HabitLog } from '@/lib/supabase/database.types'

interface ActivityHeatmapGridProps {
  tasks: Task[]
  todos: Todo[]
  habitLogs?: HabitLog[]
  daysCount?: number
}

interface DayActivity {
  dateStr: string
  dayNum: number
  monthName: string
  completedTasks: number
  completedTodos: number
  completedHabits: number
  totalActivity: number
  intensity: 0 | 1 | 2 | 3 | 4
}

export default function ActivityHeatmapGrid({
  tasks,
  todos,
  habitLogs = [],
  daysCount = 35,
}: ActivityHeatmapGridProps) {
  // Generate date array for the last `daysCount` days ending today
  const activityData = useMemo(() => {
    const todayObj = new Date()
    const days: DayActivity[] = []

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(todayObj.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayNum = d.getDate()
      const monthName = d.toLocaleDateString(undefined, { month: 'short' })

      // Count tasks completed on this date
      const cTasks = tasks.filter(t => {
        if (t.status !== 'done') return false
        if (t.completed_at) return t.completed_at.startsWith(dateStr)
        if (t.due_date) return t.due_date.startsWith(dateStr)
        return false
      }).length

      // Count todos completed on this date
      const cTodos = todos.filter(t => {
        if (!t.is_done) return false
        if (t.due_date) return t.due_date === dateStr
        return true
      }).length

      // Count habits logged on this date
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cHabits = habitLogs.filter((h: any) => h.logged_at === dateStr).length

      const total = cTasks + cTodos + cHabits

      let intensity: 0 | 1 | 2 | 3 | 4 = 0
      if (total >= 7) intensity = 4
      else if (total >= 5) intensity = 3
      else if (total >= 3) intensity = 2
      else if (total >= 1) intensity = 1

      days.push({
        dateStr,
        dayNum,
        monthName,
        completedTasks: cTasks,
        completedTodos: cTodos,
        completedHabits: cHabits,
        totalActivity: total,
        intensity,
      })
    }

    return days
  }, [tasks, todos, habitLogs, daysCount])

  // Get color for activity intensity level (Strict Green/Cyan/Black palette)
  function getTileColor(intensity: 0 | 1 | 2 | 3 | 4) {
    switch (intensity) {
      case 4:
        return { bg: '#10B981', border: '#34D399', shadow: '0 0 8px rgba(16, 185, 129, 0.6)' }
      case 3:
        return { bg: '#059669', border: '#10B981', shadow: 'none' }
      case 2:
        return { bg: '#047857', border: '#059669', shadow: 'none' }
      case 1:
        return { bg: '#065F46', border: '#047857', shadow: 'none' }
      default:
        return { bg: 'var(--surface-2)', border: 'var(--border)', shadow: 'none' }
    }
  }

  const activeDaysCount = activityData.filter(d => d.totalActivity > 0).length
  const totalCompletedItems = activityData.reduce((acc, d) => acc + d.totalActivity, 0)

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: 22,
        padding: 20,
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
            }}
          >
            <Flame size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
              Daily Consistency & Activeness Heatmap
            </h3>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Completed task, todo & habit intensity over the past 35 days
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#10B981' }}>
            {activeDaysCount} Active Days
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
            {totalCompletedItems} Items Done
          </span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(34px, 1fr))',
          gap: 6,
          background: 'var(--surface-2)',
          padding: 14,
          borderRadius: 14,
          border: '1px solid var(--border)',
        }}
      >
        {activityData.map(d => {
          const tileStyle = getTileColor(d.intensity)
          const isToday = d.dateStr === new Date().toISOString().split('T')[0]

          return (
            <div
              key={d.dateStr}
              title={`${d.monthName} ${d.dayNum}: ${d.totalActivity} items completed (${d.completedTasks} tasks, ${d.completedTodos} todos, ${d.completedHabits} habits)`}
              style={{
                height: 34,
                borderRadius: 8,
                background: tileStyle.bg,
                border: isToday ? '1.5px solid #06B6D4' : `1px solid ${tileStyle.border}`,
                boxShadow: tileStyle.shadow,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
                position: 'relative',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: d.intensity > 0 ? '#FFFFFF' : 'var(--text-muted)',
                }}
              >
                {d.dayNum}
              </span>
              {d.totalActivity > 0 && (
                <span style={{ fontSize: 8, fontWeight: 900, color: d.intensity >= 3 ? '#000000' : '#34D399' }}>
                  {d.totalActivity}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Heatmap Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
        <span>Less</span>
        {([0, 1, 2, 3, 4] as const).map(lvl => {
          const s = getTileColor(lvl)
          return (
            <div
              key={lvl}
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: s.bg,
                border: `1px solid ${s.border}`,
              }}
            />
          )
        })}
        <span>More</span>
      </div>
    </div>
  )
}
