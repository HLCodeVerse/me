export const dynamic = 'force-static'
import { NextRequest, NextResponse } from 'next/server'

function getOrigin(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'me-eight-dun.vercel.app'
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export async function GET(req: NextRequest) {
  const sessionId = crypto.randomUUID()
  // Derive origin dynamically from request — avoids VERCEL_URL env fallback issues
  const origin = getOrigin(req)
  const messageUrl = `${origin}/api/mcp?sessionId=${sessionId}`

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // Send endpoint event per MCP SSE spec
      controller.enqueue(encoder.encode(`event: endpoint\ndata: ${messageUrl}\n\n`))

      // Keepalive interval (15s)
      const timer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        } catch {
          clearInterval(timer)
        }
      }, 15000)

      req.signal.addEventListener('abort', () => {
        clearInterval(timer)
        controller.close()
      })
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}
