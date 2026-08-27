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
        url: 'https://me-eight-dun.vercel.app/api/mcp',
        description: 'Production Vercel NIRMAAN MCP Server'
      },
      {
        url: 'http://localhost:3000/api/mcp',
        description: 'Local Development NIRMAAN MCP Server'
      }
    ],
    paths: {
      '/': {
        post: {
          summary: 'MCP JSON-RPC Protocol Endpoint',
          operationId: 'executeMcpRpc',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
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
              description: 'Successful JSON-RPC Response'
            }
          }
        }
      }
    }
  }

  return NextResponse.json(openApiSpec)
}
