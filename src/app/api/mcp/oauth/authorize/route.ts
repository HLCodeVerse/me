import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const redirectUri = searchParams.get('redirect_uri')
  const state = searchParams.get('state')
  const clientId = searchParams.get('client_id')
  const responseType = searchParams.get('response_type') || 'code'

  const hasSession = req.cookies.get('nirmaan_session')?.value === 'true'

  if (redirectUri) {
    const authParams = new URLSearchParams({
      redirect_uri: redirectUri,
      ...(state ? { state } : {}),
      ...(clientId ? { client_id: clientId } : {}),
      response_type: responseType,
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
    response_type: responseType
  })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
