'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import {
  Plus, Mic, Sparkles, ChevronRight, X, Loader2,
  BookOpen, Smile, Meh, Frown, Zap, Heart, Brain, Search, Sparkle
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import type { JournalEntry } from '@/lib/supabase/database.types'

type EntryType = 'free' | 'prompted' | 'voice'

const MOODS = [
  { id: 'amazing', icon: Zap,   color: '#F59E0B', label: 'Amazing 🔥' },
  { id: 'good',    icon: Smile, color: '#10B981', label: 'Good 😊'    },
  { id: 'meh',     icon: Meh,   color: '#06B6D4', label: 'Meh 😐'     },
  { id: 'bad',     icon: Frown, color: '#60A5FA', label: 'Bad 😔'     },
  { id: 'awful',   icon: Heart, color: '#EF4444', label: 'Awful 😫'   },
]

const PROMPTS = [
  'What are 3 things I learned today?',
  'What am I grateful for right now?',
  'What progress did I make on my goals?',
  'What challenge did I overcome today?',
  'What would make tomorrow even better?',
]

export default function JournalPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [generatingReflection, setGeneratingReflection] = useState(false)
  const [search, setSearch] = useState('')

  // Form state
  const [entryType, setEntryType] = useState<EntryType>('free')
  const [content, setContent] = useState('')
  const [selectedMood, setSelectedMood] = useState('good')
  const [selectedPrompt, setSelectedPrompt] = useState('')
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [recording, setRecording] = useState(false)

  const fetchEntries = useCallback(async () => {
    try {
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(40)
      setEntries(data ?? [])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  async function saveEntry() {
    if (!content.trim() || !user) return
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('journal_entries') as any).insert({
        user_id: user.id,
        title: title.trim() || selectedPrompt || null,
        content: content.trim(),
        mood: selectedMood || null,
        mood_score: getMoodScore(selectedMood),
        entry_type: entryType,
        tags: [],
      }).select().single()
      if (error) { toast.error('Failed to save journal entry'); setSaving(false); return }
      toast.success('Journal entry saved! 📓')
      setEntries(prev => [data, ...prev])
      setShowForm(false)
      setContent(''); setTitle(''); setSelectedMood('good'); setSelectedPrompt('')
    } catch {
      toast.error('Could not save entry')
    } finally {
      setSaving(false)
    }
  }

  async function generateAIReflection(entry: JournalEntry) {
    if (!user) return
    setGeneratingReflection(true)
    toast.info('AI Mindset Coach is analyzing your entry...')
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Read this journal entry and provide a 2-sentence empowering AI reflection:\n"${entry.content}"`
          }],
          enableTools: false
        })
      })

      if (!res.ok) throw new Error('AI reflection failed')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let reflectionText = ''

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
              if (delta) reflectionText += delta
            } catch {}
          }
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('journal_entries') as any)
        .update({ ai_reflection: reflectionText })
        .eq('id', entry.id)

      setSelectedEntry(prev => prev ? { ...prev, ai_reflection: reflectionText } : null)
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, ai_reflection: reflectionText } : e))
      toast.success('AI reflection saved!')
    } catch {
      toast.error('Failed to generate AI reflection')
    } finally {
      setGeneratingReflection(false)
    }
  }

  function getMoodScore(mood: string) {
    const map: Record<string, number> = { amazing: 100, good: 75, meh: 50, bad: 25, awful: 0 }
    return map[mood] ?? 50
  }

  function startVoice() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice input not supported')
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SR as any)()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    setRecording(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results as ArrayLike<Record<number, { transcript: string }>>).map(r => r[0].transcript).join('')
      setContent(transcript)
    }
    recognition.onend = () => setRecording(false)
    recognition.start()
    setTimeout(() => { recognition.stop() }, 60000)
  }

  const filteredEntries = entries.filter(e =>
    (e.title?.toLowerCase() || '').includes(search.toLowerCase()) ||
    e.content.toLowerCase().includes(search.toLowerCase())
  )

  const grouped: Record<string, JournalEntry[]> = {}
  for (const e of filteredEntries) {
    const date = formatDate(e.created_at, 'long')
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(e)
  }

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={20} color="#A78BFA" />
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Mindful Journal</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>
            <Plus size={15} /> Write
          </button>
        </div>
      }
    >
      <div style={{ paddingTop: 16 }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={15} color="var(--text-dim)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            placeholder="Search entries..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>

        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius)', marginBottom: 10 }} />)
        ) : filteredEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <BookOpen size={28} color="#A78BFA" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Your story begins here</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, maxWidth: 280, margin: '0 auto 24px' }}>
              Capture your daily thoughts, track your mood, and receive AI mindset reflections.
            </p>
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus size={16} /> Write First Entry
            </button>
          </div>
        ) : (
          Object.entries(grouped).map(([date, dayEntries]) => (
            <div key={date} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 }}>
                {date}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dayEntries.map(entry => {
                  const moodObj = MOODS.find(m => m.id === entry.mood)
                  const MoodIcon = moodObj ? moodObj.icon : BookOpen
                  const moodColor = moodObj ? moodObj.color : '#A78BFA'

                  return (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'left',
                        width: '100%', transition: 'all 200ms ease',
                      }}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: 'var(--radius-sm)',
                        background: `${moodColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <MoodIcon size={18} color={moodColor} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {entry.title || entry.content.slice(0, 50)}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                          {new Date(entry.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {entry.ai_reflection && <Sparkle size={15} color="#A78BFA" />}
                      <ChevronRight size={14} color="var(--text-dim)" />
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Write Entry Modal */}
      {showForm && (
        <>
          <div className="overlay" onClick={() => setShowForm(false)} />
          <div className="animate-scale-in" style={{
            position: 'fixed', inset: 0, zIndex: 110,
            background: 'var(--bg)', display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['free', 'prompted', 'voice'] as EntryType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setEntryType(t)}
                    style={{
                      padding: '5px 12px', borderRadius: 99, border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 700, textTransform: 'capitalize',
                      background: entryType === t ? '#A78BFA' : 'var(--surface-2)',
                      color: entryType === t ? '#0A0B0D' : 'var(--text-muted)',
                      transition: 'all 200ms ease',
                    }}
                  >
                    {t === 'voice' ? 'Voice' : t === 'prompted' ? 'Prompted' : 'Free Form'}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, marginBottom: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Current Mood</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {MOODS.map(m => {
                    const MIcon = m.icon
                    const isSel = selectedMood === m.id
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMood(m.id)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          padding: '10px 8px', borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${isSel ? m.color : 'var(--border)'}`,
                          background: isSel ? `${m.color}15` : 'var(--surface)',
                          cursor: 'pointer', flex: 1,
                        }}
                      >
                        <MIcon size={20} color={isSel ? m.color : 'var(--text-dim)'} />
                        <span style={{ fontSize: 10, color: isSel ? m.color : 'var(--text-dim)', fontWeight: 700 }}>{m.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <input
                placeholder="Entry title (optional)..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ marginBottom: 12, fontSize: 16, fontWeight: 700 }}
              />

              {entryType === 'prompted' && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 8 }}>Pick a reflection prompt:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {PROMPTS.map(p => (
                      <button
                        key={p}
                        onClick={() => setSelectedPrompt(p)}
                        style={{
                          padding: '10px 14px', borderRadius: 'var(--radius-sm)', textAlign: 'left',
                          border: `1px solid ${selectedPrompt === p ? '#A78BFA' : 'var(--border)'}`,
                          background: selectedPrompt === p ? 'rgba(167,139,250,0.1)' : 'var(--surface)',
                          color: selectedPrompt === p ? '#A78BFA' : 'var(--text-muted)',
                          fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {entryType === 'voice' && (
                <div style={{ marginBottom: 12 }}>
                  <button
                    onClick={startVoice}
                    disabled={recording}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px',
                      background: recording ? 'rgba(239,68,68,0.1)' : 'var(--surface-2)',
                      border: `1px solid ${recording ? 'var(--danger)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)', cursor: 'pointer', width: '100%',
                      justifyContent: 'center',
                    }}
                  >
                    <Mic size={18} color={recording ? 'var(--danger)' : 'var(--text-muted)'} />
                    <span style={{ fontSize: 14, color: recording ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {recording ? 'Recording... Speak now 🎙️' : 'Tap to start voice dictation'}
                    </span>
                  </button>
                </div>
              )}

              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={selectedPrompt ? `Respond to: "${selectedPrompt}"` : 'Write freely about your day, thoughts, or ideas...'}
                style={{
                  width: '100%', minHeight: 220, resize: 'none',
                  fontSize: 15, lineHeight: 1.7, background: 'transparent',
                  border: 'none', outline: 'none', color: 'var(--text)', padding: 0,
                }}
              />
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, color: 'var(--text-dim)', fontSize: 13, display: 'flex', alignItems: 'center' }}>
                {content.split(' ').filter(Boolean).length} words
              </div>
              <button onClick={saveEntry} disabled={saving || !content.trim()} className="btn btn-primary" style={{ height: 44, padding: '0 24px' }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Entry'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Read Entry Modal */}
      {selectedEntry && (
        <>
          <div className="overlay" onClick={() => setSelectedEntry(null)} />
          <div className="animate-scale-in" style={{
            position: 'fixed', inset: 0, zIndex: 110,
            background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800 }}>{selectedEntry.title || 'Journal Entry'}</p>
                <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>{formatDate(selectedEntry.created_at, 'long')}</p>
              </div>
              <button onClick={() => setSelectedEntry(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                {selectedEntry.content}
              </p>

              {selectedEntry.ai_reflection ? (
                <div style={{
                  marginTop: 24, padding: '16px', borderRadius: 'var(--radius)',
                  background: 'linear-gradient(135deg, rgba(167,139,250,0.1), rgba(52,211,153,0.05))',
                  border: '1px solid rgba(167,139,250,0.25)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Brain size={16} color="#A78BFA" />
                    <span style={{ fontSize: 11, color: '#A78BFA', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>AI Growth Insight</span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, fontStyle: 'italic' }}>
                    {selectedEntry.ai_reflection}
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => generateAIReflection(selectedEntry)}
                  disabled={generatingReflection}
                  style={{
                    marginTop: 24, width: '100%', padding: '12px',
                    borderRadius: 'var(--radius)', background: 'rgba(167,139,250,0.15)',
                    border: '1px solid rgba(167,139,250,0.3)', cursor: 'pointer',
                    color: '#A78BFA', fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}
                >
                  {generatingReflection ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  {generatingReflection ? 'Generating Reflection...' : 'Generate AI Reflection'}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  )
}
