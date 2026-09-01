'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import FormattedAIResponse from '@/components/common/FormattedAIResponse'
import {
  BookOpen, Sparkles, Plus, Trash2, Calendar, Search, RefreshCw,
  Zap, Smile, Meh, Frown, Heart, Check, Wand2, ShieldCheck
} from 'lucide-react'
import { toast } from 'sonner'
import type { JournalEntry } from '@/lib/supabase/database.types'

type EntryType = 'free' | 'prompted' | 'voice'

const MOOD_OPTIONS = [
  { id: 'amazing', icon: Zap, color: '#FFD700', label: '😁 Amazing' },
  { id: 'good', icon: Smile, color: '#10B981', label: '😊 Good' },
  { id: 'meh', icon: Meh, color: '#F59E0B', label: '😐 Meh' },
  { id: 'bad', icon: Frown, color: '#60A5FA', label: '😔 Bad' },
  { id: 'awful', icon: Heart, color: '#EF4444', label: '😫 Overwhelmed' },
]

const PROMPTS = [
  'What are 3 meaningful things I accomplished or learned today?',
  'What is a challenge I faced today, and how did I adapt?',
  'What am I deeply grateful for in this exact moment?',
  'What is one limiting belief I want to let go of today?',
  'What would make tomorrow a high-performance win?',
]

interface AIReframeSuggestions {
  growth: string
  mindful: string
  bullet: string
}

