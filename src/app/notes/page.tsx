'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { Plus, StickyNote, Pin, Search, Loader2, X, Brain, Trash2 } from 'lucide-react'
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

  // Form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const loadNotes = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false })
    setNotes(data ?? [])
    setLoading(false)
  }, [user, supabase])

  useEffect(() => { loadNotes() }, [loadNotes])

  async function createNote(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || !user) return
    setSaving(true)
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
    setSaving(false)
  }

  async function togglePin(note: Note) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('notes') as any)
      .update({ is_pinned: !note.is_pinned })
      .eq('id', note.id)
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, is_pinned: !n.is_pinned } : n))
  }

  async function deleteNote(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('notes') as any).delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
    if (selectedNote?.id === id) setSelectedNote(null)
    toast.success('Note deleted')
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
            content: `Summarize this note into 2 bullet points:\n"${note.content}"`
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
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Notes & Scratchpad</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>
            <Plus size={15} /> New Note
          </button>
        </div>
      }
    >
      <div style={{ paddingTop: 16 }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={15} color="var(--text-dim)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            placeholder="Search notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>

        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 'var(--radius)', marginBottom: 10 }} />)
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <StickyNote size={28} color="#06B6D4" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Capture your ideas</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 280, margin: '0 auto 24px' }}>
              Keep thoughts, code snippets, and research notes organized.
            </p>
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus size={16} /> Create Note
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {filtered.map(note => (
              <div
                key={note.id}
                className="card card-hover"
                onClick={() => setSelectedNote(note)}
                style={{
                  padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  borderTop: note.is_pinned ? '3px solid #06B6D4' : '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', flex: 1, paddingRight: 8 }}>
                      {note.title || note.content.slice(0, 30)}
                    </h4>
                    <button
                      onClick={e => { e.stopPropagation(); togglePin(note) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <Pin size={15} color={note.is_pinned ? '#06B6D4' : 'var(--text-dim)'} fill={note.is_pinned ? '#06B6D4' : 'none'} />
                    </button>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                    {note.content}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    {new Date(note.updated_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); deleteNote(note.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
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
          <div className="animate-scale-in" style={{
            position: 'fixed', inset: 0, zIndex: 110,
            background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Create Note</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>
            <form onSubmit={createNote} style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' }}>
              <input
                placeholder="Note title (optional)..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ marginBottom: 12, fontSize: 16, fontWeight: 700 }}
              />
              <textarea
                placeholder="Start typing your note content..."
                value={content}
                onChange={e => setContent(e.target.value)}
                required
                style={{ flex: 1, resize: 'none', fontSize: 15, lineHeight: 1.7 }}
              />
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={saving || !content.trim()} className="btn btn-primary" style={{ height: 44, padding: '0 24px' }}>
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
          <div className="animate-scale-in" style={{
            position: 'fixed', inset: 0, zIndex: 110,
            background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700 }}>{selectedNote.title || 'Untitled Note'}</p>
                <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Updated {new Date(selectedNote.updated_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => summarizeNoteWithAI(selectedNote)}
                  disabled={summarizing}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)', background: 'rgba(6,182,212,0.15)',
                    border: '1px solid rgba(6,182,212,0.3)', cursor: 'pointer',
                    color: '#06B6D4', fontSize: 12, fontWeight: 700
                  }}
                >
                  {summarizing ? <Loader2 size={13} className="animate-spin" /> : <Brain size={13} />}
                  AI Summarize
                </button>
                <button onClick={() => setSelectedNote(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} color="var(--text-muted)" />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
              <pre style={{
                whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 15,
                lineHeight: 1.8, color: 'var(--text)'
              }}>
                {selectedNote.content}
              </pre>
            </div>
          </div>
        </>
      )}
    </AppShell>
  )
}
