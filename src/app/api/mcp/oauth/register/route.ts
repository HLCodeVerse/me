import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const clientId = `nir_client_${crypto.randomUUID().replace(/-/g, '')}`
    const clientSecret = `nir_secret_${crypto.randomUUID().replace(/-/g, '')}`

    return NextResponse.json({
      client_id: clientId,
      client_secret: clientSecret,
      client_name: body.client_name || 'AI Client',
      redirect_uris: body.redirect_uris || [],
      grant_types: ['authorization_code', 'refresh_token', 'client_credentials'],
      token_endpoint_auth_method: 'client_secret_post'
    }, {
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}
