'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import FormattedAIResponse from '@/components/common/FormattedAIResponse'
import {
  BookOpen, Sparkles, Plus, Trash2, Calendar, Search, RefreshCw,
  Zap, Smile, Meh, Frown, Heart, Check, Wand2, ShieldCheck,
  Type, Download, Copy, Clock, ArrowLeft, Save, Mic, MicOff
} from 'lucide-react'
import { toast } from 'sonner'
import type { JournalEntry } from '@/lib/supabase/database.types'
import { createVoiceRecognizer } from '@/lib/speech'

type FontStyle = 'sans' | 'serif' | 'mono'

const MOOD_OPTIONS = [
  { id: 'amazing', icon: Zap, color: '#06B6D4', label: '😁 Amazing' },
  { id: 'good', icon: Smile, color: '#10B981', label: '😊 Good' },
  { id: 'meh', icon: Meh, color: '#94A3B8', label: '😐 Meh' },
  { id: 'bad', icon: Frown, color: '#06B6D4', label: '😔 Bad' },
  { id: 'awful', icon: Heart, color: '#EF4444', label: '😫 Overwhelmed' },
]

interface AIReframeSuggestions {
  growth: string
  mindful: string
  bullet: string
}

/**
 * Helper to guarantee React never receives an object as a child node
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
  const [search, setSearch] = useState('')

  // Active Reader / Editor View State
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null)
  const [readerTitle, setReaderTitle] = useState('')
  const [readerContent, setReaderContent] = useState('')
  const [readerMood, setReaderMood] = useState('good')
  const [fontStyle, setFontStyle] = useState<FontStyle>('sans')

  // Auto-Save Indicator
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle')
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Voice Dictation
  const [isRecording, setIsRecording] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognizerRef = useRef<any>(null)

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
        .limit(40)
      setEntries(data ?? [])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  // Open Entry in Reader / Live Editor Mode
  function openReader(entry: JournalEntry) {
    setActiveEntry(entry)
    setReaderTitle(formatValueAsString(entry.title))
    setReaderContent(formatValueAsString(entry.content))
    setReaderMood(formatValueAsString(entry.mood) || 'good')
    setReframeSuggestions(null)
    setAutoSaveStatus('idle')
  }

  // Create New Blank Entry & Open Reader Immediately
  async function handleCreateNewBlankEntry() {
    if (!user) return
    const newTitle = `Journal Entry — ${new Date().toLocaleDateString()}`
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('journal_entries') as any).insert({
        user_id: user.id,
        title: newTitle,
        content: '',
        mood: 'good',
        entry_type: 'free',
      }).select().single()

      if (!error && data) {
        setEntries(prev => [data, ...prev])
        openReader(data)
        toast.success('New Journal Page Opened! 📖')
      }
    } catch {
      toast.error('Failed to create new entry')
    }
  }

  // Real-Time Debounced Auto-Save
  const triggerAutoSave = useCallback((newTitle: string, newContent: string, newMood: string) => {
    if (!activeEntry || !user) return
    setAutoSaveStatus('saving')

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('journal_entries') as any)
          .update({
            title: newTitle.trim() || null,
            content: newContent,
            mood: newMood,
          })
          .eq('id', activeEntry.id)
          .eq('user_id', user.id)

        setEntries(prev => prev.map(e => e.id === activeEntry.id ? { ...e, title: newTitle.trim() || null, content: newContent, mood: newMood } : e))
        setAutoSaveStatus('saved')
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      } catch {
        setAutoSaveStatus('idle')
      }
    }, 1000)
  }, [activeEntry, user, supabase])

  // Handle Title Change with Realtime Auto-Save
  function handleTitleChange(val: string) {
    setReaderTitle(val)
    triggerAutoSave(val, readerContent, readerMood)
  }

  // Handle Content Change with Realtime Auto-Save
  function handleContentChange(val: string) {
    setReaderContent(val)
    triggerAutoSave(readerTitle, val, readerMood)
  }

  // Handle Mood Change with Realtime Auto-Save
  function handleMoodChange(m: string) {
    setReaderMood(m)
    triggerAutoSave(readerTitle, readerContent, m)
  }

  // Toggle Voice Dictation
  function toggleVoiceDictation() {
    if (isRecording) {
      recognizerRef.current?.stop()
      setIsRecording(false)
      toast.info('Voice recording stopped.')
    } else {
      const recognizer = createVoiceRecognizer({
        onTranscript: (text, isFinal) => {
          if (isFinal) {
            setReaderContent(prev => {
              const updated = (prev ? prev + ' ' : '') + text
              triggerAutoSave(readerTitle, updated, readerMood)
              return updated
            })
          }
        },
        onError: (err) => {
          toast.error(`Voice input error: ${err}`)
          setIsRecording(false)
        },
        onEnd: () => {
          setIsRecording(false)
        }
      })

      if (!recognizer.isSupported) {
        toast.error('Voice dictation is not supported in this browser environment.')
        return
      }

      recognizerRef.current = recognizer
      recognizer.start()
      setIsRecording(true)
      toast.success('Voice dictation started... Speak clearly into your mic! 🎙️')
    }
  }

  // Generate 3 AI Reframe & Enhancement Suggestions inside Reader
  async function generateAIReframeSuggestions() {
    const textToProcess = readerContent.trim()
    if (!textToProcess) {
      toast.error('Please enter journal content first before generating reframes!')
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
            setReframeSuggestions({ growth: fullOutput, mindful: fullOutput, bullet: fullOutput })
          }
        } catch {
          setReframeSuggestions({ growth: fullOutput, mindful: fullOutput, bullet: fullOutput })
        }
      }
    } catch {
      toast.error('Failed to generate AI suggestions')
    } finally {
      setGeneratingSuggestions(false)
    }
  }

  // Apply AI Suggestion & Auto-Save
  function applySuggestion(rawVal: unknown) {
    const safeStr = formatValueAsString(rawVal)
    setReaderContent(safeStr)
    triggerAutoSave(readerTitle, safeStr, readerMood)
    toast.success('Applied AI suggestion & auto-saved! ✍️')
  }

  // Copy Journal Content to Clipboard
  function copyToClipboard() {
    navigator.clipboard.writeText(`${readerTitle}\n\n${readerContent}`)
    toast.success('Journal entry copied to clipboard!')
  }

  // Export Journal Entry as Markdown File
  function exportAsMarkdown() {
    const blob = new Blob([`# ${readerTitle}\n\n${readerContent}`], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${readerTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`
    a.click()
    toast.success('Exported journal entry as Markdown file! 📄')
  }

  async function handleDeleteEntry(entryId: string) {
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('journal_entries') as any).delete().eq('id', entryId).eq('user_id', user.id)
    setEntries(prev => prev.filter(e => e.id !== entryId))
    if (activeEntry?.id === entryId) setActiveEntry(null)
    toast.success('Journal entry deleted')
  }

  const wordCount = readerContent.trim() ? readerContent.trim().split(/\s+/).length : 0
  const readTimeMins = Math.max(1, Math.ceil(wordCount / 200))

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
              <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                AI Reflection Journal <ShieldCheck size={16} color="#10B981" />
              </h1>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>Book Reader, Real-Time Auto-Save, Voice STT & AI Rephraser</p>
            </div>
          </div>

          <button
            onClick={handleCreateNewBlankEntry}
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: 13, background: 'linear-gradient(135deg, #10B981, #059669)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} /> New Journal Page
          </button>
        </div>
      }
    >
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* FULL-SCREEN MODERN BOOK READER & LIVE AUTO-SAVE EDITOR */}
        {activeEntry ? (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid #10B981',
            borderRadius: 24,
            padding: '24px 28px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            position: 'relative',
          }}>
            {/* Reader Header Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid rgba(16, 185, 129, 0.2)', paddingBottom: 16 }}>
              <button
                onClick={() => setActiveEntry(null)}
                style={{ background: 'var(--surface-2)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 10, padding: '7px 14px', color: '#10B981', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <ArrowLeft size={16} /> Back to Library
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                {/* Auto-save Status Indicator */}
                <div style={{ fontSize: 11.5, fontWeight: 700, color: autoSaveStatus === 'saving' ? '#06B6D4' : autoSaveStatus === 'saved' ? '#10B981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {autoSaveStatus === 'saving' ? (
                    <><RefreshCw size={13} className="animate-spin" color="#06B6D4" /> Auto-saving...</>
                  ) : autoSaveStatus === 'saved' ? (
                    <><Save size={13} color="#10B981" /> Auto-saved {lastSavedTime && `at ${lastSavedTime}`}</>
                  ) : (
                    <span>Real-Time Auto-Save Active ⚡</span>
                  )}
                </div>

                {/* Voice Dictation Button */}
                <button
                  onClick={toggleVoiceDictation}
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: `1px solid ${isRecording ? '#EF4444' : 'var(--border)'}`,
                    background: isRecording ? 'rgba(239,68,68,0.15)' : 'var(--surface-2)',
                    color: isRecording ? '#EF4444' : 'var(--text-secondary)', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                  }}
                >
                  {isRecording ? <MicOff size={14} className="animate-pulse" /> : <Mic size={14} />}
                  {isRecording ? 'Recording...' : 'Voice Dictate'}
                </button>

                {/* Typography Font Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <Type size={14} color="var(--text-muted)" style={{ margin: '0 4px' }} />
                  {[
                    { id: 'sans', label: 'Sans' },
                    { id: 'serif', label: 'Serif' },
                    { id: 'mono', label: 'Mono' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFontStyle(f.id as FontStyle)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: 'none',
                        background: fontStyle === f.id ? '#10B981' : 'transparent',
                        color: fontStyle === f.id ? '#FFFFFF' : 'var(--text-secondary)',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Export Buttons */}
                <button onClick={copyToClipboard} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 6, color: 'var(--text-muted)', cursor: 'pointer' }} title="Copy entry text">
                  <Copy size={16} />
                </button>
                <button onClick={exportAsMarkdown} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 6, color: 'var(--text-muted)', cursor: 'pointer' }} title="Export as Markdown">
                  <Download size={16} />
                </button>
              </div>
            </div>

            {/* Reader Metadata Pill Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="badge badge-success">
                  Mood: {readerMood}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={13} color="#10B981" /> {wordCount} words • {readTimeMins} min read
                </span>
              </div>

              {/* Mood Selector Buttons inside Reader */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {MOOD_OPTIONS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleMoodChange(m.id)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 8,
                      border: `1px solid ${readerMood === m.id ? m.color : 'var(--border)'}`,
                      background: readerMood === m.id ? `${m.color}25` : 'var(--surface-2)',
                      color: readerMood === m.id ? m.color : 'var(--text-secondary)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title Editable Input */}
            <input
              type="text"
              placeholder="Untitled Journal Page..."
              value={readerTitle}
              onChange={e => handleTitleChange(e.target.value)}
              style={{
                width: '100%',
                fontSize: 24,
                fontWeight: 900,
                color: 'var(--text-primary)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: fontStyle === 'serif' ? 'Georgia, serif' : fontStyle === 'mono' ? 'monospace' : 'inherit',
              }}
            />

            {/* AI Reframe Bar inside Reader */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(6, 182, 212, 0.3)' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#06B6D4', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} color="#06B6D4" /> AI REFRAME ENGINE:
              </span>
              <button
                onClick={generateAIReframeSuggestions}
                disabled={generatingSuggestions}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: 11.5, color: '#06B6D4', border: '1px solid rgba(6, 182, 212, 0.4)' }}
              >
                {generatingSuggestions ? <RefreshCw size={13} className="animate-spin" /> : <Wand2 size={13} color="#06B6D4" />}
                <span>{generatingSuggestions ? 'Rephrasing...' : 'Generate 3 AI Reframes'}</span>
              </button>
            </div>

            {/* AI 3-Reframe Suggestions Cards Display */}
            {reframeSuggestions && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, background: 'var(--surface-2)', padding: 14, borderRadius: 16, border: '1px solid #06B6D4' }}>
                {/* Option 1: Stoic Growth */}
                <div style={{ background: 'var(--surface)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#10B981', marginBottom: 4 }}>🌟 STOIC GROWTH REFRAME</div>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {formatValueAsString(reframeSuggestions.growth)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => applySuggestion(reframeSuggestions.growth)}
                    className="btn btn-secondary"
                    style={{ marginTop: 10, fontSize: 11, padding: '4px 8px', alignSelf: 'flex-start' }}
                  >
                    <Check size={13} color="#10B981" /> Apply & Save
                  </button>
                </div>

                {/* Option 2: Mindful Reflection */}
                <div style={{ background: 'var(--surface)', border: '1px solid rgba(6, 182, 212, 0.4)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#06B6D4', marginBottom: 4 }}>🧘 MINDFUL REFLECTION</div>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {formatValueAsString(reframeSuggestions.mindful)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => applySuggestion(reframeSuggestions.mindful)}
                    className="btn btn-secondary"
                    style={{ marginTop: 10, fontSize: 11, padding: '4px 8px', alignSelf: 'flex-start' }}
                  >
                    <Check size={13} color="#06B6D4" /> Apply & Save
                  </button>
                </div>

                {/* Option 3: Bullet Summary */}
                <div style={{ background: 'var(--surface)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#FFFFFF', marginBottom: 4 }}>⚡ BULLET SUMMARY</div>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {formatValueAsString(reframeSuggestions.bullet)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => applySuggestion(reframeSuggestions.bullet)}
                    className="btn btn-secondary"
                    style={{ marginTop: 10, fontSize: 11, padding: '4px 8px', alignSelf: 'flex-start' }}
                  >
                    <Check size={13} color="#FFFFFF" /> Apply & Save
                  </button>
                </div>
              </div>
            )}

            {/* Main Content Editable Textarea */}
            <textarea
              placeholder="Start writing your journal reflection... (Auto-saves continuously in real-time)"
              value={readerContent}
              onChange={e => handleContentChange(e.target.value)}
              rows={12}
              style={{
                width: '100%',
                background: 'var(--surface-2)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 16,
                color: 'var(--text-primary)',
                padding: 18,
                fontSize: 14.5,
                lineHeight: 1.7,
                fontFamily: fontStyle === 'serif' ? 'Georgia, serif' : fontStyle === 'mono' ? 'monospace' : 'inherit',
                resize: 'vertical',
                outline: 'none',
              }}
            />

            {/* AI Reflection Insights attached to active entry */}
            {activeEntry.ai_reflection && (
              <div style={{ background: 'var(--surface-2)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Sparkles size={18} color="#06B6D4" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#06B6D4', marginBottom: 2 }}>AI PSYCHOLOGICAL REFLECTION</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    <FormattedAIResponse content={formatValueAsString(activeEntry.ai_reflection)} />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* MINIMALIST JOURNAL LIBRARY & TIMELINE VIEW */
          <>
            {/* Search & Stats Header */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
                <Search size={16} color="#10B981" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  placeholder="Search past journal reflections, moods, or titles..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', height: 42, paddingLeft: 42, paddingRight: 14, background: 'var(--surface)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 12, color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
                />
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
                Journal Library: <span style={{ color: '#10B981' }}>{entries.length} Pages</span>
              </div>
            </div>

            {/* Journal Entries Grid */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <RefreshCw size={32} color="#10B981" className="animate-spin" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Loading journal pages...</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface)', borderRadius: 20, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <BookOpen size={40} color="#10B981" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>No journal pages found</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>Click &quot;New Journal Page&quot; above to open your blank editor.</p>
                <button onClick={handleCreateNewBlankEntry} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
                  <Plus size={16} /> Open Blank Journal Page
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {filteredEntries.map(entry => {
                  const entryText = formatValueAsString(entry.content)
                  const words = entryText.trim() ? entryText.trim().split(/\s+/).length : 0

                  return (
                    <div
                      key={entry.id}
                      onClick={() => openReader(entry)}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: 18,
                        padding: 18,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 12,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        transition: 'all 150ms ease',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span className="badge badge-success" style={{ fontSize: 11, fontWeight: 800 }}>
                            {formatValueAsString(entry.mood) || 'good'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteEntry(entry.id)
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 2 }}
                            title="Delete entry"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {formatValueAsString(entry.title) || 'Untitled Reflection'}
                        </h3>

                        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
                          {entryText || 'Tap to start writing in real-time auto-save mode...'}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#10B981', fontWeight: 700, paddingTop: 10, borderTop: '1px solid rgba(16, 185, 129, 0.15)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={12} /> {new Date(entry.created_at).toLocaleDateString()}
                        </span>
                        <span>{words} words • Open Reader →</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

      </div>
    </AppShell>
  )
}
