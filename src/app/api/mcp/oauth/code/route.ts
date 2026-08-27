import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfzulmibfmktllnshxox.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function getDb() {
  return createClient(SUPABASE_URL, SERVICE_KEY)
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

// Called by the authorize page after user approves — stores code in DB
export async function POST(req: NextRequest) {
  try {
    const db = getDb()

    // Resolve user from cookie
    const userId = req.cookies.get('nirmaan_user_id')?.value
    if (!userId) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'Not logged in' },
        { status: 401, headers: CORS }
      )
    }

    // Verify user exists
    const { data: profile } = await db.from('profiles').select('id').eq('id', userId).maybeSingle()
    if (!profile) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'User not found' },
        { status: 401, headers: CORS }
      )
    }

    const body = await req.json()
    const clientId = body.client_id || 'unknown_client'
    const redirectUri = body.redirect_uri || null
    const scope = body.scope || 'mcp:read mcp:write'

    // Generate a cryptographically secure code
    const code = `nir_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min

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
