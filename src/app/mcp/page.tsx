'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import AppShell from '@/components/layout/AppShell'
import {
  Copy, Check, Plus, Trash2, Loader2, Key, Globe, Zap, Terminal,
  Shield, Link2, ChevronRight, Sparkles, Activity, RefreshCw,
  Code2, Database, Bot, FileText, Bell, Target, BookOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ApiKey } from '@/lib/supabase/database.types'

const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL ?? 'https://me-eight-dun.vercel.app'

const CLIENT_CONFIGS = [
  {
    name: 'Claude Desktop',
    icon: '🧠',
    color: '#FF8A3D',
    file: '~/Library/Application Support/Claude/claude_desktop_config.json',
    config: (url: string, key: string) => JSON.stringify({
      mcpServers: {
        helpo: { command: 'npx', args: ['-y', 'mcp-remote', `${url}/api/mcp`, '--header', `Authorization: Bearer ${key}`] }
      }
    }, null, 2),
  },
  {
    name: 'Cursor / Windsurf',
    icon: '💻',
    color: '#3B82F6',
    file: '.cursor/mcp.json or .windsurf/mcp.json',
    config: (url: string, key: string) => JSON.stringify({
      mcpServers: {
        helpo: { url: `${url}/api/mcp`, headers: { Authorization: `Bearer ${key}` } }
      }
    }, null, 2),
  },
  {
    name: 'ChatGPT Custom GPT',
    icon: '💬',
    color: '#10B981',
    file: 'ChatGPT → Create GPT → Actions → Import URL',
    config: (url: string, key: string) => `OpenAPI Schema URL: ${url}/api/mcp/openapi.json\nAuthentication: API Key (Bearer Token)\nToken Value: ${key}`,
  },
  {
    name: 'Grok / xAI Tools',
    icon: '🚀',
    color: '#7C3AED',
    file: 'xAI Grok → Custom Tools / System Prompt',
    config: (url: string, key: string) => `Endpoint: ${url}/api/mcp\nHeader: Authorization: Bearer ${key}\nFormat: JSON-RPC 2.0 (tools/list & tools/call)\nOpenAPI Schema: ${url}/api/mcp/openapi.json`,
  },
  {
    name: 'Antigravity IDE',
    icon: '⚡',
    color: '#8B5CF6',
    file: 'C:\\Users\\<you>\\.gemini\\config\\mcp.json',
    config: (url: string, key: string) => JSON.stringify({
      servers: [{
        name: 'helpo',
        url: `${url}/api/mcp`,
        headers: { Authorization: `Bearer ${key}` }
      }]
    }, null, 2),
  },
]

