import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfzulmibfmktllnshxox.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjk0OTMsImV4cCI6MjA5NzkwNTQ5M30.QYiOYZ9eQ_epSBRPZhyjOjl185do7tKVQtIBlgdiY0M'

function getDb() {
  return createClient(SUPABASE_URL, SERVICE_KEY || ANON_KEY)
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

  // Fetch user profile
  const { data: profile } = await db
    .from('profiles')
    .select('id, display_name, phone, email')
    .eq('id', tokenRow.user_id)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json(
      { error: 'invalid_token', error_description: 'User not found' },
      { status: 401, headers: CORS }
    )
  }

  // Return OpenID Connect userinfo response
  return NextResponse.json({
    sub: profile.id,
    name: profile.display_name || 'NIRMAAN User',
    email: profile.email || `user-${profile.id.slice(0, 8)}@nirmaan.app`,
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
