'use client'

import { Plus } from 'lucide-react'

interface EventItem {
  id: string
  title: string
  time: string
  color: string
}

export default function UpcomingEventsList() {
  const events: EventItem[] = [
    { id: '1', title: 'Study Session', time: '09:00 AM - 10:30 AM', color: '#8B5CF6' },
    { id: '2', title: 'Gym Workout', time: '06:00 PM - 07:00 PM', color: '#10B981' },
    { id: '3', title: 'Reading Time', time: '09:00 PM - 09:30 PM', color: '#F59E0B' },
  ]

  return (
    <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Today&apos;s Schedule
        </h3>

        <button
          className="btn btn-ghost"
          style={{
            padding: '4px 8px',
            fontSize: 12,
            color: '#7C3AED',
            background: 'rgba(124, 58, 237, 0.08)',
            borderRadius: 6,
          }}
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {/* Events List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {events.map(event => (
          <div
            key={event.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 'var(--radius-btn)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Dot */}
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: event.color, flexShrink: 0 }} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {event.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {event.time}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
