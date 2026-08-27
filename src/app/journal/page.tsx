'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { Plus, Mic, Sparkles, ChevronRight, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, getMoodEmoji } from '@/lib/utils'
import type { JournalEntry } from '@/lib/supabase/database.types'

type EntryType = 'free' | 'prompted' | 'voice'

const MOODS = [
  { id: 'amazing', emoji: '🚀', label: 'Amazing' },
  { id: 'good',    emoji: '😊', label: 'Good'    },
  { id: 'meh',     emoji: '😐', label: 'Meh'     },
  { id: 'bad',     emoji: '😔', label: 'Bad'      },
  { id: 'awful',   emoji: '😞', label: 'Awful'    },
]

const PROMPTS = [
  'What are 3 things I learned today?',
  'What am I grateful for right now?',
  'What would make tomorrow better?',
  'What challenge am I avoiding?',
  'Who inspired me today and why?',
  'What progress did I make on my goals?',
  'What drained my energy today?',
  'What am I most proud of this week?',
]

export default function JournalPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)

  // Form state
  const [entryType, setEntryType] = useState<EntryType>('free')
  const [content, setContent] = useState('')
  const [selectedMood, setSelectedMood] = useState('')
  const [selectedPrompt, setSelectedPrompt] = useState('')
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [recording, setRecording] = useState(false)

  const fetchEntries = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setEntries(data ?? [])
    setLoading(false)
  }, [user, supabase])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  async function saveEntry() {
    if (!content.trim() || !user) return
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('journal_entries') as any).insert({
      user_id: user.id,
      title: title || null,
      content,
      mood: selectedMood || null,
      mood_score: selectedMood ? getMoodScore(selectedMood) : null,
      entry_type: entryType,
      tags: [],
    }).select().single()
    if (error) { toast.error('Failed to save entry'); setSaving(false); return }
    toast.success('Entry saved 📓')
    setEntries(prev => [data, ...prev])
    setShowForm(false)
    setContent(''); setTitle(''); setSelectedMood(''); setSelectedPrompt('')
    setSaving(false)
  }

  function getMoodScore(mood: string) {
    const map: Record<string, number> = { amazing: 100, good: 75, meh: 50, bad: 25, awful: 0 }
    return map[mood] ?? 50
  }

  function startVoice() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice not supported in this browser')
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SR as any)()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-IN'
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

  // Group entries by date
  const grouped: Record<string, JournalEntry[]> = {}
  for (const e of entries) {
    const date = formatDate(e.created_at, 'long')
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(e)
  }

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Journal</h1>
          <button onClick={() => setShowForm(true)} className="btn btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>
            <Plus size={15} /> Write
          </button>
        </div>
      }
    >
      <div style={{ paddingTop: 16 }}>
        {loading
          ? [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius)', marginBottom: 10 }} />)
          : entries.length === 0
          ? (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>📓</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Your story begins here</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, maxWidth: 260, margin: '0 auto 24px' }}>
                Capture your thoughts, track your mood, and let AI reflect on your journey.
              </p>
              <button onClick={() => setShowForm(true)} className="btn btn-primary">
                <Plus size={16} /> Write First Entry
              </button>
            </div>
          )
          : Object.entries(grouped).map(([date, dayEntries]) => (
            <div key={date} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 }}>
                {date}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dayEntries.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'left',
                      width: '100%', transition: 'border-color 200ms',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                      background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, flexShrink: 0,
                    }}>
                      {entry.mood ? getMoodEmoji(entry.mood) : '📓'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry.title || entry.content.slice(0, 50)}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry.title ? entry.content.slice(0, 60) : ''}
                        {new Date(entry.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {entry.ai_reflection && (
                      <Sparkles size={14} color="#A78BFA" />
                    )}
                    <ChevronRight size={14} color="var(--text-dim)" />
                  </button>
                ))}
              </div>
            </div>
          ))
        }
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
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['free', 'prompted', 'voice'] as EntryType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setEntryType(t)}
                    style={{
                      padding: '5px 12px', borderRadius: 99, border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                      background: entryType === t ? 'var(--growth)' : 'var(--surface-2)',
                      color: entryType === t ? '#0A0B0D' : 'var(--text-muted)',
                      transition: 'all 200ms ease',
                    }}
                  >
                    {t === 'voice' ? '🎤 Voice' : t === 'prompted' ? '💡 Prompted' : '✍️ Free'}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {/* Mood picker */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>How are you feeling?</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {MOODS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMood(m.id)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${selectedMood === m.id ? 'var(--growth)' : 'var(--border)'}`,
                        background: selectedMood === m.id ? 'rgba(52,211,153,0.1)' : 'var(--surface)',
                        cursor: 'pointer', transition: 'all 150ms ease',
                        flex: 1,
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{m.emoji}</span>
                      <span style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 600 }}>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional title */}
              <input
                placeholder="Entry title (optional)"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ marginBottom: 12, fontSize: 15, fontWeight: 600 }}
              />

              {/* Prompt picker */}
              {entryType === 'prompted' && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 8 }}>Pick a prompt:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {PROMPTS.map(p => (
                      <button
                        key={p}
                        onClick={() => setSelectedPrompt(p)}
                        style={{
                          padding: '10px 14px', borderRadius: 'var(--radius-sm)', textAlign: 'left',
                          border: `1px solid ${selectedPrompt === p ? 'var(--focus)' : 'var(--border)'}`,
                          background: selectedPrompt === p ? 'rgba(245,158,11,0.08)' : 'var(--surface)',
                          color: selectedPrompt === p ? 'var(--focus)' : 'var(--text-muted)',
                          fontSize: 13, cursor: 'pointer', transition: 'all 150ms ease',
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected prompt display */}
              {selectedPrompt && (
                <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-sm)', marginBottom: 12 }}>
                  <p style={{ fontSize: 13, color: 'var(--focus)', fontWeight: 500, fontStyle: 'italic' }}>
                    &ldquo;{selectedPrompt}&rdquo;
                  </p>
                </div>
              )}

              {/* Voice controls */}
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
                      justifyContent: 'center', transition: 'all 200ms ease',
                    }}
                  >
                    <Mic size={18} color={recording ? 'var(--danger)' : 'var(--text-muted)'} className={recording ? 'animate-pulse-glow' : ''} />
                    <span style={{ fontSize: 14, color: recording ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {recording ? 'Recording... (tap to stop)' : 'Tap to start recording'}
                    </span>
                  </button>
                </div>
              )}

              {/* Content textarea */}
              <textarea
                className="font-journal"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={
                  selectedPrompt
                    ? `Respond to: "${selectedPrompt}"`
                    : 'Start writing freely... let it flow.'
                }
                style={{
                  width: '100%', minHeight: 200, resize: 'none',
                  fontSize: 16, lineHeight: 1.7, fontFamily: 'Fraunces, Georgia, serif',
                  background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--text)', padding: 0,
                }}
              />
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 20px', borderTop: '1px solid var(--border)',
              paddingBottom: 'calc(14px + env(safe-area-inset-bottom))',
              display: 'flex', gap: 10,
            }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
                {content.split(' ').filter(Boolean).length} words
              </div>
              <button
                onClick={saveEntry}
                disabled={saving || !content.trim()}
                className="btn btn-primary"
                style={{ height: 44, padding: '0 24px' }}
              >
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {selectedEntry.mood && <span style={{ fontSize: 24 }}>{getMoodEmoji(selectedEntry.mood)}</span>}
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700 }}>{selectedEntry.title || 'Journal Entry'}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>{formatDate(selectedEntry.created_at, 'long')}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEntry(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
              <p className="font-journal" style={{ fontSize: 17, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                {selectedEntry.content}
              </p>
              {selectedEntry.ai_reflection && (
                <div style={{
                  marginTop: 24, padding: '16px', borderRadius: 'var(--radius)',
                  background: 'linear-gradient(135deg, rgba(167,139,250,0.1), rgba(52,211,153,0.05))',
                  border: '1px solid rgba(167,139,250,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Sparkles size={14} color="#A78BFA" />
                    <span style={{ fontSize: 11, color: '#A78BFA', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>AI Reflection</span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, fontStyle: 'italic' }}>
                    {selectedEntry.ai_reflection}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  )
}
