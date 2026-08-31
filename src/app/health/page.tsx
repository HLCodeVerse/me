'use client'

import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { Activity, Flame, CheckCircle2, Circle, Heart, Droplets, Brain, Loader2, Play, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

interface Exercise {
  id: string
  name: string
  reps: string
  category: 'strength' | 'cardio' | 'flexibility'
  completed: boolean
}

export default function HealthPage() {
  const [waterMl, setWaterMl] = useState(1750)
  const targetWaterMl = 3000

  const [meditationMinutes, setMeditationMinutes] = useState(10)
  const [isMeditating, setIsMeditating] = useState(false)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)

  const [exercises, setExercises] = useState<Exercise[]>([
    { id: '1', name: 'Push-ups', reps: '3 sets x 20 reps', category: 'strength', completed: true },
    { id: '2', name: 'Bodyweight Squats', reps: '3 sets x 25 reps', category: 'strength', completed: true },
    { id: '3', name: 'Plank Hold', reps: '3 mins total', category: 'strength', completed: false },
    { id: '4', name: 'Morning Cardio / Jog', reps: '20 mins', category: 'cardio', completed: false },
    { id: '5', name: 'Full Body Stretching', reps: '10 mins', category: 'flexibility', completed: false },
  ])

  function toggleExercise(id: string) {
    setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, completed: !ex.completed } : ex))
    const target = exercises.find(e => e.id === id)
    if (target && !target.completed) {
      toast.success(`Completed "${target.name}"! 💪`)
    }
  }

  function addWater() {
    if (waterMl >= targetWaterMl) {
      toast.success('Daily hydration goal reached! 💧')
      return
    }
    setWaterMl(prev => Math.min(prev + 250, targetWaterMl))
    toast.info('+250ml added!')
  }

  function completeMeditation() {
    setIsMeditating(true)
    setTimeout(() => {
      setIsMeditating(false)
      toast.success(`${meditationMinutes}-minute meditation session logged! 🧘‍♂️`)
    }, 2000)
  }

  async function aiHealthAdvice() {
    setAiAnalyzing(true)
    toast.info('AI Health Coach is generating personalized recovery tips...')
    try {
      const completedList = exercises.filter(e => e.completed).map(e => e.name).join(', ')
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Give me 2 quick recovery tips based on my health log: Exercises done: ${completedList || 'None yet'}, Water intake: ${waterMl}ml.`
          }],
          enableTools: false
        })
      })

      if (res.ok) {
        toast.success('AI Health advice generated! Check AI Chat.')
      }
    } catch {
      toast.error('AI Health Coach call failed')
    } finally {
      setAiAnalyzing(false)
    }
  }

  const completedCount = exercises.filter(e => e.completed).length
  const progressPct = Math.round((completedCount / exercises.length) * 100)
  const waterPct = Math.round((waterMl / targetWaterMl) * 100)

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={20} color="#10B981" />
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Health & Wellness</h1>
          </div>
          <button
            onClick={aiHealthAdvice}
            disabled={aiAnalyzing}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '0 12px', height: 34,
              borderRadius: 'var(--radius-sm)', background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer',
              color: '#10B981', fontSize: 12, fontWeight: 700
            }}
          >
            {aiAnalyzing ? <Loader2 size={13} className="animate-spin" /> : <Brain size={13} />}
            AI Coach
          </button>
        </div>
      }
    >
      <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Overview Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          
          {/* Exercise Velocity */}
          <div className="card" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.02))', border: '1px solid rgba(16,185,129,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Daily Exercises</span>
              <Flame size={16} color="#10B981" />
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
              {completedCount} <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>/ {exercises.length}</span>
            </p>
            <div className="progress-track" style={{ height: 5, marginTop: 8, background: 'var(--surface-3)', borderRadius: 99 }}>
              <div className="progress-fill" style={{ width: `${progressPct}%`, background: '#10B981', height: '100%', borderRadius: 99 }} />
            </div>
          </div>

          {/* Hydration Tracker */}
          <div className="card" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(6,182,212,0.02))', border: '1px solid rgba(6,182,212,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Hydration</span>
              <Droplets size={16} color="#06B6D4" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                {waterMl} <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>ml</span>
              </p>
              <button
                onClick={addWater}
                style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 99,
                  background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.4)',
                  color: '#06B6D4', fontWeight: 800, cursor: 'pointer'
                }}
              >
                +250ml
              </button>
            </div>
            <div className="progress-track" style={{ height: 5, marginTop: 8, background: 'var(--surface-3)', borderRadius: 99 }}>
              <div className="progress-fill" style={{ width: `${waterPct}%`, background: '#06B6D4', height: '100%', borderRadius: 99 }} />
            </div>
          </div>

        </div>

        {/* Guided Meditation & Mindfulness Card */}
        <div className="card glow-box-cyan" style={{ padding: '16px', background: 'rgba(6,182,212,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Heart size={18} color="#06B6D4" />
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>Mindfulness & Meditation</h3>
            </div>
            <span className="badge badge-cyan" style={{ fontSize: 11 }}>10 min session</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            Take 10 minutes to reset your focus, reduce stress, and maintain mental clarity.
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={meditationMinutes}
              onChange={e => setMeditationMinutes(Number(e.target.value))}
              style={{ height: 36, padding: '0 10px', fontSize: 12, width: 'auto' }}
            >
              <option value={5}>5 Minutes</option>
              <option value={10}>10 Minutes</option>
              <option value={15}>15 Minutes</option>
              <option value={20}>20 Minutes</option>
            </select>
            <button
              onClick={completeMeditation}
              disabled={isMeditating}
              className="btn btn-primary"
              style={{ flex: 1, height: 36, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {isMeditating ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {isMeditating ? 'Logging Session...' : 'Start Meditation'}
            </button>
          </div>
        </div>

        {/* Exercise Checklist */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>Daily Exercise List</h3>
            <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>{completedCount} of {exercises.length} completed</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {exercises.map(ex => (
              <div
                key={ex.id}
                className="card"
                onClick={() => toggleExercise(ex.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', background: ex.completed ? 'rgba(16,185,129,0.06)' : 'var(--surface)',
                  border: `1px solid ${ex.completed ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
                  cursor: 'pointer', transition: 'all 200ms ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                    {ex.completed ? (
                      <CheckCircle2 size={20} color="#10B981" />
                    ) : (
                      <Circle size={20} color="var(--text-dim)" />
                    )}
                  </button>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: ex.completed ? 'var(--text-muted)' : 'var(--text)', textDecoration: ex.completed ? 'line-through' : 'none' }}>
                      {ex.name}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{ex.reps}</p>
                  </div>
                </div>

                <span style={{
                  fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  background: ex.category === 'strength' ? 'rgba(16,185,129,0.15)' : ex.category === 'cardio' ? 'rgba(6,182,212,0.15)' : 'rgba(167,139,250,0.15)',
                  color: ex.category === 'strength' ? '#10B981' : ex.category === 'cardio' ? '#06B6D4' : '#A78BFA'
                }}>
                  {ex.category}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  )
}
