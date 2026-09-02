'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { Plus, Target, X, Loader2, Circle, Brain, Compass, CheckCircle2, Sparkles, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { stripMarkdown } from '@/lib/utils'
import type { Goal, LifeArea } from '@/lib/supabase/database.types'

const STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  on_hold: '#06B6D4',
  completed: '#10B981',
  archived: 'var(--text-muted)',
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
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)

  // Form
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [areaId, setAreaId] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    try {
      const [goalsRes, areasRes] = await Promise.all([
        supabase.from('goals').select('*').eq('user_id', user.id).order('priority', { ascending: false }),
        supabase.from('life_areas').select('*').eq('user_id', user.id),
      ])
      setGoals(goalsRes.data ?? [])
      setAreas(areasRes.data ?? [])
    } catch {
      setGoals([])
      setAreas([])
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => { load() }, [load])

  async function addGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !user) return
    setSaving(true)
    const cleanTitle = stripMarkdown(title.trim())
    const cleanDesc = stripMarkdown(desc.trim())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('goals') as any).insert({
      user_id: user.id, title: cleanTitle, description: cleanDesc || null,
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

  async function handleAIGoalGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const promptToUse = aiPrompt.trim() || 'Create a goal to launch my product v1'
    setAiGenerating(true)
    toast.info('AI is generating your goal & action roadmap...')

    try {
      const customGrokKey = typeof window !== 'undefined' ? localStorage.getItem('nirmaan_grok_key') : null
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: promptToUse }],
          enableTools: true,
          userId: user.id,
          grokApiKey: customGrokKey,
        })
      })

      if (!res.ok) throw new Error('AI goal generation failed')

      setAiPrompt('')
      toast.success('AI Goal created & synchronized! 🎯')
      load()
    } catch {
      toast.error('AI goal generation failed')
    } finally {
      setAiGenerating(false)
    }
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
            content: `Generate 3 concrete action tasks to achieve this goal: "${goal.title}". Return ONLY plain text titles separated by line breaks, without bullet symbols or markdown formatting.`
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

      const tasksCreated = roadmapText.split('\n').map(s => stripMarkdown(s)).filter(s => s.length > 2)
      for (const tTitle of tasksCreated.slice(0, 3)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('tasks') as any).insert({
          user_id: user.id,
          goal_id: goal.id,
          title: tTitle,
          priority: 2,
          category: 'todo',
          status: 'todo'
        })
      }

      toast.success('3 AI Roadmap tasks created under Tasks!')
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
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Goals & Vision</h1>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }}>
            <Plus size={15} /> Add Goal
          </button>
        </div>
      }
    >
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* AI Custom Prompt Bar */}
        <form onSubmit={handleAIGoalGenerate} className="card" style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface)' }}>
          <Sparkles size={18} color="#06B6D4" style={{ flexShrink: 0 }} />
          <input
            className="glow-input"
            placeholder="Tell AI to generate goals (e.g., 'Create a quarterly goal to launch product v1')..."
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', padding: 0, fontSize: 13 }}
          />
          <button
            type="submit"
            disabled={aiGenerating}
            className="btn btn-primary"
            style={{ height: 34, padding: '0 12px', fontSize: 12, flexShrink: 0 }}
          >
            {aiGenerating ? <Loader2 size={13} className="animate-spin" /> : <><Send size={13} /> AI Generate</>}
          </button>
        </form>

        {/* Life Area Filters */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          <button
            onClick={() => setSelectedArea(null)}
            style={{
              padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
              background: !selectedArea ? '#10B981' : 'var(--surface-2)',
              color: !selectedArea ? '#FFFFFF' : 'var(--text-secondary)',
            }}
          >
            All Areas
          </button>
          {areas.map(area => (
            <button
              key={area.id}
              onClick={() => setSelectedArea(a => a === area.name ? null : area.name)}
              style={{
                padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                background: selectedArea === area.name ? '#06B6D4' : 'var(--surface-2)',
                color: selectedArea === area.name ? '#FFFFFF' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <Compass size={13} color={selectedArea === area.name ? '#FFFFFF' : '#06B6D4'} /> {area.name}
            </button>
          ))}
        </div>

        <div>
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-card)', marginBottom: 10 }} />)
          ) : Object.entries(filtered).map(([areaName, areaGoals]) => {
            const area = areas.find(a => a.name === areaName)
            return (
              <div key={areaName} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Compass size={16} color="#10B981" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{areaName}</span>
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
                        borderLeft: `3px solid ${goal.status === 'completed' ? '#10B981' : '#06B6D4'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <button
                          onClick={() => toggleGoalStatus(goal)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}
                        >
                          {goal.status === 'completed'
                            ? <CheckCircle2 size={20} color="#10B981" />
                            : <Circle size={20} color="var(--text-muted)" strokeWidth={1.5} />
                          }
                        </button>
                        <div style={{ flex: 1 }}>
                          <p style={{
                            fontSize: 14, fontWeight: 600, margin: 0,
                            textDecoration: goal.status === 'completed' ? 'line-through' : 'none',
                            color: 'var(--text-primary)',
                          }}>
                            {stripMarkdown(goal.title)}
                          </p>
                          {goal.description && (
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>{stripMarkdown(goal.description)}</p>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 8px',
                                borderRadius: 99, background: (STATUS_COLORS[goal.status] || '#10B981') + '20',
                                color: STATUS_COLORS[goal.status] || '#10B981', textTransform: 'uppercase'
                              }}>
                                {goal.status.replace('_', ' ')}
                              </span>
                              {goal.target_date && (
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  Target: {new Date(goal.target_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              {goal.status !== 'completed' && (
                                <button
                                  onClick={() => generateGoalRoadmap(goal)}
                                  disabled={generatingRoadmapId === goal.id}
                                  className="btn btn-secondary"
                                  style={{ fontSize: 11, padding: '4px 10px', height: 28, borderColor: '#06B6D4', color: '#06B6D4' }}
                                >
                                  {generatingRoadmapId === goal.id ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                                  AI Roadmap
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  await (supabase.from('goals') as any).delete().eq('id', goal.id)
                                  setGoals(prev => prev.filter(g => g.id !== goal.id))
                                  toast.success('Goal deleted')
                                }}
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', borderRadius: 'var(--radius-btn)', padding: '4px 8px', fontSize: 11, cursor: 'pointer', height: 28 }}
                                title="Delete Goal"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
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
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Target size={28} color="#10B981" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>No goals defined yet</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
                Create goals for each life area to direct your focus and track outcomes.
              </p>
              <button onClick={() => setShowAdd(true)} className="btn btn-primary">
                <Plus size={15} /> Add First Goal
              </button>
            </div>
          )}
        </div>

        {/* Add Goal Modal */}
        {showAdd && (
          <>
            <div className="overlay" onClick={() => setShowAdd(false)} />
            <div className="animate-fade-in" style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card) var(--radius-card) 0 0',
              padding: '24px 20px', zIndex: 110,
              paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
              maxWidth: 768, margin: '0 auto',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>New Goal</h3>
                <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} color="var(--text-secondary)" />
                </button>
              </div>
              <form onSubmit={addGoal} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input className="glow-input" placeholder="Goal title..." value={title} onChange={e => setTitle(e.target.value)} required style={{ fontSize: 15 }} />
                <textarea className="glow-input" placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} rows={2} style={{ resize: 'none' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>LIFE AREA</label>
                    <select value={areaId} onChange={e => setAreaId(e.target.value)}>
                      <option value="">General</option>
                      {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>TARGET DATE *</label>
                    <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} required />
                  </div>
                </div>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ height: 44, marginTop: 8 }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <><Target size={16} /> Add Goal</>}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
