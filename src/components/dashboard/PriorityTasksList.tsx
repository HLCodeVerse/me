'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, Clock, MoreVertical, Database, BookOpen, Calculator, Dumbbell } from 'lucide-react'
import type { Task } from '@/lib/supabase/database.types'

interface DisplayTaskItem {
  id: string
  title: string
  category?: string
  time?: string
}

interface PriorityTasksListProps {
  tasks: Task[]
  onToggleTask?: (id: string) => void
}

export default function PriorityTasksList({ tasks, onToggleTask }: PriorityTasksListProps) {
  // Mock default tasks matching reference image if tasks array is empty
  const displayTasks: DisplayTaskItem[] = tasks.length > 0
    ? tasks.map(t => ({ id: t.id, title: t.title, category: 'learn', time: '09:00 AM' }))
    : [
        { id: '1', title: 'MySQL — SELECT, WHERE, ORDER BY, LIMIT practice', category: 'db', time: '09:00 AM' },
        { id: '2', title: 'MySQL + Prepositions — filtering queries & rules', category: 'learn', time: '11:00 AM' },
        { id: '3', title: 'Math (Parimiti) — Practice & Problem Solving', category: 'math', time: '04:00 PM' },
        { id: '4', title: 'Gym Workout', category: 'fitness', time: '06:00 PM' },
        { id: '5', title: 'Reading Time', category: 'read', time: '09:00 PM' },
      ]

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'db': return <Database size={16} color="#3B82F6" />
      case 'learn': return <BookOpen size={16} color="#8B5CF6" />
      case 'math': return <Calculator size={16} color="#F59E0B" />
      case 'fitness': return <Dumbbell size={16} color="#10B981" />
      default: return <BookOpen size={16} color="#3B82F6" />
    }
  }

  return (
    <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Priority Tasks
          </h3>
          <span className="badge badge-primary" style={{ fontSize: 12 }}>
            {displayTasks.length}
          </span>
        </div>

        <Link
          href="/tasks"
          style={{ fontSize: 13, fontWeight: 600, color: '#7C3AED', textDecoration: 'none' }}
        >
          View All Tasks →
        </Link>
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {displayTasks.map((t, idx) => (
          <TaskRowItem
            key={t.id}
            task={t}
            icon={getCategoryIcon(t.category)}
            isLast={idx === displayTasks.length - 1}
            onToggle={() => onToggleTask && onToggleTask(t.id)}
          />
        ))}
      </div>
    </div>
  )
}

function TaskRowItem({
  task,
  icon,
  isLast,
  onToggle,
}: {
  task: DisplayTaskItem
  icon: React.ReactNode
  isLast: boolean
  onToggle: () => void
}) {
  const [completed, setCompleted] = useState(false)

  const handleToggle = () => {
    setCompleted(!completed)
    onToggle()
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 8px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        borderRadius: 8,
        transition: 'background 150ms ease',
      }}
      className="hover:bg-[var(--surface-2)]"
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}
      >
        {completed ? (
          <CheckCircle2 size={18} color="#10B981" />
        ) : (
          <Circle size={18} color="var(--text-muted)" />
        )}
      </button>

      {/* Category Icon */}
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        background: 'var(--surface-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>

      {/* Title */}
      <span style={{
        flex: 1,
        fontSize: 13,
        fontWeight: 500,
        color: completed ? 'var(--text-muted)' : 'var(--text-primary)',
        textDecoration: completed ? 'line-through' : 'none',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {task.title}
      </span>

      {/* Time Tag */}
      {task.time && (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          borderRadius: 6,
          background: 'rgba(124, 58, 237, 0.08)',
          color: '#7C3AED',
          fontSize: 11,
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}>
          <Clock size={12} />
          {task.time}
        </span>
      )}

      {/* Overflow Menu */}
      <button
        className="btn-ghost btn-icon"
        style={{ width: 28, height: 28, padding: 0 }}
        aria-label="More options"
      >
        <MoreVertical size={16} color="var(--text-muted)" />
      </button>
    </div>
  )
}