const MCP_TOOL_GROUPS = [
  {
    icon: Database,
    color: '#7C3AED',
    label: 'Core Data',
    tools: [
      { name: 'get_life_dashboard', desc: 'Full overview: life score, streak, tasks, todos, water, goals' },
      { name: 'get_user_analytics', desc: 'Deep telemetry: completion rates, velocity, journal counts' },
      { name: 'get_profile / update_profile', desc: 'Manage identity, display name, bio, timezone' },
    ],
  },
  {
    icon: Target,
    color: '#3B82F6',
    label: 'Tasks & Todos',
    tools: [
      { name: 'list_tasks', desc: 'Fetch all tasks with filters: status, priority, category, due date' },
      { name: 'create_task', desc: 'Create task with title, description, priority, due date, time, category' },
      { name: 'update_task', desc: 'Update status, priority, due date, title of any task by ID' },
      { name: 'delete_task', desc: 'Delete task permanently by ID' },
      { name: 'list_todos / create_todo / update_todo / delete_todo', desc: 'Full daily checklist CRUD & batch imports' },
    ],
  },
  {
    icon: Zap,
    color: '#FBBF24',
    label: 'Habits & Goals',
    tools: [
      { name: 'list_habits / create_habit', desc: 'Track habits, frequency, target times' },
      { name: 'log_habit_completion', desc: 'Mark a habit done for a specific date with streak update' },
      { name: 'list_goals / create_goal / update_goal / delete_goal', desc: 'CRUD goals linked to life areas with progress tracking' },
    ],
  },
  {
    icon: FileText,
    color: '#22D3EE',
    label: 'Journal & Notes',
    tools: [
      { name: 'list_journal_entries / create_journal_entry', desc: 'Write entries with mood (1-5), energy level, tags' },
      { name: 'update_journal_entry / delete_journal_entry', desc: 'Edit or delete any past journal entry' },
      { name: 'list_notes / create_note / update_note / delete_note', desc: 'Capture, edit, pin, archive, and search notes' },
    ],
  },
  {
    icon: Bell,
    color: '#FF4F81',
    label: 'Reminders & Life',
    tools: [
      { name: 'list_reminders / create_reminder / update / delete', desc: 'Schedule recurring or one-time push reminders' },
      { name: 'list_life_areas / create_life_area / update_life_area', desc: 'Manage 7 life areas with icons, colors, scores' },
      { name: 'get_today_water_intake / log_water_intake / reset', desc: 'Log water (ml) and reset daily logs' },
    ],
  },
  {
    icon: BookOpen,
    color: '#10B981',
    label: 'Learning',
    tools: [
      { name: 'list_courses / create_course', desc: 'Manage learning hub courses with progress tracking' },
      { name: 'create_lesson / update_lesson_progress', desc: 'Add lessons and track completion per module' },
    ],
  },
  {
    icon: Bot,
    color: '#FF8A3D',
    label: 'Navigation & UI',
    tools: [
      { name: 'navigate_to', desc: 'Navigate the app to any page: /tasks, /habits, /goals, /journal etc.' },
      { name: 'full_data_reset', desc: 'Wipe all user data across all tables (requires confirmation)' },
    ],
  },
]

