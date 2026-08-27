import { NextResponse } from 'next/server'

export async function POST() {
  const token = `nir_access_${crypto.randomUUID().replace(/-/g, '')}`
  const refreshToken = `nir_refresh_${crypto.randomUUID().replace(/-/g, '')}`

  return NextResponse.json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: 31536000,
    refresh_token: refreshToken,
    scope: 'mcp:read mcp:write'
  }, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    }
  })
}

export async function GET() {
  return POST()
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    }
  })
}
