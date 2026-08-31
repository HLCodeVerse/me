import { NextRequest, NextResponse } from 'next/server'

function getOrigin(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'me-eight-dun.vercel.app'
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req)

  const openApiSpec = {
    openapi: '3.1.0',
    info: {
      title: 'NIRMAAN OS – Personal Productivity AI API',
      description: 'Actions API for NIRMAAN Personal OS. Create tasks, todos, journal entries, and read your life dashboard from ChatGPT and other AI clients.',
      version: '1.0.0'
    },
    servers: [
      {
        url: origin,
        description: 'NIRMAAN Server'
      }
    ],
    // Both Bearer (API Key) and OAuth2 flows supported
    security: [{ BearerAuth: [] }, { OAuth2: ['mcp:read', 'mcp:write'] }],
    components: {
      securitySchemes: {
        // Direct API key (for Claude Desktop, Cursor, Windsurf)
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'nir_token',
          description: 'Personal API Key from NIRMAAN MCP settings page'
        },
        // OAuth 2.0 Authorization Code + PKCE (for ChatGPT connector)
        OAuth2: {
          type: 'oauth2',
          description: 'OAuth 2.1 with PKCE — used by ChatGPT and other MCP-compatible clients',
          flows: {
            authorizationCode: {
              authorizationUrl: `${origin}/api/mcp/oauth/authorize`,
              tokenUrl: `${origin}/api/mcp/oauth/token`,
              refreshUrl: `${origin}/api/mcp/oauth/token`,
              scopes: {
                'mcp:read': 'Read tasks, todos, journal entries, goals, and life dashboard',
                'mcp:write': 'Create and update tasks, todos, journal entries, and goals',
                'openid': 'OpenID Connect identity',
                'profile': 'User profile information',
                'email': 'User email address'
              }
            }
          }
        }
      },
      schemas: {
        Task: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            priority: { type: 'integer', minimum: 1, maximum: 4 },
            status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
            due_date: { type: 'string', nullable: true },
            created_at: { type: 'string' }
          }
        },
        Todo: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            is_done: { type: 'boolean' }
          }
        }
      }
    },
    paths: {
      '/api/mcp': {
        get: {
          summary: 'Get life dashboard summary or task list',
          description: 'Retrieve the user\'s NIRMAAN OS dashboard including life score, active tasks, todos, and streaks.',
          operationId: 'getDashboard',
          security: [{ BearerAuth: [] }, { OAuth2: ['mcp:read'] }],
          parameters: [
            {
              name: 'action',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['dashboard', 'tasks'] },
              description: '"dashboard" returns life score + recent tasks + todos. "tasks" returns all tasks.'
            }
          ],
          responses: {
            '200': {
              description: 'Dashboard or task list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      profile: { type: 'object' },
                      tasks: { type: 'array', items: { '$ref': '#/components/schemas/Task' } },
                      todos: { type: 'array', items: { '$ref': '#/components/schemas/Todo' } }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized — invalid or missing Bearer token' }
          }
        },
        post: {
          summary: 'Create a task, todo, or journal entry (or send MCP JSON-RPC)',
          description: 'Create items in the user\'s NIRMAAN OS account. Supports direct REST actions and MCP JSON-RPC 2.0 protocol.',
          operationId: 'createItem',
          security: [{ BearerAuth: [] }, { OAuth2: ['mcp:write'] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    action: {
                      type: 'string',
                      enum: ['create_task', 'create_journal'],
                      description: 'Action to perform (REST mode)'
                    },
                    title: {
                      type: 'string',
                      description: 'Task title (for create_task)'
                    },
                    priority: {
                      type: 'integer',
                      minimum: 1,
                      maximum: 4,
                      description: '1=low, 2=medium, 3=high, 4=urgent'
                    },
                    due_date: {
                      type: 'string',
                      description: 'ISO date string e.g. 2026-09-01'
                    },
                    content: {
                      type: 'string',
                      description: 'Journal entry text (for create_journal)'
                    },
                    mood: {
                      type: 'string',
                      description: 'Mood emoji e.g. ⚡ 🔥 🧘'
                    },
                    jsonrpc: { type: 'string', example: '2.0', description: 'JSON-RPC version for MCP protocol' },
                    id: { type: 'string', description: 'JSON-RPC request ID' },
                    method: {
                      type: 'string',
                      enum: ['initialize', 'tools/list', 'tools/call'],
                      description: 'MCP JSON-RPC method'
                    },
                    params: { type: 'object', description: 'JSON-RPC parameters' }
                  }
                },
                examples: {
                  createTask: {
                    summary: 'Create a task (REST)',
                    value: { action: 'create_task', title: 'Review project docs', priority: 3 }
                  },
                  createJournal: {
                    summary: 'Write a journal entry (REST)',
                    value: { content: 'Today I focused on deep work for 3 hours.', mood: '🔥' }
                  },
                  mcpListTools: {
                    summary: 'MCP: list available tools',
                    value: { jsonrpc: '2.0', id: '1', method: 'tools/list', params: {} }
                  },
                  mcpCallTool: {
                    summary: 'MCP: call a tool',
                    value: {
                      jsonrpc: '2.0', id: '2', method: 'tools/call',
                      params: { name: 'get_life_dashboard', arguments: {} }
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Item created successfully or MCP JSON-RPC response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                      task: { '$ref': '#/components/schemas/Task' }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' }
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
      'Content-Type': 'application/json',
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
