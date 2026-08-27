import { NextResponse } from 'next/server'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

// Stub JWKS endpoint — we use opaque bearer tokens not JWTs, so no real keys needed
// But ChatGPT may request this as part of OIDC discovery
export async function GET() {
  return NextResponse.json({ keys: [] }, { status: 200, headers: CORS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS })
}
