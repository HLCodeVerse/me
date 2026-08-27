import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfzulmibfmktllnshxox.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function getDb() {
  return createClient(SUPABASE_URL, SERVICE_KEY)
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT',
  'Access-Control-Allow-Headers': '*',
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb()
    const body = await req.json().catch(() => ({}))

    const clientId = `nir_client_${crypto.randomUUID().replace(/-/g, '')}`
    const clientSecret = `nir_secret_${crypto.randomUUID().replace(/-/g, '')}`

    const redirectUris = Array.isArray(body.redirect_uris) && body.redirect_uris.length > 0
      ? body.redirect_uris
      : ['https://chatgpt.com/aip/g-12345/oauth/callback', 'http://localhost']

    const grantTypes = body.grant_types || ['authorization_code', 'refresh_token']

    // Persist client in database
    await db.from('mcp_oauth_clients').insert({
      client_id: clientId,
      client_secret: clientSecret,
      client_name: body.client_name || 'AI Client',
      redirect_uris: redirectUris,
      grant_types: grantTypes,
    })

    return NextResponse.json({
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0,
      client_name: body.client_name || 'AI Client',
      redirect_uris: redirectUris,
      grant_types: grantTypes,
      response_types: body.response_types || ['code'],
      token_endpoint_auth_method: body.token_endpoint_auth_method || 'client_secret_post'
    }, { status: 201, headers: CORS })
  } catch (err) {
    console.error('[OAuth register]', err)
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Registration failed' },
      { status: 400, headers: CORS }
    )
  }
}

export async function GET() {
  // Dynamic discovery info
  return NextResponse.json({
    registration_endpoint: `${process.env.NEXT_PUBLIC_APP_URL || 'https://me-eight-dun.vercel.app'}/api/mcp/oauth/register`,
    grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
    response_types_supported: ['code'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
  }, { status: 200, headers: CORS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS })
}
