'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import FormattedAIResponse from '@/components/common/FormattedAIResponse'
import { Plus, StickyNote, Pin, Search, Loader2, X, Brain, Trash2, Sparkles, Send } from 'lucide-react'
import { toast } from 'sonner'
import type { Note } from '@/lib/supabase/database.types'

export default function NotesPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [summarizing, setSummarizing] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const loadNotes = useCallback(async () => {
    try {
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false })
      setNotes(data ?? [])
    } catch {
      setNotes([])
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => { loadNotes() }, [loadNotes])

  async function createNote(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || !user) return
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('notes') as any).insert({
        user_id: user.id,
        title: title.trim() || null,
        content: content.trim(),
        is_pinned: false,
        tags: [],
      })
      if (error) { toast.error('Failed to save note') }
      else {
        toast.success('Note created!')
        setTitle(''); setContent(''); setShowForm(false)
        loadNotes()
      }
    } catch {
      toast.error('Could not save note')
    } finally {
      setSaving(false)
    }
  }

  async function handleAINoteGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !aiPrompt.trim()) return
    const promptToUse = aiPrompt.trim()
    setAiGenerating(true)
    toast.info('AI is generating research note...')

    try {
      const customGrokKey = typeof window !== 'undefined' ? localStorage.getItem('nirmaan_grok_key') : null
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Generate a structured research note for: "${promptToUse}". Include a clean Title on line 1, followed by body content.`
          }],
          enableTools: false,
          grokApiKey: customGrokKey,
        })
      })

      if (!res.ok) throw new Error('AI note generation failed')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let genText = ''

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
              if (delta) genText += delta
            } catch {}
          }
        }
      }

      const lines = genText.split('\n').filter(l => l.trim().length > 0)
      const noteTitle = lines[0] ? lines[0].replace(/^#+\s*/, '') : 'AI Generated Note'
      const noteBody = lines.slice(1).join('\n') || genText

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('notes') as any).insert({
        user_id: user.id,
        title: noteTitle,
        content: noteBody,
        is_pinned: false,
        tags: ['AI Generated'],
      })

      if (error) throw error

      setAiPrompt('')
      toast.success('AI Note generated & saved to Knowledge Vault! 📝')
      loadNotes()
    } catch {
      toast.error('AI note generation failed')
    } finally {
      setAiGenerating(false)
    }
  }

  async function togglePin(note: Note) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('notes') as any)
        .update({ is_pinned: !note.is_pinned })
        .eq('id', note.id)
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, is_pinned: !n.is_pinned } : n))
    } catch {}
  }

  async function deleteNote(id: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('notes') as any).delete().eq('id', id)
      setNotes(prev => prev.filter(n => n.id !== id))
      if (selectedNote?.id === id) setSelectedNote(null)
      toast.success('Note deleted')
    } catch {
      toast.error('Could not delete note')
    }
  }

  async function summarizeNoteWithAI(note: Note) {
    setSummarizing(true)
    toast.info('AI is summarizing note...')
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Summarize this note into 2 key takeaways:\n"${note.content}"`
          }],
          enableTools: false
        })
      })

      if (!res.ok) throw new Error('AI summary failed')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let summaryText = ''

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
              if (delta) summaryText += delta
            } catch {}
          }
        }
      }

      toast.success('AI summary generated!')
      setSelectedNote(prev => prev ? { ...prev, content: `${prev.content}\n\n--- AI Summary ---\n${summaryText}` } : null)
    } catch {
      toast.error('Could not generate AI summary')
    } finally {
      setSummarizing(false)
    }
  }

  const filtered = notes.filter(n =>
    (n.title?.toLowerCase() || '').includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StickyNote size={20} color="#06B6D4" />
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Notes & Scratchpad</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }}>
            <Plus size={15} /> New Note
          </button>
        </div>
      }
    >
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* AI Prompt Bar */}
        <form onSubmit={handleAINoteGenerate} className="card" style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface)' }}>
          <Sparkles size={18} color="#06B6D4" style={{ flexShrink: 0 }} />
          <input
            className="glow-input"
            placeholder="Tell AI to generate a note (e.g., 'Summarize key principles of Stoicism')..."
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', padding: 0, fontSize: 13 }}
          />
          <button
            type="submit"
            disabled={aiGenerating || !aiPrompt.trim()}
            className="btn btn-primary"
            style={{ height: 34, padding: '0 12px', fontSize: 12, flexShrink: 0 }}
          >
            {aiGenerating ? <Loader2 size={13} className="animate-spin" /> : <><Send size={13} /> AI Generate</>}
          </button>
        </form>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            className="glow-input"
            placeholder="Search notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>

        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 'var(--radius-card)', marginBottom: 12 }} />)
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <StickyNote size={28} color="#06B6D4" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Capture your ideas</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 300, margin: '0 auto 20px' }}>
              Keep thoughts, code snippets, and research notes organized.
            </p>
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus size={15} /> Create Note
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.map(note => (
              <div
                key={note.id}
                className="card"
                onClick={() => setSelectedNote(note)}
                style={{
                  padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  borderTop: note.is_pinned ? '3px solid #06B6D4' : '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', flex: 1, paddingRight: 8, margin: 0 }}>
                      {note.title || note.content.slice(0, 30)}
                    </h4>
                    <button
                      onClick={e => { e.stopPropagation(); togglePin(note) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                    >
                      <Pin size={15} color={note.is_pinned ? '#06B6D4' : 'var(--text-muted)'} fill={note.is_pinned ? '#06B6D4' : 'none'} />
                    </button>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                    {note.content}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(note.updated_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); deleteNote(note.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Write Note Modal */}
      {showForm && (
        <>
          <div className="overlay" onClick={() => setShowForm(false)} />
          <div className="animate-fade-in" style={{
            position: 'fixed', inset: 0, zIndex: 110,
            background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Create Note</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-secondary)" />
              </button>
            </div>
            <form onSubmit={createNote} style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' }}>
              <input
                className="glow-input"
                placeholder="Note title (optional)..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ marginBottom: 14, fontSize: 16, fontWeight: 600 }}
              />
              <textarea
                className="glow-input"
                placeholder="Start typing your note content..."
                value={content}
                onChange={e => setContent(e.target.value)}
                required
                style={{ flex: 1, resize: 'none', fontSize: 14, lineHeight: 1.7 }}
              />
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={saving || !content.trim()} className="btn btn-primary" style={{ padding: '10px 24px' }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Read / Detail Modal */}
      {selectedNote && (
        <>
          <div className="overlay" onClick={() => setSelectedNote(null)} />
          <div className="animate-fade-in" style={{
            position: 'fixed', inset: 0, zIndex: 110,
            background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{selectedNote.title || 'Untitled Note'}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Updated {new Date(selectedNote.updated_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => summarizeNoteWithAI(selectedNote)}
                  disabled={summarizing}
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: 12, borderColor: '#06B6D4', color: '#06B6D4' }}
                >
                  {summarizing ? <Loader2 size={13} className="animate-spin" /> : <Brain size={13} />}
                  AI Summarize
                </button>
                <button onClick={() => setSelectedNote(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} color="var(--text-secondary)" />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
              <FormattedAIResponse content={selectedNote.content} />
            </div>
          </div>
        </>
      )}
    </AppShell>
  )
}
