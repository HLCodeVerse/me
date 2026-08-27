'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { Copy, Check, Plus, Trash2, Loader2, Key } from 'lucide-react'
import { toast } from 'sonner'
import type { ApiKey } from '@/lib/supabase/database.types'

const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL ?? 'https://me-eight-dun.vercel.app'

const CLIENT_CONFIGS = [
  {
    name: 'Grok AI / Custom Tools',
    icon: '🚀',
    file: 'xAI Grok → Custom Tools / System Prompt',
    config: (url: string, key: string) => `Endpoint: ${url}/api/mcp\nHeader: Authorization: Bearer ${key}\nFormat: JSON-RPC 2.0 (tools/list & tools/call)\nOpenAPI Schema: ${url}/api/mcp/openapi.json`,
  },
  {
    name: 'ChatGPT Custom GPT / Actions',
    icon: '💬',
    file: 'ChatGPT → Create GPT → Actions → Import URL',
    config: (url: string, key: string) => `OpenAPI Schema URL: ${url}/api/mcp/openapi.json\nAuthentication: API Key (Bearer Token)\nToken Value: ${key}`,
  },
  {
    name: 'Claude Desktop',
    icon: '🧠',
    file: '~/Library/Application Support/Claude/claude_desktop_config.json',
    config: (url: string, key: string) => JSON.stringify({
      mcpServers: {
        nirmaan: { command: 'npx', args: ['-y', 'mcp-remote', `${url}/api/mcp`, '--header', `Authorization: Bearer ${key}`] }
      }
    }, null, 2),
  },
  {
    name: 'Cursor / Windsurf',
    icon: '💻',
    file: '.cursor/mcp.json or .windsurf/mcp.json',
    config: (url: string, key: string) => JSON.stringify({
      mcpServers: {
        nirmaan: { url: `${url}/api/mcp`, headers: { Authorization: `Bearer ${key}` } }
      }
    }, null, 2),
  },
]

