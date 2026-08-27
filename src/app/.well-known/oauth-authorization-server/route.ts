import { NextResponse } from 'next/server'

export async function GET() {
  const domain = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://me-eight-dun.vercel.app'

  return NextResponse.json({
    issuer: domain,
    authorization_endpoint: `${domain}/api/mcp/oauth/authorize`,
    token_endpoint: `${domain}/api/mcp/oauth/token`,
    registration_endpoint: `${domain}/api/mcp/oauth/register`,
    scopes_supported: ['mcp:read', 'mcp:write', 'openid', 'profile'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
    code_challenge_methods_supported: ['S256', 'plain']
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}
