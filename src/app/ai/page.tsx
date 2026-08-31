'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import {
  Send, Plus, Loader2, Brain, Zap, Calendar, Sparkles, ChevronDown, Check, Wrench,
  Copy, Volume2, VolumeX, Mic, MicOff, RotateCcw, Download, Trash2, Edit2, Search,
  PanelLeftClose, PanelLeft, Paperclip, MessageSquare, ShieldCheck, FileText, CheckSquare, X
} from 'lucide-react'
import { toast } from 'sonner'
import type { AIConversation, AIMessage } from '@/lib/supabase/database.types'

const FREE_MODELS = [
  { id: 'minimax/minimax-m2.7:free',           label: 'MiniMax M2.7',      tag: 'Primary Free' },
  { id: 'liquid/lfm-2.5-2.6b:free',             label: 'Liquid LFM 2.5',    tag: 'Fast Free' },
  { id: 'z-ai/glm-5.2:free',                   label: 'GLM 5.2',           tag: 'Free' },
  { id: 'inclusionai/ling-3.0-flash-fin:free',  label: 'Ling 3.0 Flash',    tag: 'Free' },
  { id: 'cohere/north-mini-code:free',         label: 'North Mini Code',   tag: 'Code Free' },
  { id: 'google/gemma-4-31b-it:free',           label: 'Gemma 4 31B',       tag: 'Free' },
  { id: 'openai/gpt-3.5-turbo',                label: 'GPT-3.5 Turbo',     tag: 'OpenAI' },
]

const PAID_MODELS = [
  { id: 'openai/gpt-4o',                      label: 'GPT-4o',           tag: 'GPT Premier' },
  { id: 'anthropic/claude-3.5-sonnet',        label: 'Claude 3.5 Sonnet',tag: 'Smart' },
]

const QUICK_ACTIONS = [
  { label: 'Plan my day',          icon: Calendar,  prompt: 'Plan my day based on my current tasks and goals. Give me 3 high-priority deep work tasks for today.' },
  { label: 'Weekly reflection',    icon: Sparkles,  prompt: 'Help me reflect on this week. What should I focus on next week?' },
  { label: 'Add 3 focus tasks',    icon: Zap,       prompt: 'Create 3 high-priority tasks for me to focus on today for deep work.' },
  { label: 'Brain dump → Tasks',   icon: Brain,     prompt: "I'll give you my brain dump and you convert them into organized tasks. Ready? Start by asking me what's on my mind." },
]

const ACTION_LABELS: Record<string, string> = {
  create_task: '✅ Task created',
  create_todo: '📝 Todo added',
  create_journal_entry: '📓 Journal entry created',
  create_goal: '🎯 Goal added',
  get_dashboard_summary: '📊 Dashboard loaded',
  plan_my_day: '📅 Day plan loaded',
}

