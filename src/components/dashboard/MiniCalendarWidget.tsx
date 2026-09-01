'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'

export default function MiniCalendarWidget() {
  const [selectedDay, setSelectedDay] = useState(1)
  const today = 1 // 1 September 2026

  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

  // September 2026 starts on Tuesday (offset 2)
  // Prev month end: 30, 31
  const prevDays = [30, 31]
  const currentMonthDays = Array.from({ length: 30 }, (_, i) => i + 1)
  const nextDays = [1, 2, 3]

  return (
    <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Calendar Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarIcon size={16} color="#7C3AED" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            Tuesday, 1 September 2026
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button className="btn-ghost btn-icon" style={{ width: 26, height: 26, padding: 0 }}>
            <ChevronLeft size={14} color="var(--text-secondary)" />
          </button>
          <button className="btn-ghost btn-icon" style={{ width: 26, height: 26, padding: 0 }}>
            <ChevronRight size={14} color="var(--text-secondary)" />
          </button>
        </div>
      </div>

      {/* Days of Week Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', gap: 4 }}>
        {daysOfWeek.map(day => (
          <span key={day} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
            {day}
          </span>
        ))}
      </div>

      {/* Month Days Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
        {/* Prev month days */}
        {prevDays.map(d => (
          <div key={`prev-${d}`} style={{ padding: '6px 0', fontSize: 12, color: 'var(--text-muted)', opacity: 0.5 }}>
            {d}
          </div>
        ))}

        {/* Current month days */}
        {currentMonthDays.map(d => {
          const isToday = d === today
          const isSelected = d === selectedDay

          return (
            <button
              key={`curr-${d}`}
              onClick={() => setSelectedDay(d)}
              style={{
                width: '100%',
                height: 28,
                borderRadius: '50%',
                border: 'none',
                background: isToday
                  ? '#7C3AED'
                  : isSelected
                  ? 'rgba(124, 58, 237, 0.12)'
                  : 'transparent',
                color: isToday
                  ? '#FFFFFF'
                  : isSelected
                  ? '#7C3AED'
                  : 'var(--text-primary)',
                fontWeight: isToday || isSelected ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              {d}
            </button>
          )
        })}

        {/* Next month days */}
        {nextDays.map(d => (
          <div key={`next-${d}`} style={{ padding: '6px 0', fontSize: 12, color: 'var(--text-muted)', opacity: 0.5 }}>
            {d}
          </div>
        ))}
      </div>
    </div>
  )
}
