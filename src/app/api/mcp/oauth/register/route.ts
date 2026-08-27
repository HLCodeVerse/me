import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const clientId = `nir_client_${crypto.randomUUID().replace(/-/g, '')}`
    const clientSecret = `nir_secret_${crypto.randomUUID().replace(/-/g, '')}`

    const redirectUris = Array.isArray(body.redirect_uris) && body.redirect_uris.length > 0
      ? body.redirect_uris
      : ['https://chatgpt.com/aip/g-12345/oauth/callback', 'http://localhost']

    return NextResponse.json({
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0,
      client_name: body.client_name || 'AI Client',
      redirect_uris: redirectUris,
      grant_types: body.grant_types || ['authorization_code', 'refresh_token', 'client_credentials'],
      response_types: body.response_types || ['code'],
      token_endpoint_auth_method: body.token_endpoint_auth_method || 'client_secret_post'
    }, {
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT',
        'Access-Control-Allow-Headers': '*',
      }
    })
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT',
        'Access-Control-Allow-Headers': '*',
      }
    })
  }
}

export async function GET() {
  const clientId = `nir_client_${crypto.randomUUID().replace(/-/g, '')}`
  const clientSecret = `nir_secret_${crypto.randomUUID().replace(/-/g, '')}`

  return NextResponse.json({
    client_id: clientId,
    client_secret: clientSecret,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_secret_expires_at: 0,
    client_name: 'AI Client',
    grant_types: ['authorization_code', 'refresh_token', 'client_credentials'],
    response_types: ['code'],
    token_endpoint_auth_method: 'client_secret_post'
  }, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT',
      'Access-Control-Allow-Headers': '*',
    }
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT',
      'Access-Control-Allow-Headers': '*',
    }
  })
}
