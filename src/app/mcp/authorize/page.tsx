'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, Key, Check, Plus, Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import type { ApiKey } from '@/lib/supabase/database.types'

function AuthorizeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const supabase = createClient()

  const redirectUri = searchParams.get('redirect_uri')
  const state = searchParams.get('state')
  const clientId = searchParams.get('client_id') || 'AI Assistant'

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [selectedKeyId, setSelectedKeyId] = useState<string>('')
  const [newKeyName, setNewKeyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [creatingKey, setCreatingKey] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push(`/auth?next=${encodeURIComponent(window.location.href)}`)
      return
    }

    async function loadKeys() {
      const { data } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user!.id)
        .is('revoked_at', null)
        .order('created_at', { ascending: false })

      const keys = (data || []) as ApiKey[]
      setApiKeys(keys)
      if (keys.length > 0) {
        setSelectedKeyId(keys[0].id)
      }
      setLoading(false)
    }

    loadKeys()
  }, [user, router, supabase])

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault()
    if (!newKeyName.trim() || !user) return
    setCreatingKey(true)

    const rawKey = `nir_${crypto.randomUUID().replace(/-/g, '')}`
    const prefix = rawKey.slice(0, 12)
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey))
    const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: createdKey, error } = await (supabase.from('api_keys') as any).insert({
      user_id: user.id,
      name: newKeyName,
      key_hash: hashHex,
      key_prefix: prefix,
      scopes: ['tasks', 'todos', 'journal', 'goals', 'ai'],
    }).select().single()

    if (error) {
      toast.error('Failed to create key')
      setCreatingKey(false)
      return
    }

    toast.success(`Key "${newKeyName}" created!`)
    setApiKeys(prev => [createdKey, ...prev])
    setSelectedKeyId(createdKey.id)
    setNewKeyName('')
    setCreatingKey(false)
  }

  function handleApprove() {
    setApproving(true)
    const authCode = `nir_code_${crypto.randomUUID().replace(/-/g, '')}`

    if (redirectUri) {
      const callbackUrl = new URL(redirectUri)
      callbackUrl.searchParams.set('code', authCode)
      if (state) callbackUrl.searchParams.set('state', state)

      toast.success('Connection Authorized! Redirecting back to AI client...')
      setTimeout(() => {
        window.location.href = callbackUrl.toString()
      }, 1000)
    } else {
      toast.success('Authorized successfully!')
      router.push('/dashboard')
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px',
      position: 'relative',
    }}>
      {/* Background Glow */}
      <div style={{
        position: 'absolute', top: -150, left: '50%', transform: 'translateX(-50%)',
        width: 450, height: 450, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(96,165,250,0.08), transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="card animate-fade-up" style={{ padding: '32px 28px', maxWidth: 440, width: '100%' }}>
        {/* Header Icon */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 20, background: 'linear-gradient(135deg, rgba(96,165,250,0.2), rgba(167,139,250,0.15))',
            border: '1px solid rgba(96,165,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(96,165,250,0.15)',
          }}>
            <ShieldCheck size={30} color="var(--info)" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Authorize MCP Connection</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text)' }}>{clientId}</strong> is requesting connection to your NIRMAAN OS account.
          </p>
        </div>

        {/* Permissions list */}
        <div style={{ padding: '14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.04em', marginBottom: 8 }}>
            REQUESTED PERMISSIONS
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Tasks & Todos', 'Micro-Journal', 'Goals & Streaks', 'Life Score Metrics'].map(p => (
              <span key={p} style={{ fontSize: 11, background: 'rgba(96,165,250,0.1)', color: 'var(--info)', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>
                ✓ {p}
              </span>
            ))}
          </div>
        </div>

        {/* API Key Selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.04em', marginBottom: 8, display: 'block' }}>
            SELECT OR CREATE API KEY
          </label>

          {loading ? (
            <div className="skeleton" style={{ height: 44, borderRadius: 'var(--radius-sm)' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {apiKeys.map(k => (
                <div
                  key={k.id}
                  onClick={() => setSelectedKeyId(k.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    background: selectedKeyId === k.id ? 'rgba(52,211,153,0.1)' : 'var(--surface-2)',
                    border: `1px solid ${selectedKeyId === k.id ? 'var(--growth)' : 'var(--border)'}`,
                    transition: 'all 150ms ease',
                  }}
                >
                  <Key size={14} color={selectedKeyId === k.id ? 'var(--growth)' : 'var(--text-dim)'} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: selectedKeyId === k.id ? 'var(--growth)' : 'var(--text)' }}>
                      {k.name}
                    </p>
                  </div>
                  {selectedKeyId === k.id && <Check size={16} color="var(--growth)" />}
                </div>
              ))}

              {/* Create Key Inline */}
              <form onSubmit={handleCreateKey} style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <input
                  placeholder="Create new key (e.g. ChatGPT)"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  style={{ flex: 1, fontSize: 12, height: 38 }}
                />
                <button type="submit" disabled={creatingKey || !newKeyName} className="btn btn-secondary" style={{ height: 38, padding: '0 12px', fontSize: 12, flexShrink: 0 }}>
                  {creatingKey ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => router.push('/mcp')}
            className="btn btn-secondary"
            style={{ flex: 1, height: 44, fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={approving || loading}
            className="btn btn-primary"
            style={{ flex: 1, height: 44, fontSize: 13 }}
          >
            {approving ? <Loader2 size={16} className="animate-spin" /> : (
              <>
                Approve & Connect
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AuthorizePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}><Loader2 className="animate-spin" /> Loading...</div>}>
      <AuthorizeContent />
    </Suspense>
  )
}
