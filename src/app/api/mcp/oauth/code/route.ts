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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

// Called by the authorize page after user approves — stores code in DB
// Accepts user_id from request body OR nirmaan_user_id cookie
export async function POST(req: NextRequest) {
  try {
    const db = getDb()
    const body = await req.json()

    // Resolve user_id: client sends it explicitly from useAuth(), fallback to cookie
    let userId: string | null = body.user_id || null

    if (!userId) {
      userId = req.cookies.get('nirmaan_user_id')?.value || null
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'Not logged in — no user_id provided' },
        { status: 401, headers: CORS }
      )
    }

    // Verify user exists in profiles
    const { data: profile } = await db.from('profiles').select('id').eq('id', userId).maybeSingle()
    if (!profile) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'User not found in database' },
        { status: 401, headers: CORS }
      )
    }

    const clientId = body.client_id || 'unknown_client'
    const redirectUri = body.redirect_uri || null
    const scope = body.scope || 'mcp:read mcp:write'

    // Generate a cryptographically secure auth code
    const code = `nir_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

    const { error } = await db.from('mcp_oauth_codes').insert({
      code,
      user_id: userId,
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      expires_at: expiresAt,
    })

    if (error) {
      console.error('[OAuth code] DB insert error:', error)
      return NextResponse.json(
        { error: 'server_error', error_description: 'Failed to store auth code' },
        { status: 500, headers: CORS }
      )
    }

    return NextResponse.json({ code }, { status: 201, headers: CORS })
  } catch (err) {
    console.error('[OAuth code] Error:', err)
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal error' },
      { status: 500, headers: CORS }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS })
}
