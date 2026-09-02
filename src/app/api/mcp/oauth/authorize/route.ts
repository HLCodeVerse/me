export const dynamic = 'force-static'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const redirectUri = searchParams.get('redirect_uri')
  const state = searchParams.get('state')
  const clientId = searchParams.get('client_id')
  const responseType = searchParams.get('response_type') || 'code'
  // PKCE params — required for OAuth 2.1 / ChatGPT MCP connector
  const codeChallenge = searchParams.get('code_challenge')
  const codeChallengeMethod = searchParams.get('code_challenge_method') || 'S256'

  const hasSession = req.cookies.get('nirmaan_session')?.value === 'true'

  if (redirectUri) {
    // Preserve ALL OAuth params (including PKCE) through the redirect chain
    const authParams = new URLSearchParams({
      redirect_uri: redirectUri,
      ...(state ? { state } : {}),
      ...(clientId ? { client_id: clientId } : {}),
      response_type: responseType,
      ...(codeChallenge ? { code_challenge: codeChallenge } : {}),
      ...(codeChallenge ? { code_challenge_method: codeChallengeMethod } : {}),
    }).toString()

    if (!hasSession) {
      // Redirect to Login page first with next parameter
      const loginUrl = new URL('/auth', req.url)
      loginUrl.searchParams.set('next', `/mcp/authorize?${authParams}`)
      return NextResponse.redirect(loginUrl)
    }

    // User is logged in -> Redirect to Interactive MCP Authorize Screen
    const authorizePageUrl = new URL(`/mcp/authorize?${authParams}`, req.url)
    return NextResponse.redirect(authorizePageUrl)
  }

  return NextResponse.json({
    status: 'online',
    message: 'NIRMAAN MCP OAuth Authorization Gateway',
    response_type: responseType,
    pkce_supported: true,
    code_challenge_methods_supported: ['S256', 'plain'],
  })
}

export async function POST(req: NextRequest) {
  return GET(req)
}