/**
 * Bulletproof helper to guarantee React never receives an object as a child node
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatValueAsString(val: any): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (Array.isArray(val)) return val.map(item => formatValueAsString(item)).join('\n')
  if (typeof val === 'object') {
    return val.entry || val.text || val.content || val.description || val.title || JSON.stringify(val, null, 2)
  }
  return String(val)
}

export default function JournalPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  // Form State
  const [entryType, setEntryType] = useState<EntryType>('free')
  const [title, setTitle] = useState('')
  const [rawThoughts, setRawThoughts] = useState('')
  const [content, setContent] = useState('')
  const [selectedMood, setSelectedMood] = useState('good')
  const [energyLevel, setEnergyLevel] = useState(80)
  const [saving, setSaving] = useState(false)

  // AI Rephrase & Enhancer State
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false)
  const [reframeSuggestions, setReframeSuggestions] = useState<AIReframeSuggestions | null>(null)

  const fetchEntries = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    try {
      const { data } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)
      setEntries(data ?? [])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  // Generate 3 AI Reframe & Enhancement Suggestions
  async function generateAIReframeSuggestions() {
    const textToProcess = rawThoughts.trim() || content.trim()
    if (!textToProcess) {
      toast.error('Please enter your raw thoughts or notes first!')
      return
    }
    if (!user) return

    setGeneratingSuggestions(true)
    toast.info('AI is generating 3 rephrased & enhanced journal options...')

    try {
      const customGrokKey = typeof window !== 'undefined' ? localStorage.getItem('nirmaan_grok_key') : null
      const prompt = `Rephrase the following raw journal thoughts into 3 distinct, clean text entries.
Raw Thoughts: "${textToProcess}"

Respond strictly in valid JSON format with keys:
"growth": (String: High-performance, stoic reframe focused on mindset and learning),
"mindful": (String: Deep emotional reframe focused on self-compassion and gratitude),
"bullet": (String: Bullet-journal executive summary with key takeaways)`

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          model: 'x-ai/grok-2-1212',
          enableTools: false,
          grokApiKey: customGrokKey,
        }),
      })

      if (res.ok) {
        const text = await res.text()
        const lines = text.split('\n').filter(l => l.startsWith('data: ')).map(l => l.replace('data: ', ''))
        let fullOutput = ''
        for (const line of lines) {
          if (line === '[DONE]') continue
          try {
            const parsed = JSON.parse(line)
            fullOutput += parsed.choices?.[0]?.delta?.content || ''
          } catch {}
        }

        try {
          const jsonMatch = fullOutput.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsedObj = JSON.parse(jsonMatch[0])
            setReframeSuggestions({
              growth: formatValueAsString(parsedObj.growth) || fullOutput,
              mindful: formatValueAsString(parsedObj.mindful) || fullOutput,
              bullet: formatValueAsString(parsedObj.bullet) || fullOutput,
            })
            toast.success('3 AI Rephrase options generated! Select your favorite below 🌟')
          } else {
            setReframeSuggestions({
              growth: fullOutput,
              mindful: fullOutput,
              bullet: fullOutput,
            })
          }
        } catch {
          setReframeSuggestions({
            growth: fullOutput,
            mindful: fullOutput,
            bullet: fullOutput,
          })
        }
      }
    } catch {
      toast.error('Failed to generate AI suggestions')
    } finally {
      setGeneratingSuggestions(false)
    }
  }

  // Select AI Suggestion into Main Content Editor
  function applySuggestion(rawVal: unknown) {
    const safeStr = formatValueAsString(rawVal)
    setContent(safeStr)
    toast.success('Applied AI suggestion to main journal entry! ✍️')
  }

  // Save Journal Entry
  async function handleSaveEntry(e: React.FormEvent) {
    e.preventDefault()
    const finalContent = content.trim() || rawThoughts.trim()
    if (!finalContent || !user) {
      toast.error('Please enter content before saving')
      return
    }
    setSaving(true)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('journal_entries') as any).insert({
        user_id: user.id,
        title: title.trim() || null,
        content: finalContent,
        mood: selectedMood,
        mood_score: energyLevel,
        entry_type: entryType,
      }).select().single()

      if (error) {
        toast.error('Failed to save journal entry')
        setSaving(false)
        return
      }

      toast.success('Journal Entry Saved! +25 XP 📖')
      setEntries(prev => [data, ...prev])
      setShowForm(false)
      setTitle('')
      setRawThoughts('')
      setContent('')
      setReframeSuggestions(null)

      // Auto-generate AI Reflection for newly saved entry
      generateAIReflection(data.id, finalContent)
    } catch {
      toast.error('Error saving entry')
    } finally {
      setSaving(false)
    }
  }

  // Generate AI Reflection on Entry
  async function generateAIReflection(entryId: string, entryText: string) {
    if (!user) return

    try {
      const customGrokKey = typeof window !== 'undefined' ? localStorage.getItem('nirmaan_grok_key') : null
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Give a short 2-sentence psychological reflection and encouragement for this journal entry: "${entryText}"`,
            },
          ],
          model: 'x-ai/grok-2-1212',
          enableTools: false,
          grokApiKey: customGrokKey,
        }),
      })

      if (res.ok) {
        const text = await res.text()
        const lines = text.split('\n').filter(l => l.startsWith('data: ')).map(l => l.replace('data: ', ''))
        let fullOutput = ''
        for (const line of lines) {
          if (line === '[DONE]') continue
          try {
            const parsed = JSON.parse(line)
            fullOutput += parsed.choices?.[0]?.delta?.content || ''
          } catch {}
        }

        if (fullOutput.trim()) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('journal_entries') as any)
            .update({ ai_reflection: fullOutput.trim() })
            .eq('id', entryId)

          setEntries(prev => prev.map(e => e.id === entryId ? { ...e, ai_reflection: fullOutput.trim() } : e))
          toast.success('AI Psychological Reflection attached to journal!')
        }
      }
    } catch {}
  }

  async function handleDeleteEntry(entryId: string) {
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('journal_entries') as any).delete().eq('id', entryId).eq('user_id', user.id)
    setEntries(prev => prev.filter(e => e.id !== entryId))
    toast.success('Journal entry deleted')
  }

  const filteredEntries = entries.filter(e =>
    formatValueAsString(e.title).toLowerCase().includes(search.toLowerCase()) ||
    formatValueAsString(e.content).toLowerCase().includes(search.toLowerCase()) ||
    formatValueAsString(e.mood).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            }}>
              <BookOpen size={20} color="#FFFFFF" />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 6 }}>
                AI Reflection Journal <ShieldCheck size={16} color="#10B981" />
              </h1>
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>Minimal, Aesthetic Book Journal with AI Smart Rephraser</p>
            </div>
          </div>

          <button
            onClick={() => setShowForm(prev => !prev)}
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: 13, background: 'linear-gradient(135deg, #10B981, #059669)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} /> {showForm ? 'Close Editor' : 'New Journal Entry'}
          </button>
        </div>
      }
    >
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Minimal AI Rephrase & Journal Editor Form */}
        {(showForm || entries.length === 0) && (
          <div style={{
            background: 'linear-gradient(135deg, #0A0B0D 0%, #121318 100%)',
            border: '1px solid #10B981',
            borderRadius: 24,
            padding: 24,
            boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wand2 size={20} color="#10B981" /> Write Journal Entry with AI Reframe
              </h2>
              {entries.length > 0 && (
                <button onClick={() => setShowForm(false)} className="btn-ghost btn-icon">
                  ✕
                </button>
              )}
            </div>

            <form onSubmit={handleSaveEntry} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Title & Prompt Picker */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: '#10B981', marginBottom: 4, display: 'block' }}>TITLE (OPTIONAL)</label>
                  <input
                    type="text"
                    placeholder="e.g. Evening Reflection & Wins..."
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    style={{ width: '100%', height: 42, background: '#121318', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 12, color: '#FFFFFF', fontSize: 13, padding: '0 14px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: '#10B981', marginBottom: 4, display: 'block' }}>DAILY REFLECTION PROMPT</label>
                  <select
                    onChange={e => {
                      if (e.target.value) {
                        setTitle(e.target.value)
                        setEntryType('prompted')
                      }
                    }}
                    style={{ width: '100%', height: 42, background: '#121318', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 12, color: '#FFFFFF', fontSize: 12, padding: '0 10px', outline: 'none' }}
                  >
                    <option value="">Choose a Reflection Prompt...</option>
                    {PROMPTS.map((p, idx) => (
                      <option key={idx} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mood & Energy Bar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, background: '#121318', padding: 14, borderRadius: 14, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: '#9CA3AF', marginBottom: 6, display: 'block' }}>HOW ARE YOU FEELING?</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {MOOD_OPTIONS.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMood(m.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 10,
                          border: `1px solid ${selectedMood === m.id ? m.color : 'rgba(255,255,255,0.1)'}`,
                          background: selectedMood === m.id ? `${m.color}25` : '#0A0B0D',
                          color: selectedMood === m.id ? m.color : '#FFFFFF',
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ width: 180 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: '#9CA3AF', marginBottom: 6, display: 'block' }}>ENERGY METER: {energyLevel}%</label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={energyLevel}
                    onChange={e => setEnergyLevel(Number(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer', accentColor: '#10B981' }}
                  />
                </div>
              </div>

              {/* Raw Thoughts Input */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: '#FFD700' }}>
                    WRITE RAW THOUGHTS & GENERATE AI REFRAME:
                  </label>
                  <button
                    type="button"
                    onClick={generateAIReframeSuggestions}
                    disabled={generatingSuggestions}
                    className="btn btn-secondary"
                    style={{ padding: '6px 14px', fontSize: 12, color: '#FFD700', border: '1px solid rgba(255, 215, 0, 0.4)' }}
                  >
                    {generatingSuggestions ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} color="#FFD700" />}
                    <span>{generatingSuggestions ? 'Rephrasing...' : 'Generate 3 AI Reframes'}</span>
                  </button>
                </div>

                <textarea
                  placeholder="Type your unorganized thoughts, what happened today, feelings, or quick notes... (e.g. Had a chaotic day at work, got overwhelmed by meetings but finished the core module)"
                  value={rawThoughts}
                  onChange={e => setRawThoughts(e.target.value)}
                  rows={3}
                  style={{ width: '100%', background: '#121318', border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: 12, color: '#FFFFFF', padding: 12, fontSize: 13, resize: 'none', outline: 'none' }}
                />
              </div>

              {/* AI 3-Reframe Suggestions Display Cards */}
              {reframeSuggestions && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#0A0B0D', padding: 16, borderRadius: 16, border: '1px solid #FFD700' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#FFD700', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={16} color="#FFD700" /> SELECT YOUR FAVORITE AI REPHRASED VERSION:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                    {/* Option 1: High-Performance Reframe */}
                    <div style={{ background: '#121318', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 11.5, fontWeight: 800, color: '#10B981', marginBottom: 6 }}>🌟 STOIC GROWTH REFRAME</div>
                        <div style={{ fontSize: 12.5, color: '#FFFFFF', lineHeight: 1.5 }}>
                          {formatValueAsString(reframeSuggestions.growth)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => applySuggestion(reframeSuggestions.growth)}
                        className="btn btn-secondary"
                        style={{ marginTop: 12, fontSize: 11.5, padding: '6px 10px', alignSelf: 'flex-start' }}
                      >
                        <Check size={14} color="#10B981" /> Use This Version
                      </button>
                    </div>

                    {/* Option 2: Deep Mindful Reframe */}
                    <div style={{ background: '#121318', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 11.5, fontWeight: 800, color: '#3B82F6', marginBottom: 6 }}>🧘 MINDFUL GRATITUDE REFLECTION</div>
                        <div style={{ fontSize: 12.5, color: '#FFFFFF', lineHeight: 1.5 }}>
                          {formatValueAsString(reframeSuggestions.mindful)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => applySuggestion(reframeSuggestions.mindful)}
                        className="btn btn-secondary"
                        style={{ marginTop: 12, fontSize: 11.5, padding: '6px 10px', alignSelf: 'flex-start' }}
                      >
                        <Check size={14} color="#3B82F6" /> Use This Version
                      </button>
                    </div>

                    {/* Option 3: Bullet Journal Summary */}
                    <div style={{ background: '#121318', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 11.5, fontWeight: 800, color: '#F59E0B', marginBottom: 6 }}>⚡ BULLET JOURNAL SUMMARY</div>
                        <div style={{ fontSize: 12.5, color: '#FFFFFF', lineHeight: 1.5 }}>
                          {formatValueAsString(reframeSuggestions.bullet)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => applySuggestion(reframeSuggestions.bullet)}
                        className="btn btn-secondary"
                        style={{ marginTop: 12, fontSize: 11.5, padding: '6px 10px', alignSelf: 'flex-start' }}
                      >
                        <Check size={14} color="#F59E0B" /> Use This Version
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Journal Entry Editor */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#10B981', marginBottom: 6, display: 'block' }}>
                  FINAL JOURNAL ENTRY TO SAVE:
                </label>
                <textarea
                  placeholder="Your complete journal entry text (edit or paste an AI version above)..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={4}
                  required
                  style={{ width: '100%', background: '#121318', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: 12, color: '#FFFFFF', padding: 14, fontSize: 13.5, resize: 'vertical', outline: 'none' }}
                />
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{ height: 46, fontSize: 14, background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {saving ? <RefreshCw size={18} className="animate-spin" /> : <BookOpen size={18} />}
                <span>{saving ? 'Saving Journal...' : 'Save Complete Journal Entry (+25 XP)'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Journal Timeline Search Bar */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <Search size={16} color="#10B981" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              placeholder="Search past journal reflections, moods, or tags..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', height: 42, paddingLeft: 42, paddingRight: 14, background: '#121318', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 12, color: '#FFFFFF', fontSize: 13, outline: 'none' }}
            />
          </div>

          <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 700 }}>
            Saved Logs: <span style={{ color: '#10B981' }}>{entries.length}</span>
          </div>
        </div>

        {/* Minimal Book-Like Journal Timeline Cards */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
            <RefreshCw size={32} color="#10B981" className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>Loading your journal entries...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#0A0B0D', borderRadius: 20, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            <BookOpen size={40} color="#10B981" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px' }}>No journal entries found</h3>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Click "New Journal Entry" above to write your first reflection.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredEntries.map(entry => (
              <div
                key={entry.id}
                style={{
                  background: '#0A0B0D',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 20,
                  padding: 20,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {/* Entry Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="badge badge-success" style={{ fontSize: 12, fontWeight: 800 }}>
                      Mood: {formatValueAsString(entry.mood) || 'good'}
                    </span>
                    <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={13} color="#10B981" /> {new Date(entry.created_at).toLocaleDateString()} at {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}
                    title="Delete Entry"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Entry Title & Body */}
                {entry.title && (
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    {formatValueAsString(entry.title)}
                  </h3>
                )}

                <div style={{ fontSize: 13.5, color: '#FFFFFF', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {formatValueAsString(entry.content)}
                </div>

                {/* AI Reflection Insights Box */}
                {entry.ai_reflection && (
                  <div style={{ background: '#121318', border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Sparkles size={18} color="#FFD700" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#FFD700', marginBottom: 2 }}>AI PSYCHOLOGICAL REFLECTION</div>
                      <div style={{ fontSize: 12.5, color: '#E5E7EB', lineHeight: 1.5 }}>
                        <FormattedAIResponse content={formatValueAsString(entry.ai_reflection)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </AppShell>
  )
}
