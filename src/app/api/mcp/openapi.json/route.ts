import { NextRequest, NextResponse } from 'next/server'

function getOrigin(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'me-eight-dun.vercel.app'
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req)

  const openApiSpec = {
    openapi: '3.0.1',
    info: {
      title: 'NIRMAAN OS MCP API',
      description: 'Model Context Protocol and Actions integration API for NIRMAAN Personal OS. Connect Grok, ChatGPT, Claude, and Cursor.',
      version: 'v1.0.0'
    },
    servers: [
      {
        url: origin,
        description: 'Active NIRMAAN Server'
      },
      {
        url: 'https://me-eight-dun.vercel.app',
        description: 'Production Vercel NIRMAAN Server'
      }
    ],
    paths: {
      '/api/mcp': {
        get: {
          summary: 'Get NIRMAAN User Dashboard or Tasks',
          operationId: 'getNirmaanDashboard',
          parameters: [
            {
              name: 'action',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['dashboard', 'tasks'] },
              description: 'Fetch dashboard metrics or task list'
            }
          ],
          responses: {
            '200': {
              description: 'Dashboard state or task list'
            }
          }
        },
        post: {
          summary: 'Execute MCP JSON-RPC or Create Task / Journal',
          operationId: 'createNirmaanItem',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    action: { type: 'string', example: 'create_task' },
                    title: { type: 'string', example: 'Complete Project Blueprint' },
                    priority: { type: 'number', example: 3 },
                    content: { type: 'string', example: 'Daily reflection entry' },
                    jsonrpc: { type: 'string', example: '2.0' },
                    id: { type: 'string', example: '1' },
                    method: { type: 'string', example: 'tools/call' },
                    params: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Item created or MCP tool output'
            }
          }
        }
      }
    }
  }

  return NextResponse.json(openApiSpec, {
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
