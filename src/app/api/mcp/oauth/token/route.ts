import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfzulmibfmktllnshxox.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMyOTQ5MywiZXhwIjoyMDk3OTA1NDkzfQ.KaV1NcBeZRWTtYurPyRWqpuUpghk8wJWVK0CtqO4dA0'

function getDb() {
  return createClient(SUPABASE_URL, SERVICE_KEY)
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

export async function POST(req: NextRequest) {
  const db = getDb()

  let params: Record<string, string> = {}
  const ct = req.headers.get('content-type') || ''

  if (ct.includes('application/x-www-form-urlencoded')) {
    const text = await req.text()
    for (const pair of text.split('&')) {
      const [k, v] = pair.split('=')
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '')
    }
  } else {
    params = await req.json().catch(() => ({}))
  }

  const grantType = params.grant_type || 'authorization_code'

  // ── authorization_code flow ──────────────────────────────────────────
  if (grantType === 'authorization_code') {
    const code = params.code
    if (!code) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Missing code parameter' },
        { status: 400, headers: CORS }
      )
    }

    // Look up and consume the code
    const { data: codeRow, error: codeErr } = await db
      .from('mcp_oauth_codes')
      .select('*')
      .eq('code', code)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (codeErr || !codeRow) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Code is invalid, expired, or already used' },
        { status: 400, headers: CORS }
      )
    }

    // Mark code as used
    await db
      .from('mcp_oauth_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', codeRow.id)

    // Create persisted tokens
    const accessToken = `nir_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`
    const refreshToken = `nir_ref_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

    const { error: tokenErr } = await db.from('mcp_oauth_tokens').insert({
      access_token: accessToken,
      refresh_token: refreshToken,
      user_id: codeRow.user_id,
      client_id: codeRow.client_id,
      scope: codeRow.scope || 'mcp:read mcp:write',
      expires_at: expiresAt,
    })

    if (tokenErr) {
      console.error('[OAuth token] DB insert error:', tokenErr)
      return NextResponse.json(
        { error: 'server_error', error_description: 'Failed to issue token' },
        { status: 500, headers: CORS }
      )
    }

    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 31536000,
      refresh_token: refreshToken,
      scope: codeRow.scope || 'mcp:read mcp:write',
    }, { status: 200, headers: CORS })
  }

  // ── refresh_token flow ───────────────────────────────────────────────
  if (grantType === 'refresh_token') {
    const refreshToken = params.refresh_token
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Missing refresh_token' },
        { status: 400, headers: CORS }
      )
    }

    const { data: tokenRow } = await db
      .from('mcp_oauth_tokens')
      .select('*')
      .eq('refresh_token', refreshToken)
      .is('revoked_at', null)
      .maybeSingle()

    if (!tokenRow) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Refresh token is invalid or revoked' },
        { status: 400, headers: CORS }
      )
    }

    // Rotate tokens
    const newAccess = `nir_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`
    const newRefresh = `nir_ref_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

    // Revoke old, insert new
    await db.from('mcp_oauth_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', tokenRow.id)
    await db.from('mcp_oauth_tokens').insert({
      access_token: newAccess,
      refresh_token: newRefresh,
      user_id: tokenRow.user_id,
      client_id: tokenRow.client_id,
      scope: tokenRow.scope,
      expires_at: expiresAt,
    })

    return NextResponse.json({
      access_token: newAccess,
      token_type: 'Bearer',
      expires_in: 31536000,
      refresh_token: newRefresh,
      scope: tokenRow.scope,
    }, { status: 200, headers: CORS })
  }

  // ── client_credentials flow ──────────────────────────────────────────
  if (grantType === 'client_credentials') {
    const clientId = params.client_id
    const clientSecret = params.client_secret

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'invalid_client', error_description: 'client_id and client_secret required' },
        { status: 401, headers: CORS }
      )
    }

    const { data: client } = await db
      .from('mcp_oauth_clients')
      .select('*')
      .eq('client_id', clientId)
      .eq('client_secret', clientSecret)
      .maybeSingle()

    if (!client) {
      return NextResponse.json(
        { error: 'invalid_client', error_description: 'Client authentication failed' },
        { status: 401, headers: CORS }
      )
    }

    const accessToken = `nir_cc_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

    await db.from('mcp_oauth_tokens').insert({
      access_token: accessToken,
      user_id: '00000000-0000-0000-0000-000000000000', // service account
      client_id: clientId,
      scope: params.scope || 'mcp:read mcp:write',
      expires_at: expiresAt,
    })

    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 31536000,
      scope: params.scope || 'mcp:read mcp:write',
    }, { status: 200, headers: CORS })
  }

  return NextResponse.json(
    { error: 'unsupported_grant_type' },
    { status: 400, headers: CORS }
  )
}

export async function GET() {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405, headers: CORS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS })
}
