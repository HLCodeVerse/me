export const dynamic = 'force-static'
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

// OpenID Connect userinfo endpoint — ChatGPT calls this to verify the token (OBI sync)
async function handleUserinfo(req: NextRequest): Promise<NextResponse> {
  const db = getDb()

  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()

  if (!token) {
    return NextResponse.json(
      { error: 'invalid_token', error_description: 'Missing Bearer token' },
      { status: 401, headers: { ...CORS, 'WWW-Authenticate': 'Bearer realm="NIRMAAN"' } }
    )
  }

  // Validate token from mcp_oauth_tokens table
  const { data: tokenRow } = await db
    .from('mcp_oauth_tokens')
    .select('user_id, scope, expires_at')
    .eq('access_token', token)
    .is('revoked_at', null)
    .maybeSingle()

  if (!tokenRow) {
    return NextResponse.json(
      { error: 'invalid_token', error_description: 'Token is invalid or expired' },
      { status: 401, headers: { ...CORS, 'WWW-Authenticate': 'Bearer error="invalid_token"' } }
    )
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'invalid_token', error_description: 'Token has expired' },
      { status: 401, headers: { ...CORS, 'WWW-Authenticate': 'Bearer error="invalid_token"' } }
    )
  }

  // Fetch user profile (profiles table has no email column)
  const { data: profile } = await db
    .from('profiles')
    .select('id, display_name, username, phone')
    .eq('id', tokenRow.user_id)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json(
      { error: 'invalid_token', error_description: 'User not found' },
      { status: 401, headers: CORS }
    )
  }

  // Return OpenID Connect userinfo response
  // Use username@nirmaan.app as synthetic email since profiles has no email column
  const syntheticEmail = profile.username
    ? `${profile.username}@nirmaan.app`
    : `user-${profile.id.slice(0, 8)}@nirmaan.app`

  return NextResponse.json({
    sub: profile.id,
    name: profile.display_name || profile.username || 'NIRMAAN User',
    email: syntheticEmail,
    email_verified: true,
    phone: profile.phone || null,
    updated_at: Math.floor(Date.now() / 1000),
  }, { status: 200, headers: CORS })
}

export async function GET(req: NextRequest) {
  return handleUserinfo(req)
}

export async function POST(req: NextRequest) {
  return handleUserinfo(req)
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS })
}
