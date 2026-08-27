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

  function handleApprove() {
    if (!user) {
      redirectToLogin()
      return
    }

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

  if (authLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <Loader2 size={32} className="animate-spin" color="var(--growth)" />
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
        <div className="card animate-fade-up" style={{ padding: '32px 28px', maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{
            width: 60, height: 60, borderRadius: 20, background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <LogIn size={28} color="var(--danger)" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Authentication Required</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
            You must log in to your NIRMAAN OS account before generating API keys or authorizing <strong style={{ color: 'var(--text)' }}>{clientId}</strong>.
          </p>
          <button
            onClick={redirectToLogin}
            className="btn btn-primary"
            style={{ width: '100%', height: 46, fontSize: 14, fontWeight: 700 }}
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

        {/* Created Raw Key Display */}
        {createdRawKey && (
          <div style={{ marginBottom: 16, padding: '12px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ fontSize: 11, color: 'var(--growth)', fontWeight: 700 }}>
                🔑 Key Saved to DB! Copy now:
              </p>
              <button
                onClick={handleCopyRawKey}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--growth)', fontSize: 11, fontWeight: 600 }}
              >
                {copiedKey ? <Check size={13} /> : <Copy size={13} />}
                {copiedKey ? 'Copied' : 'Copy Key'}
              </button>
            </div>
            <code style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--growth)', wordBreak: 'break-all', display: 'block' }}>
              {createdRawKey}
            </code>
          </div>
        )}

        {/* API Key Selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.04em', marginBottom: 8, display: 'block' }}>
            SELECT OR GENERATE API KEY
          </label>

          {loading ? (
            <div className="skeleton" style={{ height: 44, borderRadius: 'var(--radius-sm)' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {apiKeys.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-dim)', padding: '4px 0' }}>No active API key found. Generate one below:</p>
              ) : (
                apiKeys.map(k => (
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
                      <p style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                        {k.key_prefix}••••••••
                      </p>
                    </div>
                    {selectedKeyId === k.id && <Check size={16} color="var(--growth)" />}
                  </div>
                ))
              )}

              {/* Generate Key Inline Form */}
              <form onSubmit={handleCreateKey} style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <input
                  placeholder="Key name (e.g. ChatGPT Connector)"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  style={{ flex: 1, fontSize: 12, height: 38 }}
                />
                <button
                  type="submit"
                  disabled={creatingKey || !newKeyName.trim()}
                  className="btn btn-primary"
                  style={{ height: 38, padding: '0 12px', fontSize: 12, flexShrink: 0 }}
                >
                  {creatingKey ? <Loader2 size={13} className="animate-spin" /> : (
                    <>
                      <Plus size={13} />
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
