import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-static'

function getOrigin(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'me-eight-dun.vercel.app'
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req)

  return NextResponse.json({
    issuer: origin,
    authorization_endpoint: `${origin}/api/mcp/oauth/authorize`,
    token_endpoint: `${origin}/api/mcp/oauth/token`,
    userinfo_endpoint: `${origin}/api/mcp/oauth/userinfo`,
    registration_endpoint: `${origin}/api/mcp/oauth/register`,
    jwks_uri: `${origin}/api/mcp/.well-known/jwks.json`,
    scopes_supported: ['openid', 'profile', 'email', 'mcp:read', 'mcp:write'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
    subject_types_supported: ['public'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
    code_challenge_methods_supported: ['S256', 'plain'],
    claims_supported: ['sub', 'name', 'email', 'email_verified'],
    service_documentation: `${origin}/mcp`
  }, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    }
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    }
  })
}
