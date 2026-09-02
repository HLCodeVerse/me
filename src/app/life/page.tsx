'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import ProgressRing from '@/components/helpo/ProgressRing'
import { AIInsightCard } from '@/components/helpo/AIComponents'
import EmptyState from '@/components/helpo/EmptyState'
import {
  Layers, Plus, TrendingUp, Target, Sparkles, ChevronRight,
  Briefcase, BookOpen, Heart, DollarSign, Users, Star, Brain,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { LifeArea, Goal } from '@/lib/supabase/database.types'

const DEFAULT_LIFE_AREAS = [
  { name: 'Career',           icon: '💼', color: '#3B82F6',  defaultIcon: Briefcase },
  { name: 'Learning',         icon: '📚', color: '#22D3EE',  defaultIcon: BookOpen },
  { name: 'Health',           icon: '❤️', color: '#FF4F81',  defaultIcon: Heart },
  { name: 'Finance',          icon: '💰', color: '#10B981',  defaultIcon: DollarSign },
  { name: 'Relationships',    icon: '👥', color: '#FF8A3D',  defaultIcon: Users },
  { name: 'Personal Growth',  icon: '⭐', color: '#7C3AED',  defaultIcon: Star },
  { name: 'Mind & Spirit',    icon: '🧠', color: '#FBBF24',  defaultIcon: Brain },
]

export default function LifePage() {
  const { user } = useAuth()
  const supabase = createClient()
  const router = useRouter()

  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('⭐')
  const [newColor, setNewColor] = useState('#7C3AED')
  const [newTarget, setNewTarget] = useState(80)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    if (!user) { setLoading(false); return }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any
      const [areasRes, goalsRes] = await Promise.all([
        client.from('life_areas').select('*').eq('user_id', user.id),
        client.from('goals').select('*').eq('user_id', user.id).eq('status', 'active'),
      ])
      setLifeAreas(areasRes.data ?? [])
      setGoals(goalsRes.data ?? [])
    } catch {
      toast.error('Failed to load life areas')
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => { if (user) loadData() }, [user, loadData])

  async function handleCreateArea(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !user) return
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('life_areas') as any).insert({
        user_id: user.id,
        name: newName.trim(),
        icon: newIcon,
        color: newColor,
        target_score: newTarget,
        current_score: 0,
      }).select().single()
      if (!error && data) {
        setLifeAreas(prev => [...prev, data])
        toast.success('Life area created!')
        setNewName(''); setShowAdd(false)
      }
    } catch {
      toast.error('Failed to create life area')
    } finally {
      setSaving(false)
    }
  }

  async function handleSeedDefaults() {
    if (!user) return
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any
      for (const area of DEFAULT_LIFE_AREAS) {
        await client.from('life_areas').insert({
          user_id: user.id,
          name: area.name,
          icon: area.icon,
          color: area.color,
          target_score: 80,
          current_score: Math.floor(Math.random() * 40) + 40,
        })
      }
      toast.success('Default life areas created!')
      loadData()
    } catch {
      toast.error('Failed to seed defaults')
    } finally {
      setSaving(false)
    }
  }

  const overallScore = lifeAreas.length > 0
    ? Math.round(lifeAreas.reduce((sum, a) => sum + ((a as { current_score?: number }).current_score ?? 0), 0) / lifeAreas.length)
    : 0

  return (
    <AppShell>
      <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={22} color="#10B981" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF', margin: 0 }}>Life Areas</h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Your strategic life overview</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {lifeAreas.length === 0 && (
              <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={handleSeedDefaults}>
                ✨ Seed Defaults
              </button>
            )}
            <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => setShowAdd(true)}>
              <Plus size={15} /> Add Area
            </button>
          </div>
        </div>

        {/* Overall Life Score */}
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <ProgressRing size={90} strokeWidth={8} progress={overallScore} color="#7C3AED">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF' }}>{overallScore}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>/100</div>
            </div>
          </ProgressRing>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Overall Life Score</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#FFFFFF', marginBottom: 4 }}>{overallScore}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/100</span></div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {overallScore >= 75 ? (
                <span className="badge badge-emerald">🏆 Excellent Balance</span>
              ) : overallScore >= 50 ? (
                <span className="badge badge-yellow">📈 Good Progress</span>
              ) : (
                <span className="badge badge-orange">⚡ Needs Attention</span>
              )}
              <span className="badge badge-muted">{lifeAreas.length} Areas Tracked</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-ai" style={{ fontSize: 12, padding: '8px 14px' }} onClick={() => router.push('/ai?q=Analyze+my+life+balance')}>
              <Sparkles size={13} /> Analyze Balance
            </button>
            <button className="btn btn-secondary" style={{ fontSize: 12, padding: '8px 14px' }}>
              <TrendingUp size={13} /> View Insights
            </button>
          </div>
        </div>

        {/* Life Areas Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 20 }} />)}
          </div>
        ) : lifeAreas.length === 0 ? (
          <EmptyState
            icon={<Layers size={28} color="#10B981" />}
            title="No life areas yet"
            description="Create life areas to track your balance across career, health, relationships, and more."
            action={{ label: 'Create First Area', onClick: () => setShowAdd(true) }}
            aiAction={{ label: 'Seed Default Areas', onClick: handleSeedDefaults }}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {lifeAreas.map(area => {
              const score = (area as { current_score?: number }).current_score ?? 0
              const target = area.target_score ?? 80
              const relatedGoals = goals.filter(g => g.life_area_id === area.id)
              return (
                <div
                  key={area.id}
                  className="card-hover"
                  style={{ padding: '18px', borderLeft: `3px solid ${area.color}`, cursor: 'pointer' }}
                  onClick={() => router.push('/goals?area=' + area.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: `${area.color}1A`,
                        border: `1px solid ${area.color}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18,
                      }}>
                        {area.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF' }}>{area.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Target: {target}</div>
                      </div>
                    </div>
                    <ChevronRight size={14} color="var(--text-dim)" />
                  </div>

                  {/* Score ring + bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <ProgressRing size={48} strokeWidth={4} progress={score} color={area.color}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: area.color }}>{score}</span>
                    </ProgressRing>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Score</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: area.color }}>{score}/{target}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-bar-fill" style={{ width: `${Math.min(100, (score / target) * 100)}%`, background: `linear-gradient(90deg, ${area.color}80, ${area.color})` }} />
                      </div>
                    </div>
                  </div>

                  {/* Related goals count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Target size={12} color="var(--text-dim)" />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {relatedGoals.length} active goal{relatedGoals.length !== 1 ? 's' : ''}
                    </span>
                    {score < target && (
                      <span className="badge badge-orange" style={{ fontSize: 10, marginLeft: 'auto' }}>Needs work</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* AI Insight */}
        <AIInsightCard
          title="Life Balance Analysis"
          content={lifeAreas.length > 0
            ? `You're tracking ${lifeAreas.length} life areas with an overall score of ${overallScore}/100. ${overallScore < 60 ? 'Several areas need attention. Would you like me to create an improvement plan?' : 'You\'re doing well! Let\'s optimize your weakest area.'}`
            : 'Add life areas to get personalized insights about your life balance and areas that need attention.'
          }
          onAction={() => router.push('/ai?q=Which+life+area+needs+my+attention+most')}
          actionLabel="Get AI recommendations"
        />

        {/* Add Modal */}
        {showAdd && (
          <>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,8,22,0.85)', backdropFilter: 'blur(8px)', zIndex: 100 }} onClick={() => setShowAdd(false)} />
            <div className="animate-fade-in" style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 110,
              background: 'linear-gradient(180deg, #0B1430, #081126)',
              border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: '24px 24px 0 0',
              padding: '24px 20px', maxHeight: '85vh', overflowY: 'auto',
              paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', marginBottom: 20 }}>New Life Area</h3>
              <form onSubmit={handleCreateArea} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 6 }}>NAME</label>
                  <input placeholder="e.g. Health & Fitness" value={newName} onChange={e => setNewName(e.target.value)} required autoFocus />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 6 }}>ICON</label>
                    <input value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="⭐" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 6 }}>COLOR</label>
                    <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ height: 40, cursor: 'pointer', padding: 4 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 6 }}>TARGET</label>
                    <input type="number" min={1} max={100} value={newTarget} onChange={e => setNewTarget(Number(e.target.value))} />
                  </div>
                </div>
                <button type="submit" disabled={saving || !newName.trim()} className="btn btn-primary" style={{ height: 44 }}>
                  {saving ? '...' : <><Plus size={16} /> Create Area</>}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
