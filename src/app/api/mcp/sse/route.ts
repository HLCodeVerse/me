import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const sessionId = crypto.randomUUID()
  const domain = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://me-eight-dun.vercel.app'
  const messageUrl = `${domain}/api/mcp?sessionId=${sessionId}`

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // Send endpoint event per MCP SSE spec
      controller.enqueue(encoder.encode(`event: endpoint\ndata: ${messageUrl}\n\n`))

      // Keepalive interval
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
