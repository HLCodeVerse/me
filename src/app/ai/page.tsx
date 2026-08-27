'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { Send, Plus, Loader2, Brain, Zap, Calendar, Sparkles, ChevronDown, Check, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import type { AIConversation, AIMessage } from '@/lib/supabase/database.types'

const FREE_MODELS = [
  { id: 'google/gemini-2.0-flash-exp:free',           label: 'Gemini 2.0 Flash',  tag: 'Free' },
  { id: 'deepseek/deepseek-chat-v3-0324:free',        label: 'DeepSeek V3',       tag: 'Free' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free',    label: 'Llama 3.3 70B',     tag: 'Free' },
  { id: 'meta-llama/llama-3.1-8b-instruct:free',     label: 'Llama 3.1 8B',      tag: 'Free' },
  { id: 'mistralai/mistral-7b-instruct:free',         label: 'Mistral 7B',        tag: 'Free' },
]

const PAID_MODELS = [
  { id: 'google/gemini-2.0-flash-001',       label: 'Gemini 2.0 Flash', tag: 'Fast'    },
  { id: 'anthropic/claude-3.5-sonnet',        label: 'Claude 3.5 Sonnet',tag: 'Smart'   },
  { id: 'openai/gpt-4o',                      label: 'GPT-4o',           tag: 'Capable' },
  { id: 'meta-llama/llama-3.1-70b-instruct',  label: 'Llama 3.1 70B',   tag: 'Open'    },
]

const QUICK_ACTIONS = [
  { label: 'Plan my day',          icon: Calendar,  prompt: 'Plan my day based on my current tasks and goals. Then use plan_my_day to see what I have open.' },
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversations = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('ai_conversations').select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setConversations(data ?? [])
    if (data && data.length > 0 && !activeConv) setActiveConv(data[0])
  }, [user, supabase, activeConv])

  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase.from('ai_messages').select('*').eq('conversation_id', convId).order('created_at')
    setMessages(data ?? [])
  }, [supabase])

  useEffect(() => { loadConversations() }, [loadConversations])
  useEffect(() => { if (activeConv) loadMessages(activeConv.id) }, [activeConv, loadMessages])

  async function createNewConversation(firstMessage?: string) {
    if (!user) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('ai_conversations') as any).insert({
      user_id: user.id,
      title: firstMessage ? firstMessage.slice(0, 45) + (firstMessage.length > 45 ? '…' : '') : 'New conversation',
      model: selectedModel,
    }).select().single()
    if (data) {
      setConversations(prev => [data, ...prev])
      setActiveConv(data)
      setMessages([])
    }
    return data
  }

  async function sendMessage(e?: React.FormEvent, overrideContent?: string) {
    e?.preventDefault()
    const content = overrideContent ?? input.trim()
    if (!content || !user) return
    setInput('')
    setStreaming(true)
    setPendingActions([])

    // Auto-resize textarea back
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

      if (!res.ok) {
        let errMsg = 'AI request failed'
        try {
          const errData = await res.json()
          errMsg = errData.error || errMsg
        } catch {}
        if (res.status === 401) errMsg = 'Please log in to use AI Chat.'
        if (res.status === 503) errMsg = 'No OpenRouter API key configured. Go to Settings → AI Provider to add your key.'
        throw new Error(errMsg)
      }

      // Check for action headers
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
      const msg = err instanceof Error ? err.message : 'AI request failed. Check your connection.'
      toast.error(msg, { duration: 6000 })
      setMessages(prev => prev.filter(m => m.id !== assistantId))
    } finally {
      setStreaming(false)
      setPendingActions([])
    }
  }

  const allModels = [...FREE_MODELS, ...PAID_MODELS]
  const currentModel = allModels.find(m => m.id === selectedModel) ?? FREE_MODELS[0]

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Brain size={20} color="#A78BFA" />
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>AI Companion</h1>
            {conversations.length > 0 && (
              <span className="badge badge-purple" style={{ fontSize: 10 }}>{conversations.length} chats</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Tools toggle */}
            <button
              onClick={() => setEnableTools(p => !p)}
              title="AI Actions (create tasks, todos etc.)"
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                borderRadius: 'var(--radius-sm)', border: `1px solid ${enableTools ? 'rgba(52,211,153,0.3)' : 'var(--border)'}`,
                background: enableTools ? 'rgba(52,211,153,0.1)' : 'var(--surface-2)',
                cursor: 'pointer', fontSize: 11, fontWeight: 700,
                color: enableTools ? 'var(--growth)' : 'var(--text-dim)',
              }}
            >
              <Wrench size={11} />
              {enableTools ? 'Actions ON' : 'Actions OFF'}
            </button>

            {/* Model picker */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowModelPicker(p => !p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)',
                  border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  color: FREE_MODELS.find(m => m.id === selectedModel) ? 'var(--growth)' : 'var(--text-muted)',
                }}
              >
                <span>{currentModel.label.split(' ').slice(0,2).join(' ')}</span>
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--surface-3)', color: 'var(--text-dim)' }}>
                  {currentModel.tag}
                </span>
                <ChevronDown size={11} />
              </button>

              {showModelPicker && (
                <>
                  <div onClick={() => setShowModelPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
                  <div style={{
                    position: 'absolute', top: '110%', right: 0, zIndex: 60,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', padding: 8, minWidth: 230,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  }}>
                    <p style={{ fontSize: 10, color: 'var(--text-dim)', padding: '4px 8px 8px', fontWeight: 700, letterSpacing: '0.05em' }}>FREE MODELS</p>
                    {FREE_MODELS.map(m => (
                      <ModelOption key={m.id} model={m} selected={selectedModel === m.id} onSelect={(id) => { setSelectedModel(id); setShowModelPicker(false) }} color="var(--growth)" />
                    ))}
                    <div className="divider" style={{ margin: '6px 0' }} />
                    <p style={{ fontSize: 10, color: 'var(--text-dim)', padding: '4px 8px 8px', fontWeight: 700, letterSpacing: '0.05em' }}>PAID MODELS</p>
                    {PAID_MODELS.map(m => (
                      <ModelOption key={m.id} model={m} selected={selectedModel === m.id} onSelect={(id) => { setSelectedModel(id); setShowModelPicker(false) }} color="var(--focus)" />
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => { setActiveConv(null); setMessages([]) }}
              style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Plus size={15} color="#A78BFA" />
            </button>
          </div>
        </div>
      }
      noPadding
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 132px)' }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 0' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 32 }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(52,211,153,0.1))',
                border: '1px solid rgba(167,139,250,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <Brain size={26} color="#A78BFA" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>NIRMAAN AI</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 280, margin: '0 auto 6px', lineHeight: 1.6 }}>
                Chat, plan, create tasks & journal — I can take actions inside your app.
              </p>
              <p style={{ fontSize: 11, color: 'var(--growth)', fontWeight: 600, marginBottom: 24 }}>
                🟢 Using {currentModel.label} · {currentModel.tag}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320, margin: '0 auto' }}>
                {QUICK_ACTIONS.map(qa => (
                  <button
                    key={qa.label}
                    onClick={() => sendMessage(undefined, qa.prompt)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <qa.icon size={15} color="#A78BFA" />
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{qa.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, paddingLeft: 4 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Brain size={9} color="#A78BFA" />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700 }}>NIRMAAN AI</span>
                </div>
              )}
              <div style={{
                maxWidth: '88%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                background: msg.role === 'user' ? 'var(--growth)' : 'var(--surface)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                color: msg.role === 'user' ? '#0A0B0D' : 'var(--text)',
                fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap',
              }}>
                {msg.content || (streaming && msg.role === 'assistant' ? (
                  <div style={{ display: 'flex', gap: 3, padding: '2px 0' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-dim)', animation: `pulse-glow 1s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                ) : '')}
              </div>
            </div>
          ))}

          {/* Pending action chips */}
          {pendingActions.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {pendingActions.map((action, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                  background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)',
                  borderRadius: 99, fontSize: 11, color: 'var(--growth)', fontWeight: 700,
                }}>
                  <Check size={10} /> {action}
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'rgba(10,11,13,0.95)', backdropFilter: 'blur(12px)' }}>
          <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={enableTools ? 'Chat or say "create task: Review PRs"…' : 'Message AI…'}
              rows={1}
              style={{ flex: 1, resize: 'none', maxHeight: 120, overflowY: 'auto', fontSize: 14, lineHeight: 1.5, padding: '9px 12px' }}
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              style={{
                width: 38, height: 38, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                background: input.trim() ? 'var(--growth)' : 'var(--surface-2)',
                border: '1px solid var(--border)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 200ms',
              }}
            >
              {streaming ? <Loader2 size={15} color="var(--text-dim)" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} color={input.trim() ? '#0A0B0D' : 'var(--text-dim)'} />}
            </button>
          </form>
          {enableTools && (
            <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6, textAlign: 'center' }}>
              ⚡ Actions enabled — AI can create tasks, todos, goals & journal entries
            </p>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function ModelOption({ model, selected, onSelect, color }: { model: { id: string; label: string; tag: string }; selected: boolean; onSelect: (id: string) => void; color: string }) {
  return (
    <button
      onClick={() => onSelect(model.id)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', borderRadius: 'var(--radius-sm)',
        background: selected ? `${color}15` : 'transparent',
        border: 'none', cursor: 'pointer', width: '100%',
      }}
    >
      <span style={{ fontSize: 13, color: selected ? color : 'var(--text)', fontWeight: selected ? 700 : 400 }}>{model.label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: `${color}20`, color }}>{model.tag}</span>
        {selected && <Check size={12} color={color} />}
      </div>
    </button>
  )
}
