'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import {
  Send, Plus, Loader2, Brain, Zap, Calendar, Sparkles, ChevronDown, Check, Wrench,
  Copy, Volume2, VolumeX, Mic, MicOff, RotateCcw, Download, Trash2, Edit2, Search,
  PanelLeftClose, PanelLeft, Paperclip, MessageSquare, ShieldCheck, FileText, CheckSquare
} from 'lucide-react'
import { toast } from 'sonner'
import type { AIConversation, AIMessage } from '@/lib/supabase/database.types'

const FREE_MODELS = [
  { id: 'openai/gpt-3.5-turbo:free',           label: 'GPT-3.5 Turbo',     tag: 'Free / GPT' },
  { id: 'openai/gpt-4o-mini:free',              label: 'GPT-4o Mini',       tag: 'Free / GPT' },
  { id: 'liquid/lfm-2.5-embedding-350m:free',   label: 'Liquid LFM 2.5',    tag: 'Free' },
  { id: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3',       tag: 'Free' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B',   tag: 'Free' },
  { id: 'mistralai/mistral-7b-instruct:free',  label: 'Mistral 7B',        tag: 'Free' },
]

const PAID_MODELS = [
  { id: 'openai/gpt-4o',                      label: 'GPT-4o',           tag: 'GPT Premier' },
  { id: 'anthropic/claude-3.5-sonnet',        label: 'Claude 3.5 Sonnet',tag: 'Smart' },
  { id: 'meta-llama/llama-3.1-70b-instruct',  label: 'Llama 3.1 70B',   tag: 'Open' },
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
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [editingConvId, setEditingConvId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

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
      .limit(30)
    setConversations(data ?? [])
    if (data && data.length > 0 && !activeConv) setActiveConv(data[0])
  }, [user, supabase, activeConv])

  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase.from('ai_messages').select('*').eq('conversation_id', convId).order('created_at')
    setMessages(data ?? [])
  }, [supabase])

  useEffect(() => { loadConversations() }, [loadConversations])
  useEffect(() => { if (activeConv) loadMessages(activeConv.id) }, [activeConv, loadMessages])

  const createNewConversation = useCallback(async (firstMessage?: string) => {
    if (!user) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('ai_conversations') as any).insert({
      user_id: user.id,
      title: firstMessage ? firstMessage.slice(0, 45) + (firstMessage.length > 45 ? '…' : '') : 'New Conversation',
      model: selectedModel,
    }).select().single()
    if (data) {
      setConversations(prev => [data, ...prev])
      setActiveConv(data)
      setMessages([])
    }
    return data
  }, [user, supabase, selectedModel])

  // Keyboard shortcut Ctrl+N / Cmd+K for new chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        createNewConversation()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [createNewConversation])

  async function deleteConversation(convId: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    const { error } = await supabase.from('ai_conversations').delete().eq('id', convId)
    if (error) {
      toast.error('Failed to delete conversation')
      return
    }
    setConversations(prev => prev.filter(c => c.id !== convId))
    if (activeConv?.id === convId) {
      const remaining = conversations.filter(c => c.id !== convId)
      setActiveConv(remaining[0] ?? null)
      setMessages([])
    }
    toast.success('Conversation deleted')
  }

  async function saveRenamedTitle(convId: string) {
    if (!editingTitle.trim()) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('ai_conversations') as any).update({ title: editingTitle.trim() }).eq('id', convId)
    if (error) {
      toast.error('Failed to rename')
      return
    }
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, title: editingTitle.trim() } : c))
    if (activeConv?.id === convId) {
      setActiveConv(prev => prev ? { ...prev, title: editingTitle.trim() } : null)
    }
    setEditingConvId(null)
    toast.success('Conversation renamed')
  }

  const downloadArtifact = (title: string, body: string, type: string) => {
    const ext = type === 'code' ? 'txt' : 'md'
    const blob = new Blob([body], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Downloaded ${title}`)
  }

  const saveArtifactToNotes = async (title: string, body: string) => {
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('notes') as any).insert({
      user_id: user.id,
      title: title || 'AI Artifact',
      content: body,
      tags: ['ai-artifact']
    })
    if (error) {
      toast.error('Failed to save to Notes')
    } else {
      toast.success('Saved to Notes! 📝')
    }
  }

  const saveArtifactToTask = async (title: string, body: string) => {
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('tasks') as any).insert({
      user_id: user.id,
      title: title || 'AI Task Artifact',
      description: body.slice(0, 500),
      priority: 2,
      status: 'todo'
    })
    if (error) {
      toast.error('Failed to save to Tasks')
    } else {
      toast.success('Saved to Tasks! ✅')
    }
  }

  const exportConversation = () => {
    if (!activeConv || messages.length === 0) {
      toast.error('No messages to export')
      return
    }
    const content = `# ${activeConv.title}\n*Exported from NIRMAAN AI OS on ${new Date().toLocaleDateString()}*\n\n` +
      messages.map(m => `### ${m.role === 'user' ? 'User' : 'NIRMAAN AI'}\n${m.content}\n`).join('\n---\n\n')
    
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeConv.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Conversation exported as Markdown file')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Message copied to clipboard!')
  }

  const toggleSpeech = (msgId: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Text-to-speech not supported in browser')
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
      toast.error('Voice recognition not supported in browser')
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
      recognition.onerror = () => {
        setIsListening(false)
      }
      recognition.onend = () => {
        setIsListening(false)
      }
      recognition.start()
    } catch {
      setIsListening(false)
      toast.error('Could not start voice recognition')
    }
  }

  const renderArtifactContent = (content: string) => {
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

    if (parts.length === 0 || (parts.length === 1 && parts[0].type === 'text')) {
      return <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>
    }

    return (
      <div>
        {parts.map((p, idx) => {
          if (p.type === 'text') {
            return <div key={idx} style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>{p.text}</div>
          }
          return (
            <div key={idx} style={{
              margin: '12px 0', padding: '14px', borderRadius: 'var(--radius)',
              background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.35)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={14} color="#A78BFA" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#FFF' }}>{p.title || 'AI Artifact'}</span>
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'rgba(139,92,246,0.3)', color: '#A78BFA', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {p.artifactType || 'Document'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button onClick={() => copyToClipboard(p.body || '')} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }} title="Copy Artifact">
                    <Copy size={11} /> Copy
                  </button>
                  <button onClick={() => saveArtifactToNotes(p.title || '', p.body || '')} style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', color: 'var(--growth)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }} title="Save to Notes">
                    <FileText size={11} /> Save to Notes
                  </button>
                  <button onClick={() => saveArtifactToTask(p.title || '', p.body || '')} style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', color: '#06B6D4', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }} title="Create Task">
                    <CheckSquare size={11} /> Create Task
                  </button>
                  <button onClick={() => downloadArtifact(p.title || '', p.body || '', p.artifactType || '')} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }} title="Download File">
                    <Download size={11} /> Download
                  </button>
                </div>
              </div>
              <pre style={{
                background: 'rgba(10,11,13,0.85)', padding: '12px 14px', borderRadius: 'var(--radius-sm)',
                fontSize: 12, fontFamily: 'Consolas, Monaco, monospace', overflowX: 'auto', color: '#E2E8F0', margin: 0,
                maxHeight: 320, overflowY: 'auto', lineHeight: 1.6, border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {p.body}
              </pre>
            </div>
          )
        })}
      </div>
    )
  }

  async function attachDashboardContext() {
    if (!user) return
    toast.info('Fetching dashboard context...')
    const [tasks, todos, profile] = await Promise.all([
      supabase.from('tasks').select('title, status, priority').eq('user_id', user.id).neq('status', 'done').limit(5),
      supabase.from('todos').select('title').eq('user_id', user.id).eq('is_done', false).limit(5),
      supabase.from('profiles').select('current_streak, life_score').eq('id', user.id).maybeSingle()
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileData = profile.data as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openTasks = (tasks.data as any[]) ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openTodos = (todos.data as any[]) ?? []
    const contextStr = `[DASHBOARD CONTEXT]:\n- Streak: ${profileData?.current_streak ?? 0} days | Score: ${profileData?.life_score ?? 0}\n- Open Tasks: ${openTasks.map(t => t.title).join(', ') || 'None'}\n- Open Todos: ${openTodos.map(t => t.title).join(', ') || 'None'}\n\n`
    setInput(prev => contextStr + prev)
    toast.success('Attached current status!')
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

      if (!res.ok) {
        let errMsg = 'AI request failed'
        try {
          const errData = await res.json()
          errMsg = errData.error || errMsg
        } catch {}
        if (res.status === 401) errMsg = 'Please log in to use AI Chat.'
        if (res.status === 503) errMsg = 'No OpenRouter API key configured. Set OPENROUTER_API_KEY in settings.'
        throw new Error(errMsg)
      }

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
      toast.error(msg, { duration: 6000 })
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setIsSidebarOpen(p => !p)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
              title={isSidebarOpen ? 'Hide Conversations' : 'Show Conversations'}
            >
              {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Brain size={16} color="#FFF" />
              </div>
              <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>NIRMAAN AI</h1>
            </div>
            {activeConv && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                {editingConvId === activeConv.id ? (
                  <input
                    value={editingTitle}
                    onChange={e => setEditingTitle(e.target.value)}
                    onBlur={() => saveRenamedTitle(activeConv.id)}
                    onKeyDown={e => { if (e.key === 'Enter') saveRenamedTitle(activeConv.id) }}
                    autoFocus
                    style={{ fontSize: 12, padding: '1px 4px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4 }}
                  />
                ) : (
                  <>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{activeConv.title}</span>
                    <button onClick={() => { setEditingConvId(activeConv.id); setEditingTitle(activeConv.title) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                      <Edit2 size={10} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Actions Toggle */}
            <button
              onClick={() => setEnableTools(p => !p)}
              title="AI App Actions (Create tasks, todos, goals)"
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

            {/* Model Selector */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowModelPicker(p => !p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)',
                  border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                <ShieldCheck size={13} color="#06B6D4" />
                <span>{currentModel.label}</span>
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(6,182,212,0.15)', color: '#06B6D4', fontWeight: 700 }}>
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
                    borderRadius: 'var(--radius)', padding: 8, minWidth: 240,
                    boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(16px)',
                  }}>
                    <p style={{ fontSize: 10, color: 'var(--text-dim)', padding: '4px 8px 6px', fontWeight: 700, letterSpacing: '0.05em' }}>FREE MODELS (OPENROUTER / GPT)</p>
                    {FREE_MODELS.map(m => (
                      <ModelOption key={m.id} model={m} selected={selectedModel === m.id} onSelect={(id) => { setSelectedModel(id); setShowModelPicker(false) }} color="var(--growth)" />
                    ))}
                    <div className="divider" style={{ margin: '6px 0' }} />
                    <p style={{ fontSize: 10, color: 'var(--text-dim)', padding: '4px 8px 6px', fontWeight: 700, letterSpacing: '0.05em' }}>PREMIER MODELS</p>
                    {PAID_MODELS.map(m => (
                      <ModelOption key={m.id} model={m} selected={selectedModel === m.id} onSelect={(id) => { setSelectedModel(id); setShowModelPicker(false) }} color="#8B5CF6" />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Export Markdown */}
            {activeConv && messages.length > 0 && (
              <button
                onClick={exportConversation}
                title="Export Chat as Markdown"
                style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <Download size={14} />
              </button>
            )}

            {/* New Chat */}
            <button
              onClick={() => { setActiveConv(null); setMessages([]) }}
              title="New Chat (Ctrl+K)"
              style={{ height: 34, padding: '0 12px', borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.2))', border: '1px solid rgba(139,92,246,0.4)', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: '#A78BFA', fontWeight: 700, fontSize: 12 }}
            >
              <Plus size={14} /> New Chat
            </button>
          </div>
        </div>
      }
      noPadding
    >
      <div style={{ display: 'flex', height: 'calc(100dvh - 132px)', overflow: 'hidden' }}>
        
        {/* App-like Collapsible Sidebar */}
        {isSidebarOpen && (
          <div style={{
            width: 260, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', height: '100%', padding: '12px 10px'
          }}>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                style={{ paddingLeft: 30, height: 32, fontSize: 12, borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {filteredConversations.length === 0 ? (
                <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
                  No chats found
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConv(conv)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                      background: activeConv?.id === conv.id ? 'rgba(139,92,246,0.15)' : 'transparent',
                      border: activeConv?.id === conv.id ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                      cursor: 'pointer', color: activeConv?.id === conv.id ? '#FFF' : 'var(--text-muted)',
                      fontSize: 13, transition: 'all 150ms'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      <MessageSquare size={14} color={activeConv?.id === conv.id ? '#A78BFA' : 'var(--text-dim)'} style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: activeConv?.id === conv.id ? 600 : 400 }}>
                        {conv.title}
                      </span>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      title="Delete"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 2, display: 'flex', alignItems: 'center' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Main Chat Interface */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', background: 'var(--background)' }}>
          
          {/* Chat Stream / Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', margin: 'auto', maxWidth: 440 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.2))',
                  border: '1px solid rgba(139,92,246,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px', boxShadow: '0 0 24px rgba(139,92,246,0.2)'
                }}>
                  <Brain size={30} color="#A78BFA" />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>How can NIRMAAN assist you today?</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                  Powered by OpenRouter SDK & Liquid LFM. I can directly create tasks, set goals, manage todos, and journal inside your OS.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {QUICK_ACTIONS.map(qa => (
                    <button
                      key={qa.label}
                      onClick={() => sendMessage(undefined, qa.prompt)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'left',
                        transition: 'border 150ms, background 150ms'
                      }}
                    >
                      <qa.icon size={16} color="#A78BFA" />
                      <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{qa.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: 4, paddingRight: 4 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: msg.role === 'user' ? 'var(--growth)' : 'rgba(139,92,246,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {msg.role === 'user' ? (
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#0A0B0D' }}>U</span>
                    ) : (
                      <Brain size={10} color="#A78BFA" />
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700 }}>
                    {msg.role === 'user' ? 'You' : 'NIRMAAN AI'}
                  </span>
                </div>

                <div style={{
                  maxWidth: '85%', padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #34D399, #059669)' : 'var(--surface)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                  color: msg.role === 'user' ? '#042F2E' : 'var(--text)',
                  fontSize: 14, lineHeight: 1.6, position: 'relative'
                }}>
                  {msg.content ? (
                    renderArtifactContent(msg.content)
                  ) : (streaming && msg.role === 'assistant' ? (
                    <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#A78BFA', animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                  ) : '')}
                </div>

                {/* Message Quick Controls */}
                {msg.role === 'assistant' && msg.content && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, paddingLeft: 4 }}>
                    <button
                      onClick={() => copyToClipboard(msg.content)}
                      title="Copy Message"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '2px 4px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}
                    >
                      <Copy size={11} /> Copy
                    </button>
                    <button
                      onClick={() => toggleSpeech(msg.id, msg.content)}
                      title="Voice Speech"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: speakingId === msg.id ? '#06B6D4' : 'var(--text-dim)', padding: '2px 4px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}
                    >
                      {speakingId === msg.id ? <VolumeX size={11} /> : <Volume2 size={11} />}
                      {speakingId === msg.id ? 'Stop' : 'Listen'}
                    </button>
                    {messages[messages.length - 1]?.id === msg.id && (
                      <button
                        onClick={regenerateLastMessage}
                        title="Regenerate Response"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '2px 4px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}
                      >
                        <RotateCcw size={11} /> Regenerate
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {pendingActions.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {pendingActions.map((action, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                    background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
                    borderRadius: 99, fontSize: 11, color: 'var(--growth)', fontWeight: 700,
                  }}>
                    <Check size={10} /> {action}
                  </div>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Context Pill Carousel above Input */}
          <div style={{ padding: '0 16px 8px', display: 'flex', gap: 8, overflowX: 'auto' }}>
            <button
              onClick={attachDashboardContext}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                borderRadius: 99, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)',
                color: '#06B6D4', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0
              }}
            >
              <Paperclip size={11} /> Attach My OS Data
            </button>
            {QUICK_ACTIONS.map(qa => (
              <button
                key={qa.label}
                onClick={() => sendMessage(undefined, qa.prompt)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                  borderRadius: 99, background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0
                }}
              >
                <qa.icon size={11} color="#A78BFA" /> {qa.label}
              </button>
            ))}
          </div>

          {/* App-like Floating Input Dock */}
          <div style={{
            padding: '10px 16px 14px', borderTop: '1px solid var(--border)',
            background: 'rgba(10,11,13,0.92)', backdropFilter: 'blur(16px)'
          }}>
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', position: 'relative' }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder={enableTools ? 'Chat or ask "create task: Review PR"...' : 'Message NIRMAAN AI...'}
                rows={1}
                style={{
                  flex: 1, resize: 'none', maxHeight: 120, overflowY: 'auto',
                  fontSize: 14, lineHeight: 1.5, padding: '10px 42px 10px 14px',
                  borderRadius: 'var(--radius)', background: 'var(--surface)', border: '1px solid var(--border)'
                }}
              />

              {/* Voice STT Button inside Input */}
              <button
                type="button"
                onClick={toggleListening}
                title={isListening ? 'Stop Listening' : 'Voice Input'}
                style={{
                  position: 'absolute', right: 54, bottom: 8,
                  background: isListening ? 'rgba(239,68,68,0.2)' : 'none',
                  border: isListening ? '1px solid rgba(239,68,68,0.4)' : 'none',
                  borderRadius: '50%', width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: isListening ? 'var(--danger)' : 'var(--text-dim)',
                }}
              >
                {isListening ? <MicOff size={14} /> : <Mic size={14} />}
              </button>

              <button
                type="submit"
                disabled={streaming || !input.trim()}
                style={{
                  width: 38, height: 38, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                  background: input.trim() ? 'var(--growth)' : 'var(--surface-2)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 200ms ease',
                }}
              >
                {streaming ? (
                  <Loader2 size={15} color="var(--text-dim)" className="animate-spin" />
                ) : (
                  <Send size={15} color={input.trim() ? '#0A0B0D' : 'var(--text-dim)'} />
                )}
              </button>
            </form>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 10, color: 'var(--text-dim)' }}>
              <span>Press Enter to send, Shift+Enter for newline</span>
              <span>⚡ Actions {enableTools ? 'Active' : 'Disabled'}</span>
            </div>
          </div>

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
        padding: '7px 10px', borderRadius: 'var(--radius-sm)',
        background: selected ? `${color}18` : 'transparent',
        border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left'
      }}
    >
      <span style={{ fontSize: 12, color: selected ? color : 'var(--text)', fontWeight: selected ? 700 : 400 }}>{model.label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: `${color}20`, color, fontWeight: 700 }}>{model.tag}</span>
        {selected && <Check size={12} color={color} />}
      </div>
    </button>
  )
}
