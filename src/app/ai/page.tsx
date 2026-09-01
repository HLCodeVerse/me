'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import {
  Send, Plus, Loader2, Brain, Zap, Calendar, Sparkles, ChevronDown, Check,
  Copy, Mic, MicOff, Trash2, MessageSquare, X
} from 'lucide-react'
import { toast } from 'sonner'
import type { AIConversation, AIMessage } from '@/lib/supabase/database.types'

const GROK_MODELS = [
  { id: 'x-ai/grok-2-1212',           label: 'Grok 2 (xAI)',       tag: 'xAI Premier' },
  { id: 'x-ai/grok-beta',             label: 'Grok Beta (xAI)',    tag: 'xAI Fast' },
  { id: 'x-ai/grok-2-vision-1212',    label: 'Grok Vision (xAI)',  tag: 'xAI Vision' },
]

const FREE_MODELS = [
  ...GROK_MODELS,
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
  delete_task: '🗑️ Task deleted',
  convert_task_to_todo: '🔄 Converted task to todo',
  convert_all_tasks_to_todos: '✨ All tasks converted to todos',
  delete_all_tasks: '🗑️ All tasks deleted',
  create_journal_entry: '📓 Journal entry created',
  create_goal: '🎯 Goal added',
  get_dashboard_summary: '📊 Dashboard loaded',
  plan_my_day: '📅 Day plan loaded',
}

import FormattedAIResponse from '@/components/common/FormattedAIResponse'

