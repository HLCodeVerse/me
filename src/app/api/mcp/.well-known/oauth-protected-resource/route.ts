export const dynamic = 'force-static'
import { NextRequest, NextResponse } from 'next/server'

// RFC 9728 — OAuth 2.0 Protected Resource Metadata
// ChatGPT's MCP connector fetches this to discover the authorization server
// when the resource server returns a 401 with WWW-Authenticate: Bearer resource_metadata="..."

function getOrigin(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'me-eight-dun.vercel.app'
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req)

  return NextResponse.json({
    // The URI of this protected resource (MCP server)
    resource: `${origin}/api/mcp`,
    // The authorization server(s) that issue tokens for this resource
    authorization_servers: [origin],
    // Scopes the resource supports
    scopes_supported: ['mcp:read', 'mcp:write', 'openid', 'profile', 'email'],
    // How to present bearer tokens
    bearer_methods_supported: ['header'],
    // Link to OpenAPI spec
    resource_documentation: `${origin}/api/mcp/openapi.json`,
  }, { status: 200, headers: CORS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS })
}
