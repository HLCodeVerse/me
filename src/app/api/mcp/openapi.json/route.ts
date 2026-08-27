import { NextResponse } from 'next/server'

export async function GET() {
  const openApiSpec = {
    openapi: '3.0.1',
    info: {
      title: 'NIRMAAN OS MCP API',
      description: 'Model Context Protocol and Actions integration API for NIRMAAN Personal OS. Connect Grok, ChatGPT, Claude, and Cursor.',
      version: 'v1.0.0'
    },
    servers: [
      {
        url: 'https://me-eight-dun.vercel.app',
        description: 'Production Vercel NIRMAAN Server'
      },
      {
        url: 'http://localhost:3000',
        description: 'Local NIRMAAN Server'
      }
    ],
    security: [],
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

  return NextResponse.json(openApiSpec)
}