export default function MCPPage() {
  const { user } = useAuth()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [lastCreatedKey, setLastCreatedKey] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState(0)
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set())
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [expandedGroup, setExpandedGroup] = useState<number | null>(0)

  const loadKeys = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch('/api/keys')
      const data = await res.json()
      if (res.ok && data.keys) setApiKeys(data.keys)
    } catch {}
    setLoading(false)
  }, [user])

  useEffect(() => { loadKeys() }, [loadKeys])

  useEffect(() => {
    // Check MCP server status
    fetch(`${MCP_SERVER_URL}/api/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method: 'ping', id: 1 }) })
      .then(r => setServerStatus(r.ok || r.status === 401 ? 'online' : 'offline'))
      .catch(() => setServerStatus('offline'))
  }, [])

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedItems(prev => new Set([...prev, id]))
    toast.success('Copied!')
    setTimeout(() => setCopiedItems(prev => { const s = new Set(prev); s.delete(id); return s }), 2000)
  }

  async function createKey(e: React.FormEvent) {
    e.preventDefault()
    if (!newKeyName.trim() || !user) return
    setCreating(true)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() })
      })
      const data = await res.json()
      if (!res.ok || !data.success) { toast.error(data.error || 'Failed to create key'); setCreating(false); return }
      toast.success(`Key "${newKeyName}" created! Copy it now — shown only once.`)
      setLastCreatedKey(data.rawKey)
      setNewKeyName('')
      loadKeys()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create key')
    } finally { setCreating(false) }
  }

  async function revokeKey(keyId: string) {
    try {
      const res = await fetch(`/api/keys?id=${keyId}`, { method: 'DELETE' })
      if (res.ok) { setApiKeys(prev => prev.filter(k => k.id !== keyId)); toast.success('Key revoked') }
    } catch { toast.error('Failed to revoke key') }
  }

  const activeKey = lastCreatedKey ?? (apiKeys[0] ? `${apiKeys[0].key_prefix}${'•'.repeat(20)}` : 'YOUR_HELPO_KEY')
  const clientConfig = CLIENT_CONFIGS[selectedClient].config(MCP_SERVER_URL, lastCreatedKey ?? 'YOUR_HELPO_KEY')

  return (
    <AppShell>
      <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.1))', border: '1px solid rgba(124,58,237,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Terminal size={22} color="#8B5CF6" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', margin: 0 }}>MCP Connect</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: serverStatus === 'online' ? '#10B981' : serverStatus === 'offline' ? '#EF4444' : '#FBBF24', animation: serverStatus === 'online' ? 'pulse 2s infinite' : undefined }} />
                <span style={{ fontSize: 12, color: serverStatus === 'online' ? '#10B981' : serverStatus === 'offline' ? '#EF4444' : '#FBBF24', fontWeight: 600 }}>
                  MCP Server {serverStatus === 'checking' ? 'Checking...' : serverStatus === 'online' ? 'Online' : 'Offline'}
                </span>
                <button onClick={() => { setServerStatus('checking'); fetch(`${MCP_SERVER_URL}/api/mcp`).then(() => setServerStatus('online')).catch(() => setServerStatus('offline')) }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}>
                  <RefreshCw size={12} color="var(--text-dim)" />
                </button>
              </div>
            </div>
          </div>
          <div className="badge badge-purple" style={{ padding: '6px 14px', fontSize: 12 }}>
            <Sparkles size={12} /> {MCP_TOOL_GROUPS.reduce((s, g) => s + g.tools.length, 0)}+ AI Tools Available
          </div>
        </div>

        {/* Intro banner */}
        <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(99,102,241,0.06))', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Globe size={20} color="#8B5CF6" />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px' }}>Connect any AI client to Helpo</h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Helpo exposes all your data and actions as MCP tools — let Claude, Cursor, ChatGPT, or Grok manage your tasks, journal, habits, and goals directly from chat using natural language.
            </p>
          </div>
        </div>

        {/* 2-col layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>

          {/* Server URL */}
          <div className="card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Link2 size={15} color="#22D3EE" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>MCP Server URL</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={MCP_SERVER_URL} readOnly style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: '#22D3EE' }} />
              <button onClick={() => copy(MCP_SERVER_URL, 'url')} className="btn btn-secondary" style={{ height: 42, padding: '0 12px', flexShrink: 0 }}>
                {copiedItems.has('url') ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Active key preview */}
          <div className="card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Key size={15} color="#7C3AED" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active API Key</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={activeKey} readOnly style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: lastCreatedKey ? '#10B981' : 'var(--text-dim)' }} />
              {lastCreatedKey && (
                <button onClick={() => copy(lastCreatedKey, 'key')} className="btn btn-primary" style={{ height: 42, padding: '0 12px', flexShrink: 0 }}>
                  {copiedItems.has('key') ? <Check size={14} /> : <Copy size={14} />}
                </button>
              )}
            </div>
            {lastCreatedKey && (
              <p style={{ fontSize: 10, color: '#FBBF24', marginTop: 8, fontWeight: 700 }}>⚠️ Copy now — this key is only shown once!</p>
            )}
          </div>
        </div>

        {/* API Keys Management */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Shield size={16} color="#7C3AED" />
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Personal API Keys</h3>
          </div>

          {/* Create key form */}
          <form onSubmit={createKey} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input
              placeholder="Key name (e.g. Claude Desktop, Cursor IDE)"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              style={{ flex: 1, fontSize: 13 }}
            />
            <button type="submit" disabled={creating || !newKeyName.trim()} className="btn btn-primary" style={{ height: 44, padding: '0 18px', flexShrink: 0, fontSize: 13 }}>
              {creating ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} /> Generate Key</>}
            </button>
          </form>

          {/* Key list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading
              ? [1, 2].map(i => <div key={i} className="skeleton" style={{ height: 54, borderRadius: 12 }} />)
              : apiKeys.length === 0
              ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-dim)' }}>
                  <Key size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p style={{ fontSize: 13 }}>No API keys yet. Create one above to connect AI clients.</p>
                </div>
              )
              : apiKeys.map(key => (
                <div key={key.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Key size={14} color="#8B5CF6" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{key.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'monospace', margin: '2px 0 0' }}>{key.key_prefix}{'•'.repeat(24)}</p>
                  </div>
                  <button onClick={() => revokeKey(key.id)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Trash2 size={13} color="#EF4444" />
                    <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>Revoke</span>
                  </button>
                </div>
              ))
            }
          </div>
        </div>

        {/* Client Config */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Code2 size={16} color="#22D3EE" />
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Client Configuration</h3>
          </div>

          {/* Client tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
            {CLIENT_CONFIGS.map((c, i) => (
              <button
                key={i}
                onClick={() => setSelectedClient(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
                  background: selectedClient === i ? `${c.color}20` : 'var(--surface-2)',
                  border: `1px solid ${selectedClient === i ? `${c.color}60` : 'var(--border)'}`,
                  color: selectedClient === i ? c.color : 'var(--text-muted)',
                  transition: 'all 150ms ease',
                }}
              >
                <span style={{ fontSize: 14 }}>{c.icon}</span> {c.name}
              </button>
            ))}
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10 }}>
            File: <code style={{ fontFamily: 'monospace', color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4 }}>{CLIENT_CONFIGS[selectedClient].file}</code>
          </p>

          <div style={{ position: 'relative' }}>
            <pre style={{ background: '#070E24', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: '16px', fontSize: 12, fontFamily: 'monospace', overflowX: 'auto', color: '#22D3EE', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
              {clientConfig}
            </pre>
            <button
              onClick={() => copy(clientConfig, 'config')}
              style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              {copiedItems.has('config') ? <Check size={12} color="#10B981" /> : <Copy size={12} color="#8B5CF6" />}
              <span style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 600 }}>Copy</span>
            </button>
          </div>
        </div>

        {/* MCP Tools by category */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} color="#7C3AED" />
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Available MCP Tools</h3>
            </div>
            <span className="badge badge-purple">{MCP_TOOL_GROUPS.reduce((s, g) => s + g.tools.length, 0)} tools</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MCP_TOOL_GROUPS.map((group, gi) => (
              <div key={group.label} style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <button
                  onClick={() => setExpandedGroup(expandedGroup === gi ? null : gi)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--surface-2)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${group.color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <group.icon size={14} color={group.color} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', flex: 1 }}>{group.label}</span>
                  <span className="badge badge-muted" style={{ fontSize: 10 }}>{group.tools.length} tools</span>
                  <ChevronRight size={14} color="var(--text-dim)" style={{ transform: expandedGroup === gi ? 'rotate(90deg)' : 'none', transition: 'transform 200ms ease' }} />
                </button>
                {expandedGroup === gi && (
                  <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--surface)' }}>
                    {group.tools.map(tool => (
                      <div key={tool.name} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, alignItems: 'flex-start', border: '1px solid var(--border)' }}>
                        <code style={{ fontSize: 11, color: group.color, fontFamily: 'monospace', flexShrink: 0, paddingTop: 1, fontWeight: 700 }}>{tool.name}</code>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>{tool.desc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick start */}
        <div style={{ padding: '18px 20px', background: 'rgba(10,14,36,0.6)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', margin: '0 0 10px' }}>Quick Start in 3 Steps</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { n: '1', text: 'Generate an API key above', color: '#7C3AED' },
              { n: '2', text: 'Copy the config for your AI client', color: '#3B82F6' },
              { n: '3', text: 'Ask your AI: "Create a task to go to the market at 3 PM"', color: '#10B981' },
            ].map(step => (
              <div key={step.n} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${step.color}20`, border: `1px solid ${step.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: step.color }}>{step.n}</span>
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{step.text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  )
}
