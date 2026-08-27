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

// Safe URL decode that never throws
function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '))
  } catch {
    return s
  }
}

// Parse form-urlencoded body safely
function parseFormBody(text: string): Record<string, string> {
  const params: Record<string, string> = {}
  for (const pair of text.split('&')) {
    const eqIdx = pair.indexOf('=')
    if (eqIdx === -1) continue
    const k = safeDecode(pair.slice(0, eqIdx))
    const v = safeDecode(pair.slice(eqIdx + 1))
    if (k) params[k] = v
  }
  return params
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb()

    // Parse request body — supports both JSON and form-urlencoded
    let params: Record<string, string> = {}
    const ct = req.headers.get('content-type') || ''

    if (ct.includes('application/x-www-form-urlencoded')) {
      const text = await req.text()
      params = parseFormBody(text)
    } else {
      params = await req.json().catch(() => ({}))
    }

    const grantType = params.grant_type || 'authorization_code'

    // ── authorization_code ────────────────────────────────────────────────
    if (grantType === 'authorization_code') {
      const code = params.code
      if (!code) {
        return NextResponse.json(
          { error: 'invalid_request', error_description: 'Missing code parameter' },
          { status: 400, headers: CORS }
        )
      }

      // Look up the auth code in DB
      const { data: codeRow, error: codeErr } = await db
        .from('mcp_oauth_codes')
        .select('id, user_id, client_id, scope, expires_at, used_at')
        .eq('code', code)
        .maybeSingle()

      if (codeErr) {
        console.error('[token] DB error looking up code:', codeErr.message)
        return NextResponse.json(
          { error: 'server_error', error_description: 'Database error' },
          { status: 500, headers: CORS }
        )
      }

      if (!codeRow) {
        return NextResponse.json(
          { error: 'invalid_grant', error_description: 'Authorization code not found' },
          { status: 400, headers: CORS }
        )
      }

      if (codeRow.used_at) {
        return NextResponse.json(
          { error: 'invalid_grant', error_description: 'Authorization code already used' },
          { status: 400, headers: CORS }
        )
      }

      if (new Date(codeRow.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'invalid_grant', error_description: 'Authorization code expired' },
          { status: 400, headers: CORS }
        )
      }

      // Mark code as used
      await db
        .from('mcp_oauth_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', codeRow.id)

      // Issue tokens
      const accessToken = `nir_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`
      const refreshToken = `nir_ref_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

      const { error: insertErr } = await db.from('mcp_oauth_tokens').insert({
        access_token: accessToken,
        refresh_token: refreshToken,
        user_id: codeRow.user_id,
        client_id: codeRow.client_id,
        scope: codeRow.scope || 'mcp:read mcp:write',
        expires_at: expiresAt,
      })

      if (insertErr) {
        console.error('[token] Failed to insert token:', insertErr.message)
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

    // ── refresh_token ─────────────────────────────────────────────────────
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
        .select('id, user_id, client_id, scope')
        .eq('refresh_token', refreshToken)
        .is('revoked_at', null)
        .maybeSingle()

      if (!tokenRow) {
        return NextResponse.json(
          { error: 'invalid_grant', error_description: 'Refresh token invalid or revoked' },
          { status: 400, headers: CORS }
        )
      }

      // Rotate
      const newAccess = `nir_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`
      const newRefresh = `nir_ref_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

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

    // ── client_credentials ────────────────────────────────────────────────
    if (grantType === 'client_credentials') {
      const clientId = params.client_id
      const clientSecret = params.client_secret

      if (!clientId) {
        return NextResponse.json(
          { error: 'invalid_client', error_description: 'client_id required' },
          { status: 401, headers: CORS }
        )
      }

      const accessToken = `nir_cc_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

      // For client_credentials, use a placeholder user_id
      await db.from('mcp_oauth_tokens').insert({
        access_token: accessToken,
        user_id: 'c9d3517e-542b-4cf4-9bce-ebda2502252f', // service account fallback
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
      { error: 'unsupported_grant_type', error_description: `grant_type "${grantType}" not supported` },
      { status: 400, headers: CORS }
    )
  } catch (err) {
    console.error('[token] Unhandled error:', err)
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500, headers: CORS }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'method_not_allowed', error_description: 'Use POST to exchange tokens' },
    { status: 405, headers: CORS }
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS })
}