export default function AIPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [conversations, setConversations] = useState<AIConversation[]>([])
  const [activeConv, setActiveConv] = useState<AIConversation | null>(null)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [selectedModel, setSelectedModel] = useState(FREE_MODELS[0].id)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [enableTools, setEnableTools] = useState(true)
  const [pendingActions, setPendingActions] = useState<string[]>([])
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileHistory, setShowMobileHistory] = useState(false)
  const [editingConvId, setEditingConvId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversations = useCallback(async () => {
    try {
      if (!user) return
      const { data } = await supabase
        .from('ai_conversations').select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)
      setConversations(data ?? [])
      if (data && data.length > 0 && !activeConv) setActiveConv(data[0])
    } catch {
      setConversations([])
    }
  }, [user, supabase, activeConv])

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const { data } = await supabase.from('ai_messages').select('*').eq('conversation_id', convId).order('created_at')
      setMessages(data ?? [])
    } catch {
      setMessages([])
    }
  }, [supabase])

  useEffect(() => { loadConversations() }, [loadConversations])
  useEffect(() => { if (activeConv) loadMessages(activeConv.id) }, [activeConv, loadMessages])

  const createNewConversation = useCallback(async (firstMessage?: string) => {
    if (!user) return null
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('ai_conversations') as any).insert({
        user_id: user.id,
        title: firstMessage ? firstMessage.slice(0, 40) + (firstMessage.length > 40 ? '…' : '') : 'New Chat',
        model: selectedModel,
      }).select().single()
      if (data) {
        setConversations(prev => [data, ...prev])
        setActiveConv(data)
        setMessages([])
        setShowMobileHistory(false)
      }
      return data
    } catch {
      return null
    }
  }, [user, supabase, selectedModel])

  async function deleteConversation(convId: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    try {
      await supabase.from('ai_conversations').delete().eq('id', convId)
      setConversations(prev => prev.filter(c => c.id !== convId))
      if (activeConv?.id === convId) {
        const remaining = conversations.filter(c => c.id !== convId)
        setActiveConv(remaining[0] ?? null)
        setMessages([])
      }
      toast.success('Deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  async function saveRenamedTitle(convId: string) {
    if (!editingTitle.trim()) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('ai_conversations') as any).update({ title: editingTitle.trim() }).eq('id', convId)
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, title: editingTitle.trim() } : c))
      if (activeConv?.id === convId) {
        setActiveConv(prev => prev ? { ...prev, title: editingTitle.trim() } : null)
      }
      setEditingConvId(null)
      toast.success('Renamed')
    } catch {}
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const toggleSpeech = (msgId: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Text-to-speech not supported')
      return
    }
    if (speakingId === msgId) {
      window.speechSynthesis.cancel()
      setSpeakingId(null)
      return
    }
    window.speechSynthesis.cancel()
    const cleanText = text.replace(/[*_#`]/g, '')
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.onend = () => setSpeakingId(null)
    utterance.onerror = () => setSpeakingId(null)
    setSpeakingId(msgId)
    window.speechSynthesis.speak(utterance)
  }

  const toggleListening = () => {
    if (typeof window === 'undefined') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Voice input not supported in browser')
      return
    }
    if (isListening) {
      setIsListening(false)
      return
    }
    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
        toast.info('Listening... Speak now 🎙️')
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join('')
        setInput(transcript)
      }
      recognition.onerror = () => setIsListening(false)
      recognition.onend = () => setIsListening(false)
      recognition.start()
    } catch {
      setIsListening(false)
      toast.error('Could not start voice input')
    }
  }

  // Stylish Markdown parser for headers, bold text, bullet lists, and artifacts
  const renderStylishContent = (content: string) => {
    const artifactRegex = /<<<ARTIFACT:(.*?):(.*?)\>>>([\s\S]*?)<<<END_ARTIFACT\>>>/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = artifactRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', text: content.substring(lastIndex, match.index) })
      }
      parts.push({
        type: 'artifact',
        title: match[1].trim(),
        artifactType: match[2].trim(),
        body: match[3].trim()
      })
      lastIndex = artifactRegex.lastIndex
    }
    if (lastIndex < content.length) {
      parts.push({ type: 'text', text: content.substring(lastIndex) })
    }

    return (
      <div>
        {parts.map((p, idx) => {
          if (p.type === 'text') {
            const lines = (p.text || '').split('\n')
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {lines.map((line, lIdx) => {
                  const trimmed = line.trim()
                  if (!trimmed) return <div key={lIdx} style={{ height: 4 }} />

                  if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
                    const headerText = trimmed.replace(/^###?\s*/, '')
                    return (
                      <h3 key={lIdx} style={{
                        fontSize: 15, fontWeight: 800, color: 'var(--text)',
                        margin: '8px 0 2px', letterSpacing: '-0.01em',
                      }}>
                        {headerText}
                      </h3>
                    )
                  }

                  if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                    const bulletText = trimmed.replace(/^[-*]\s*/, '')
                    return (
                      <div key={lIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingLeft: 2 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#818CF8', marginTop: 7, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13.5, color: 'var(--text)', lineHeight: 1.55 }}
                              dangerouslySetInnerHTML={{ __html: parseBoldText(bulletText) }} />
                      </div>
                    )
                  }

                  return (
                    <p key={lIdx} style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.55, margin: 0 }}
                       dangerouslySetInnerHTML={{ __html: parseBoldText(line) }} />
                  )
                })}
              </div>
            )
          }

          return (
            <div key={idx} className="glow-box-indigo" style={{
              margin: '12px 0', padding: '12px 14px', borderRadius: 'var(--radius-sm)',
              background: 'rgba(129,140,248,0.08)', backdropFilter: 'blur(16px)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} color="#818CF8" />
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#FFF' }}>{p.title || 'Artifact'}</span>
                </div>
                <button onClick={() => copyToClipboard(p.body || '')} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Copy size={11} /> Copy
                </button>
              </div>
              <pre style={{
                background: 'rgba(10,11,13,0.95)', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                fontSize: 11.5, fontFamily: 'Consolas, Monaco, monospace', color: '#E2E8F0', margin: 0,
                maxHeight: 260, overflowY: 'auto', lineHeight: 1.5, border: '1px solid rgba(255,255,255,0.08)'
              }}>
                {p.body}
              </pre>
            </div>
          )
        })}
      </div>
    )
  }

  async function sendMessage(e?: React.FormEvent, overrideContent?: string) {
    e?.preventDefault()
    const content = overrideContent ?? input.trim()
    if (!content || !user) return
    setInput('')
    setStreaming(true)
    setPendingActions([])

    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    let conv = activeConv
    if (!conv) {
      conv = await createNewConversation(content)
      if (!conv) { setStreaming(false); return }
    }

    const userMsg: AIMessage = {
      id: crypto.randomUUID(),
      conversation_id: conv.id,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('ai_messages') as any).insert(userMsg)

    const assistantId = crypto.randomUUID()
    setMessages(prev => [...prev, {
      id: assistantId,
      conversation_id: conv!.id,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    }])

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          model: selectedModel,
          conversationId: conv.id,
          enableTools,
        }),
      })

      if (!res.ok) throw new Error('AI Assistant request failed')

      const actionsHeader = res.headers.get('X-Actions')
      if (actionsHeader) {
        const actionNames = actionsHeader.split(',').map(a => a.trim())
        const labels = actionNames.map(a => ACTION_LABELS[a] ?? a).filter(Boolean)
        setPendingActions(labels)
        labels.forEach(label => toast.success(label, { icon: '⚡' }))
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

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
              if (delta) {
                fullContent += delta
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: fullContent } : m
                ))
              }
            } catch {}
          }
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('ai_messages') as any).insert({
        conversation_id: conv.id,
        role: 'assistant',
        content: fullContent,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI request failed.'
      toast.error(msg)
      setMessages(prev => prev.filter(m => m.id !== assistantId))
    } finally {
      setStreaming(false)
      setPendingActions([])
    }
  }

  const regenerateLastMessage = () => {
    if (messages.length < 2 || streaming) return
    const lastUserMsgIndex = [...messages].reverse().findIndex(m => m.role === 'user')
    if (lastUserMsgIndex !== -1) {
      const index = messages.length - 1 - lastUserMsgIndex
      const lastUserMsg = messages[index]
      sendMessage(undefined, lastUserMsg.content)
    }
  }

  const allModels = [...FREE_MODELS, ...PAID_MODELS]
  const currentModel = allModels.find(m => m.id === selectedModel) ?? FREE_MODELS[0]

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setShowMobileHistory(p => !p)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center' }}
              title="Chat History"
            >
              <MessageSquare size={18} color="#818CF8" />
            </button>
            <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>NIRMAAN AI</h1>
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* Model Selector Pill */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowModelPicker(p => !p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
                  borderRadius: 99, background: 'rgba(129,140,248,0.12)',
                  border: '1px solid rgba(129,140,248,0.3)', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  color: '#818CF8',
                }}
              >
                <span>{currentModel.label}</span>
                <ChevronDown size={10} />
              </button>

              {showModelPicker && (
                <>
                  <div onClick={() => setShowModelPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
                  <div style={{
                    position: 'absolute', top: '110%', right: 0, zIndex: 60,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', padding: 6, minWidth: 200,
                    boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
                  }}>
                    {FREE_MODELS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => { setSelectedModel(m.id); setShowModelPicker(false) }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '6px 8px', borderRadius: 6, width: '100%', border: 'none',
                          background: selectedModel === m.id ? 'rgba(129,140,248,0.15)' : 'transparent',
                          color: selectedModel === m.id ? '#818CF8' : 'var(--text)', fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        {m.label}
                        {selectedModel === m.id && <Check size={12} color="#818CF8" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => { setActiveConv(null); setMessages([]) }}
              style={{
                height: 30, padding: '0 10px', borderRadius: 99,
                background: '#818CF8', border: 'none',
                display: 'flex', alignItems: 'center', gap: 4,
                cursor: 'pointer', color: '#0A0B0D', fontWeight: 800, fontSize: 11
              }}
            >
              <Plus size={13} /> New
            </button>
          </div>
        </div>
      }
      noPadding
    >
      <div style={{ display: 'flex', height: 'calc(100dvh - 120px)', position: 'relative', overflow: 'hidden' }}>

        {/* Mobile History Slide-over Drawer */}
        {showMobileHistory && (
          <>
            <div className="overlay" onClick={() => setShowMobileHistory(false)} style={{ zIndex: 90 }} />
            <div className="animate-slide-up" style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
              background: 'var(--surface)', borderTop: '1px solid var(--border)',
              borderRadius: '20px 20px 0 0', padding: '16px', maxHeight: '75vh', overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>Chat History</span>
                <button onClick={() => setShowMobileHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => { setActiveConv(conv); setShowMobileHistory(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                      background: activeConv?.id === conv.id ? 'rgba(129,140,248,0.15)' : 'var(--surface-2)',
                      border: `1px solid ${activeConv?.id === conv.id ? '#818CF8' : 'var(--border)'}`,
                      cursor: 'pointer', color: 'var(--text)', fontSize: 13
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{conv.title}</span>
                    <button onClick={(e) => deleteConversation(conv.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Main Chat Messages List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--background)' }}>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 16px', display: 'flex', flexDirection: 'column' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', margin: 'auto', maxWidth: 360, padding: '20px 0' }}>
                <div style={{
                  width: 54, height: 54, borderRadius: '50%',
                  background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px',
                }}>
                  <Brain size={26} color="#818CF8" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>NIRMAAN AI Assistant</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Directly create tasks, set goals, manage todos, and answer questions.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {QUICK_ACTIONS.map(qa => (
                    <button
                      key={qa.label}
                      onClick={() => sendMessage(undefined, qa.prompt)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <qa.icon size={14} color="#818CF8" />
                      <span style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: 600 }}>{qa.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '88%', padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '16px 16px 2px 16px' : '2px 16px 16px 16px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #818CF8, #6366F1)' : 'var(--surface)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                  color: msg.role === 'user' ? '#FFF' : 'var(--text)',
                  fontSize: 13.5, lineHeight: 1.55,
                }}>
                  {msg.content ? (
                    renderStylishContent(msg.content)
                  ) : (streaming && msg.role === 'assistant' ? (
                    <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#818CF8', animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                  ) : '')}
                </div>

                {msg.role === 'assistant' && msg.content && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 3, paddingLeft: 2 }}>
                    <button onClick={() => copyToClipboard(msg.content)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 10 }}>Copy</button>
                    <button onClick={() => toggleSpeech(msg.id, msg.content)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: speakingId === msg.id ? '#06B6D4' : 'var(--text-dim)', fontSize: 10 }}>
                      {speakingId === msg.id ? 'Stop' : 'Listen'}
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Context Pill Carousel */}
          <div style={{ padding: '0 12px 6px', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {QUICK_ACTIONS.map(qa => (
              <button
                key={qa.label}
                onClick={() => sendMessage(undefined, qa.prompt)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px',
                  borderRadius: 99, background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0
                }}
              >
                <qa.icon size={10} color="#818CF8" /> {qa.label}
              </button>
            ))}
          </div>

          {/* Glass Mobile Input Bar */}
          <div style={{
            padding: '8px 12px 12px', borderTop: '1px solid var(--border)',
            background: 'rgba(10,11,13,0.95)', backdropFilter: 'blur(20px)',
          }}>
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage() } }}
                placeholder="Ask NIRMAAN AI..."
                style={{
                  flex: 1, fontSize: 14, height: 42, padding: '0 38px 0 12px',
                  borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)'
                }}
              />

              <button
                type="button"
                onClick={toggleListening}
                style={{
                  position: 'absolute', right: 48,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: isListening ? 'var(--danger)' : 'var(--text-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {isListening ? <MicOff size={15} /> : <Mic size={15} />}
              </button>

              <button
                type="submit"
                disabled={streaming || !input.trim()}
                style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: input.trim() ? '#818CF8' : 'var(--surface-2)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {streaming ? (
                  <Loader2 size={15} color="var(--text-dim)" className="animate-spin" />
                ) : (
                  <Send size={15} color={input.trim() ? '#0A0B0D' : 'var(--text-dim)'} />
                )}
              </button>
            </form>
          </div>

        </div>

      </div>
    </AppShell>
  )
}

function parseBoldText(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
}
