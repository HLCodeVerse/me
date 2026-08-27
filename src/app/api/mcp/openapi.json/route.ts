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
    security: [{ BearerAuth: [] }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'nir_token',
          description: 'Bearer token obtained via OAuth2 authorization flow'
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
          security: [{ BearerAuth: [] }],
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
          summary: 'Create a task, todo, or journal entry',
          description: 'Create items in the user\'s NIRMAAN OS account. Set "action" to "create_task", or include "content" for a journal entry.',
          operationId: 'createItem',
          security: [{ BearerAuth: [] }],
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
                      description: 'Action to perform'
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
                    method: { type: 'string', description: 'JSON-RPC method e.g. tools/call' },
                    params: { type: 'object', description: 'JSON-RPC parameters' }
                  }
                },
                examples: {
                  createTask: {
                    summary: 'Create a task',
                    value: { action: 'create_task', title: 'Review project docs', priority: 3 }
                  },
                  createJournal: {
                    summary: 'Write a journal entry',
                    value: { content: 'Today I focused on deep work for 3 hours.', mood: '🔥' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Item created successfully',
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
