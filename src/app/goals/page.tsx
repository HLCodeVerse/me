'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { Plus, Target, X, Loader2, Circle, Brain, Compass, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Goal, LifeArea } from '@/lib/supabase/database.types'

const STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  on_hold: '#F59E0B',
  completed: '#06B6D4',
  archived: 'var(--text-dim)',
}

export default function GoalsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [goals, setGoals] = useState<Goal[]>([])
  const [areas, setAreas] = useState<LifeArea[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [generatingRoadmapId, setGeneratingRoadmapId] = useState<string | null>(null)

  // Form
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [areaId, setAreaId] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    const [goalsRes, areasRes] = await Promise.all([
      supabase.from('goals').select('*').eq('user_id', user.id).order('priority', { ascending: false }),
      supabase.from('life_areas').select('*').eq('user_id', user.id),
    ])
    setGoals(goalsRes.data ?? [])
    setAreas(areasRes.data ?? [])
    setLoading(false)
  }, [user, supabase])

  useEffect(() => { load() }, [load])

  async function addGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !user) return
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('goals') as any).insert({
      user_id: user.id, title, description: desc || null,
      life_area_id: areaId || null,
      target_date: targetDate || null,
      status: 'active', priority: 2,
    })
    if (error) { toast.error('Failed to add goal'); setSaving(false); return }
    toast.success('Goal added!')
    setShowAdd(false); setTitle(''); setDesc(''); setAreaId(''); setTargetDate('')
    setSaving(false)
    load()
  }

  async function toggleGoalStatus(goal: Goal) {
    const newStatus = goal.status === 'active' ? 'completed' : 'active'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('goals') as any).update({ status: newStatus }).eq('id', goal.id)
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status: newStatus } : g))
    toast.success(newStatus === 'completed' ? 'Goal marked as completed!' : 'Goal reactivated')
  }

  async function generateGoalRoadmap(goal: Goal) {
    if (!user) return
    setGeneratingRoadmapId(goal.id)
    toast.info(`AI is generating action roadmap for "${goal.title}"...`)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Generate 3 concrete action tasks to achieve this goal: "${goal.title}". Keep task titles concise under 8 words.`
          }],
          enableTools: false
        })
      })

      if (!res.ok) throw new Error('Roadmap generation failed')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let roadmapText = ''

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
              if (delta) roadmapText += delta
            } catch {}
          }
        }
      }

      // Convert generated roadmap lines to tasks linked to this goal
      const tasksCreated = roadmapText.split('\n').map(s => s.replace(/^[-*0-9.]+\s*/, '').trim()).filter(s => s.length > 2)
      for (const tTitle of tasksCreated.slice(0, 3)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('tasks') as any).insert({
          user_id: user.id,
          goal_id: goal.id,
          title: tTitle,
          priority: 2,
          status: 'todo'
        })
      }

      toast.success('AI Roadmap tasks created!')
    } catch {
      toast.error('Could not generate goal roadmap')
    } finally {
      setGeneratingRoadmapId(null)
    }
  }

  const grouped: Record<string, Goal[]> = {}
  for (const g of goals) {
    const areaName = areas.find(a => a.id === g.life_area_id)?.name ?? 'General'
    if (!grouped[areaName]) grouped[areaName] = []
    grouped[areaName].push(g)
  }

  const filtered = selectedArea
    ? { [selectedArea]: grouped[selectedArea] ?? [] }
    : grouped

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={20} color="#10B981" />
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Goals & Vision</h1>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>
            <Plus size={15} /> Add Goal
          </button>
        </div>
      }
    >
      {/* Life Area Filters */}
      <div style={{ display: 'flex', gap: 8, paddingTop: 16, overflowX: 'auto', paddingBottom: 4 }}>
        <button
          onClick={() => setSelectedArea(null)}
          style={{
            padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
            background: !selectedArea ? '#10B981' : 'var(--surface-2)',
            color: !selectedArea ? '#0A0B0D' : 'var(--text-muted)',
          }}
        >
          All Areas
        </button>
        {areas.map(area => (
          <button
            key={area.id}
            onClick={() => setSelectedArea(a => a === area.name ? null : area.name)}
            style={{
              padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
              background: selectedArea === area.name ? area.color + '20' : 'var(--surface-2)',
              color: selectedArea === area.name ? area.color : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <Compass size={13} color={area.color} /> {area.name}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius)', marginBottom: 10 }} />)
        ) : Object.entries(filtered).map(([areaName, areaGoals]) => {
          const area = areas.find(a => a.name === areaName)
          return (
            <div key={areaName} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Compass size={16} color={area?.color ?? '#10B981'} />
                <span style={{ fontSize: 14, fontWeight: 800, color: area?.color ?? 'var(--text)' }}>{areaName}</span>
                <span className="badge badge-muted">{areaGoals.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {areaGoals.map(goal => (
                  <div
                    key={goal.id}
                    className="card"
                    style={{
                      padding: '16px',
                      opacity: goal.status === 'completed' ? 0.6 : 1,
                      borderLeft: `3px solid ${area?.color ?? 'var(--border)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <button
                        onClick={() => toggleGoalStatus(goal)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}
                      >
                        {goal.status === 'completed'
                          ? <CheckCircle2 size={20} color="#10B981" />
                          : <Circle size={20} color={area?.color ?? 'var(--text-dim)'} strokeWidth={1.5} />
                        }
                      </button>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: 15, fontWeight: 700,
                          textDecoration: goal.status === 'completed' ? 'line-through' : 'none',
                          color: 'var(--text)',
                        }}>
                          {goal.title}
                        </p>
                        {goal.description && (
                          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{goal.description}</p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{
                              fontSize: 10, fontWeight: 800, padding: '2px 8px',
                              borderRadius: 99, background: STATUS_COLORS[goal.status] + '20',
                              color: STATUS_COLORS[goal.status], textTransform: 'uppercase'
                            }}>
                              {goal.status.replace('_', ' ')}
                            </span>
                            {goal.target_date && (
                              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                                Target: {new Date(goal.target_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                          {goal.status !== 'completed' && (
                            <button
                              onClick={() => generateGoalRoadmap(goal)}
                              disabled={generatingRoadmapId === goal.id}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                                borderRadius: 'var(--radius-sm)', background: 'rgba(167,139,250,0.15)',
                                border: '1px solid rgba(167,139,250,0.3)', cursor: 'pointer',
                                color: '#A78BFA', fontSize: 11, fontWeight: 700
                              }}
                            >
                              {generatingRoadmapId === goal.id ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                              AI Roadmap
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {!loading && Object.keys(filtered).length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Target size={28} color="#10B981" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>No goals defined yet</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              Create goals for each life area to direct your focus and track outcomes.
            </p>
            <button onClick={() => setShowAdd(true)} className="btn btn-primary">
              <Plus size={16} /> Add First Goal
            </button>
          </div>
        )}
      </div>

      {/* Add Goal Modal */}
      {showAdd && (
        <>
          <div className="overlay" onClick={() => setShowAdd(false)} />
          <div className="animate-scale-in" style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
            padding: '24px 20px', zIndex: 110,
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
            maxWidth: 768, margin: '0 auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>New Goal</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>
            <form onSubmit={addGoal} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input placeholder="Goal title..." value={title} onChange={e => setTitle(e.target.value)} required style={{ fontSize: 16 }} />
              <textarea placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} rows={2} style={{ resize: 'none' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 6, display: 'block' }}>LIFE AREA</label>
                  <select value={areaId} onChange={e => setAreaId(e.target.value)}>
                    <option value="">General</option>
                    {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 6, display: 'block' }}>TARGET DATE</label>
                  <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
                </div>
              </div>
              <button type="submit" disabled={saving} className="btn btn-primary" style={{ height: 46 }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><Target size={16} /> Add Goal</>}
              </button>
            </form>
          </div>
        </>
      )}
    </AppShell>
  )
}
