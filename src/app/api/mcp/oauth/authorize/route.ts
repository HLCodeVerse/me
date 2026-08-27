import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const redirectUri = searchParams.get('redirect_uri')
  const state = searchParams.get('state')
  const responseType = searchParams.get('response_type') || 'code'

  if (redirectUri) {
    const authCode = `nir_code_${crypto.randomUUID().replace(/-/g, '')}`
    const callbackUrl = new URL(redirectUri)
    callbackUrl.searchParams.set('code', authCode)
    if (state) callbackUrl.searchParams.set('state', state)

    return NextResponse.redirect(callbackUrl.toString())
  }

  return NextResponse.json({
    status: 'authorized',
    message: 'NIRMAAN MCP OAuth Authorization Server',
    response_type: responseType
  })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