export default function MCPPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [lastCreatedKey, setLastCreatedKey] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState(0)
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set())

  const loadKeys = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('api_keys').select('*').eq('user_id', user.id).is('revoked_at', null).order('created_at', { ascending: false })
    setApiKeys(data ?? [])
    setLoading(false)
  }, [user, supabase])

  useEffect(() => { loadKeys() }, [loadKeys])

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
    const rawKey = `nir_${crypto.randomUUID().replace(/-/g, '')}`
    const prefix = rawKey.slice(0, 12)
    // Hash key (simple — in production use bcrypt via Edge Function)
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey))
    const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('api_keys') as any).insert({
      user_id: user.id,
      name: newKeyName,
      key_hash: hashHex,
      key_prefix: prefix,
      scopes: ['tasks', 'todos', 'journal', 'goals', 'lessons', 'ai'],
    }).select().single()

    if (error) { toast.error('Failed to create key'); setCreating(false); return }
    setLastCreatedKey(rawKey)
    setNewKeyName('')
    setCreating(false)
    loadKeys()
  }

  async function revokeKey(keyId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('api_keys') as any).update({ revoked_at: new Date().toISOString() }).eq('id', keyId)
    setApiKeys(prev => prev.filter(k => k.id !== keyId))
    toast.success('Key revoked')
  }

  const clientConfig = CLIENT_CONFIGS[selectedClient].config(MCP_SERVER_URL, lastCreatedKey ?? 'YOUR_NIRMAAN_KEY')

  return (
    <AppShell
      header={
        <div style={{ width: '100%' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>MCP Connect</h1>
        </div>
      }
    >
      <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Intro */}
        <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(96,165,250,0.1), rgba(167,139,250,0.06))', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 'var(--radius)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 28 }}>🔗</span>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Connect any AI client</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                NIRMAAN exposes all your data as MCP tools — let Claude, Cursor, or ChatGPT manage your tasks, journal, and goals directly from chat.
              </p>
            </div>
          </div>
        </div>

        {/* Server URL */}
        <div className="card" style={{ padding: '16px' }}>
          <label style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 8, display: 'block', letterSpacing: '0.04em' }}>MCP SERVER URL</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={MCP_SERVER_URL} readOnly style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }} />
            <button onClick={() => copy(MCP_SERVER_URL, 'url')} className="btn btn-secondary" style={{ height: 42, padding: '0 12px', flexShrink: 0 }}>
              {copiedItems.has('url') ? <Check size={14} color="var(--growth)" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* API Keys */}
        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Personal API Keys</h3>
          
          {lastCreatedKey && (
            <div style={{ marginBottom: 14, padding: '12px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 'var(--radius-sm)' }}>
              <p style={{ fontSize: 11, color: 'var(--growth)', fontWeight: 700, marginBottom: 6 }}>⚠️ Copy now — shown only once!</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={lastCreatedKey} readOnly style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: 'var(--growth)' }} />
                <button onClick={() => copy(lastCreatedKey, 'newkey')} className="btn btn-primary" style={{ height: 38, padding: '0 12px', flexShrink: 0, fontSize: 12 }}>
                  {copiedItems.has('newkey') ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          )}

          {/* Create key form */}
          <form onSubmit={createKey} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input placeholder="Key name (e.g. Claude Desktop)" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
            <button type="submit" disabled={creating || !newKeyName} className="btn btn-primary" style={{ height: 42, padding: '0 14px', flexShrink: 0, fontSize: 13 }}>
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            </button>
          </form>

          {/* Key list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading
              ? [1, 2].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 'var(--radius-sm)' }} />)
              : apiKeys.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: '16px 0' }}>No keys yet. Create one above.</p>
              : apiKeys.map(key => (
                <div key={key.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <Key size={14} color="var(--text-dim)" />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{key.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'monospace' }}>{key.key_prefix}{'•'.repeat(20)}</p>
                  </div>
                  <button onClick={() => revokeKey(key.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                    <Trash2 size={14} color="var(--danger)" />
                  </button>
                </div>
              ))
            }
          </div>
        </div>

        {/* Client configs */}
        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Client Configuration</h3>

          {/* Client tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }}>
            {CLIENT_CONFIGS.map((c, i) => (
              <button
                key={i}
                onClick={() => setSelectedClient(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                  borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                  background: selectedClient === i ? 'rgba(96,165,250,0.15)' : 'var(--surface-2)',
                  color: selectedClient === i ? 'var(--info)' : 'var(--text-muted)',
                  borderWidth: 1, borderStyle: 'solid',
                  borderColor: selectedClient === i ? 'rgba(96,165,250,0.3)' : 'var(--border)',
                }}
              >
                <span>{c.icon}</span> {c.name}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
              File: <code style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{CLIENT_CONFIGS[selectedClient].file}</code>
            </p>
            <div style={{ position: 'relative' }}>
              <pre style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: '14px', fontSize: 12,
                fontFamily: 'monospace', overflowX: 'auto', color: 'var(--text-muted)',
                lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}>
                {clientConfig}
              </pre>
              <button
                onClick={() => copy(clientConfig, 'config')}
                style={{ position: 'absolute', top: 8, right: 8, background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {copiedItems.has('config') ? <Check size={12} color="var(--growth)" /> : <Copy size={12} color="var(--text-dim)" />}
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Copy</span>
              </button>
            </div>
          </div>
        </div>

        {/* Available tools */}
        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Available MCP Tools</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              'list_tasks', 'create_task', 'update_task', 'complete_task',
              'list_todos', 'create_todo', 'toggle_todo',
              'create_journal_entry', 'list_journal_entries',
              'list_goals', 'create_goal',
              'get_life_dashboard', 'plan_my_day', 'get_streaks',
              'list_lessons', 'mark_lesson_complete',
            ].map(tool => (
              <div key={tool} style={{ padding: '6px 10px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <code style={{ fontSize: 11, color: 'var(--info)', fontFamily: 'monospace' }}>{tool}</code>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 8 }} />
      </div>
    </AppShell>
  )
}