// Typewriter Response Component for Smooth AI Typing Animation Effect
function TypewriterResponse({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState('')

  useEffect(() => {
    if (!text) {
      setDisplayedText('')
      return
    }

    // Fast typewriter typing animation
    const i = displayedText.length
    if (i >= text.length) {
      setDisplayedText(text)
      return
    }

    const timer = setTimeout(() => {
      setDisplayedText(text.slice(0, i + 3))
    }, 15)

    return () => clearTimeout(timer)
  }, [text, displayedText])

  return (
    <div>
      <FormattedAIResponse content={displayedText} />
      {displayedText.length < text.length && (
        <span style={{ color: '#F59E0B', fontWeight: 800 }} className="animate-pulse">|</span>
      )}
    </div>
  )
}

function renderStylishContent(content: string) {
  return <FormattedAIResponse content={content} />
}


export default function AIPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [conversations, setConversations] = useState<AIConversation[]>([])
  const [activeConv, setActiveConv] = useState<AIConversation | null>(null)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [isExecutingAction, setIsExecutingAction] = useState(false)
  const [selectedModel, setSelectedModel] = useState(FREE_MODELS[0].id)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [showMobileHistory, setShowMobileHistory] = useState(false)

  const [pendingActions, setPendingActions] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming, isExecutingAction])

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

  async function sendMessage(e?: React.FormEvent, overrideContent?: string) {
    e?.preventDefault()
    const content = overrideContent ?? input.trim()
    if (!content || !user) return
    setInput('')
    setStreaming(true)
    setIsExecutingAction(false)
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
      const customGrokKey = typeof window !== 'undefined' ? localStorage.getItem('nirmaan_grok_key') : null
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id || '',
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          model: selectedModel,
          conversationId: conv.id,
          enableTools: true,
          userId: user?.id,
          grokApiKey: customGrokKey,
        }),
      })

      if (!res.ok) throw new Error('AI Assistant request failed')

      const actionsHeader = res.headers.get('X-Actions')
      if (actionsHeader) {
        setIsExecutingAction(true)
        const actionNames = actionsHeader.split(',').map(a => a.trim())
        const labels = actionNames.map(a => ACTION_LABELS[a] ?? a).filter(Boolean)
        setPendingActions(labels)
        labels.forEach(label => toast.success(label, { icon: '⚡' }))
        setTimeout(() => setIsExecutingAction(false), 1200)
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
      setIsExecutingAction(false)
      setPendingActions([])
    }
  }

  const allModels = [...FREE_MODELS, ...PAID_MODELS]
  const currentModel = allModels.find(m => m.id === selectedModel) ?? FREE_MODELS[0]

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
              <MessageSquare size={18} color="#F59E0B" />
            </button>
            <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>NIRMAAN AI Chat OS</h1>
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* Model Selector Pill */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowModelPicker(p => !p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
                  borderRadius: 99, background: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  color: '#F59E0B',
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
                          background: selectedModel === m.id ? 'rgba(245,158,11,0.15)' : 'transparent',
                          color: selectedModel === m.id ? '#F59E0B' : 'var(--text)', fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        {m.label}
                        {selectedModel === m.id && <Check size={12} color="#F59E0B" />}
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
                background: 'linear-gradient(135deg, #F59E0B, #EAB308)', border: 'none',
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
                      background: activeConv?.id === conv.id ? 'rgba(245,158,11,0.15)' : 'var(--surface-2)',
                      border: `1px solid ${activeConv?.id === conv.id ? '#F59E0B' : 'var(--border)'}`,
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
                  background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px',
                }}>
                  <Brain size={26} color="#F59E0B" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, color: '#FFF' }}>NIRMAAN AI Assistant</h3>
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
                      <qa.icon size={14} color="#F59E0B" />
                      <span style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: 600 }}>{qa.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => {
              const isLastAssistant = msg.role === 'assistant' && idx === messages.length - 1

              return (
                <div key={msg.id} style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '88%', padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '16px 16px 2px 16px' : '2px 16px 16px 16px',
                    background: msg.role === 'user' ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'var(--surface)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                    color: msg.role === 'user' ? '#0A0B0D' : 'var(--text)',
                    fontSize: 13.5, lineHeight: 1.55, fontWeight: msg.role === 'user' ? 700 : 400,
                  }}>
                    {msg.content ? (
                      isLastAssistant ? (
                        <TypewriterResponse text={msg.content} />
                      ) : (
                        renderStylishContent(msg.content)
                      )
                    ) : null}
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
              )
            })}

            {/* 1. THINKING ANIMATION CARD */}
            {streaming && messages[messages.length - 1]?.content === '' && !isExecutingAction && (
              <div
                className="animate-fade-in"
                style={{
                  maxWidth: 280,
                  padding: '10px 14px',
                  borderRadius: '12px 12px 12px 2px',
                  background: 'var(--surface)',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: '0 4px 16px rgba(6, 182, 212, 0.2)',
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'rgba(6, 182, 212, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Brain size={18} color="#06B6D4" className="animate-pulse" />
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#06B6D4', margin: 0 }}>
                    AI Thinking...
                  </p>
                  <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: '#06B6D4',
                          animation: `pulse 0.8s ease-in-out ${i * 0.15}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. WORKING ACTION EXECUTION ANIMATION CARD */}
            {isExecutingAction && (
              <div
                className="animate-fade-in"
                style={{
                  maxWidth: 320,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(239, 68, 68, 0.1))',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)',
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'var(--gold-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                  }}
                >
                  <Zap size={18} color="#0A0B0D" className="animate-spin" />
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 800, color: '#F59E0B', margin: 0 }}>
                    ⚡ Executing AI Action...
                  </p>
                  <p style={{ fontSize: 10.5, color: '#E5E7EB', margin: '2px 0 0' }}>
                    Updating database records & syncing tools
                  </p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Action Notifications Pill Row */}
          {pendingActions.length > 0 && (
            <div style={{ padding: '0 12px 6px', display: 'flex', gap: 6 }}>
              {pendingActions.map((act, i) => (
                <span key={i} className="badge badge-warning" style={{ fontSize: 11 }}>{act}</span>
              ))}
            </div>
          )}

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
                <qa.icon size={10} color="#F59E0B" /> {qa.label}
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
                  background: input.trim() ? '#F59E0B' : 'var(--surface-2)',
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
