'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ShieldCheck, Key, Check, Plus, Loader2, ArrowRight, LogIn, Copy } from 'lucide-react'
import { toast } from 'sonner'
import type { ApiKey } from '@/lib/supabase/database.types'

function AuthorizeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  const redirectUri = searchParams.get('redirect_uri')
  const state = searchParams.get('state')
  const clientId = searchParams.get('client_id') || 'AI Assistant'
  const codeChallenge = searchParams.get('code_challenge')
  const codeChallengeMethod = searchParams.get('code_challenge_method') || 'S256'

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [selectedKeyId, setSelectedKeyId] = useState<string>('')
  const [newKeyName, setNewKeyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [creatingKey, setCreatingKey] = useState(false)
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '/mcp/authorize'

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setLoading(false)
      return
    }

    async function loadKeys() {
      try {
        const res = await fetch('/api/keys')
        const data = await res.json()
        if (res.status === 401 || data.require_login) {
          toast.error('Session expired. Please log in first.')
          router.push(`/auth?next=${encodeURIComponent(currentUrl)}`)
          return
        }

        if (res.ok && data.keys) {
          setApiKeys(data.keys)
          if (data.keys.length > 0) {
            setSelectedKeyId(data.keys[0].id)
          }
        }
      } catch {
        toast.error('Failed to load API keys')
      } finally {
        setLoading(false)
      }
    }

    loadKeys()
  }, [user, authLoading, router, currentUrl])

  function redirectToLogin() {
    toast.info('Please log in to generate API keys & authorize connection.')
    router.push(`/auth?next=${encodeURIComponent(currentUrl)}`)
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      redirectToLogin()
      return
    }

    if (!newKeyName.trim()) return
    setCreatingKey(true)

    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() })
      })

      const data = await res.json()

      if (res.status === 401 || data.require_login) {
        redirectToLogin()
        return
      }

      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to create key in database')
        setCreatingKey(false)
        return
      }

      toast.success(`API Key "${newKeyName}" saved to database! 🚀`)
      setCreatedRawKey(data.rawKey)
      setApiKeys(prev => [data.key, ...prev])
      setSelectedKeyId(data.key.id)
      setNewKeyName('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error creating API key')
    } finally {
      setCreatingKey(false)
    }
  }

  function handleCopyRawKey() {
    if (!createdRawKey) return
    navigator.clipboard.writeText(createdRawKey)
    setCopiedKey(true)
    toast.success('Key copied to clipboard!')
    setTimeout(() => setCopiedKey(false), 2000)
  }

  async function handleApprove() {
    if (!user) {
      redirectToLogin()
      return
    }

    setApproving(true)

    try {
      const res = await fetch('/api/mcp/oauth/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          client_id: clientId,
          redirect_uri: redirectUri,
          scope: 'mcp:read mcp:write',
          ...(codeChallenge ? { code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod } : {}),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error_description || 'Failed to generate auth code')
        setApproving(false)
        return
      }

      const { code } = await res.json()

      if (redirectUri) {
        const callbackUrl = new URL(redirectUri)
        callbackUrl.searchParams.set('code', code)
        if (state) callbackUrl.searchParams.set('state', state)

        toast.success('Connection Authorized! Redirecting back to AI client...')
        setTimeout(() => {
          window.location.href = callbackUrl.toString()
        }, 800)
      } else {
        toast.success('Authorized successfully!')
        router.push('/dashboard')
      }
    } catch {
      toast.error('Authorization failed. Please try again.')
      setApproving(false)
    }
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <Loader2 size={32} className="animate-spin" color="#7C3AED" />
      </div>
    )
  }

  // Not Logged In Screen
  if (!user) {
    return (
      <div style={{
        minHeight: '100dvh', background: 'var(--bg)', display: 'flex',
        flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        padding: '24px', position: 'relative',
      }}>
        <div className="card animate-fade-in" style={{ padding: '32px 28px', maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <LogIn size={26} color="#EF4444" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Authentication Required</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
            You must log in to your NIRMAAN OS account before generating API keys or authorizing <strong style={{ color: 'var(--text-primary)' }}>{clientId}</strong>.
          </p>
          <button
            onClick={redirectToLogin}
            className="btn btn-primary"
            style={{ width: '100%', height: 44, fontSize: 14 }}
          >
            <LogIn size={16} />
            Log In to Continue
          </button>
        </div>
      </div>
    )
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
      <div className="card animate-fade-in" style={{ padding: '32px 28px', maxWidth: 440, width: '100%' }}>
        {/* Header Icon */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: 'rgba(124, 58, 237, 0.1)',
            border: '1px solid rgba(124, 58, 237, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <ShieldCheck size={28} color="#7C3AED" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Authorize MCP Connection</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text-primary)' }}>{clientId}</strong> is requesting connection to your NIRMAAN OS account.
          </p>
        </div>

        {/* Permissions list */}
        <div style={{ padding: '14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-btn)', border: '1px solid var(--border)', marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            REQUESTED PERMISSIONS
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Tasks & Todos', 'Micro-Journal', 'Goals & Streaks', 'Life Score Metrics'].map(p => (
              <span key={p} className="badge badge-primary">
                ✓ {p}
              </span>
            ))}
          </div>
        </div>

        {/* Created Raw Key Display */}
        {createdRawKey && (
          <div style={{ marginBottom: 16, padding: '12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-btn)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ fontSize: 12, color: '#059669', fontWeight: 600, margin: 0 }}>
                🔑 Key Saved to DB! Copy now:
              </p>
              <button
                onClick={handleCopyRawKey}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#059669', fontSize: 11, fontWeight: 600 }}
              >
                {copiedKey ? <Check size={13} /> : <Copy size={13} />}
                {copiedKey ? 'Copied' : 'Copy Key'}
              </button>
            </div>
            <code style={{ fontSize: 12, fontFamily: 'monospace', color: '#059669', wordBreak: 'break-all', display: 'block' }}>
              {createdRawKey}
            </code>
          </div>
        )}

        {/* API Key Selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>
            SELECT OR GENERATE API KEY
          </label>

          {loading ? (
            <div className="skeleton" style={{ height: 44, borderRadius: 'var(--radius-btn)' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {apiKeys.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>No active API key found. Generate one below:</p>
              ) : (
                apiKeys.map(k => (
                  <div
                    key={k.id}
                    onClick={() => setSelectedKeyId(k.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      borderRadius: 'var(--radius-btn)', cursor: 'pointer',
                      background: selectedKeyId === k.id ? 'rgba(124, 58, 237, 0.08)' : 'var(--surface-2)',
                      border: `1px solid ${selectedKeyId === k.id ? '#7C3AED' : 'var(--border)'}`,
                      transition: 'all 150ms ease',
                    }}
                  >
                    <Key size={14} color={selectedKeyId === k.id ? '#7C3AED' : 'var(--text-secondary)'} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: selectedKeyId === k.id ? '#7C3AED' : 'var(--text-primary)', margin: 0 }}>
                        {k.name}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', margin: '2px 0 0' }}>
                        {k.key_prefix}••••••••
                      </p>
                    </div>
                    {selectedKeyId === k.id && <Check size={16} color="#7C3AED" />}
                  </div>
                ))
              )}

              {/* Generate Key Form */}
              <form onSubmit={handleCreateKey} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input
                  placeholder="Key name (e.g. ChatGPT Connector)"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  style={{ flex: 1, fontSize: 13, height: 38 }}
                />
                <button
                  type="submit"
                  disabled={creatingKey || !newKeyName.trim()}
                  className="btn btn-primary"
                  style={{ height: 38, padding: '0 14px', fontSize: 12, flexShrink: 0 }}
                >
                  {creatingKey ? <Loader2 size={14} className="animate-spin" /> : (
                    <>
                      <Plus size={14} />
                      Generate
                    </>
                  )}
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
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" /> Loading...</div>}>
      <AuthorizeContent />
    </Suspense>
  )
}
