const { createClient } = require('@supabase/supabase-js')

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMyOTQ5MywiZXhwIjoyMDk3OTA1NDkzfQ.KaV1NcBeZRWTtYurPyRWqpuUpghk8wJWVK0CtqO4dA0'
const db = createClient('https://mfzulmibfmktllnshxox.supabase.co', SERVICE_KEY)

const BASE = 'https://me-eight-dun.vercel.app'
const TEST_USER_ID = 'c9d3517e-542b-4cf4-9bce-ebda2502252f'

async function run() {
  console.log('=== FULL CHATGPT CONNECTOR SIMULATION ===\n')

  // Step 1: OIDC Discovery (what ChatGPT hits first)
  console.log('--- Step 1: Root OIDC Discovery ---')
  const disc = await fetch(BASE + '/.well-known/openid-configuration')
  const discData = await disc.json()
  console.log('Status:', disc.status)
  console.log('userinfo_endpoint:', discData.userinfo_endpoint)
  console.log('token_endpoint:', discData.token_endpoint)
  console.log('registration_endpoint:', discData.registration_endpoint)
  const CORRECT_USERINFO = discData.userinfo_endpoint === BASE + '/api/mcp/oauth/userinfo'
  console.log('✅ userinfo correct:', CORRECT_USERINFO)

  // Step 2: Dynamic Client Registration
  console.log('\n--- Step 2: Dynamic Client Registration ---')
  const regRes = await fetch(BASE + '/api/mcp/oauth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'ChatGPT Simulation',
      redirect_uris: ['https://chatgpt.com/aip/g-p-test/oauth/callback'],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none'
    })
  })
  const regData = await regRes.json()
  console.log('Status:', regRes.status)
  console.log('client_id:', regData.client_id?.slice(0, 30) + '...')
  console.log('✅ Registration OK:', !!regData.client_id)
  const CLIENT_ID = regData.client_id
  const REDIRECT_URI = 'https://chatgpt.com/aip/g-p-test/oauth/callback'

  // Step 3: Simulate user clicking Approve (calls our /api/mcp/oauth/code)
  console.log('\n--- Step 3: Authorize Page → Code Generation ---')
  const codeRes = await fetch(BASE + '/api/mcp/oauth/code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: TEST_USER_ID,
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: 'mcp:read mcp:write'
    })
  })
  const codeData = await codeRes.json()
  console.log('Status:', codeRes.status)
  console.log('Code prefix:', codeData.code?.slice(0, 20) + '...')
  console.log('✅ Code generated:', !!codeData.code)
  const CODE = codeData.code

  // Step 4: ChatGPT exchanges code for token
  console.log('\n--- Step 4: Token Exchange (ChatGPT backend) ---')
  const tokBody = new URLSearchParams({
    grant_type: 'authorization_code',
    code: CODE,
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    // ChatGPT also sends code_verifier for PKCE
    code_verifier: 'test_verifier_dummyxxxxxxxxxxxxxxxxxxxxxx',
  })
  const tokRes = await fetch(BASE + '/api/mcp/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokBody.toString()
  })
  const tokData = await tokRes.json()
  console.log('Status:', tokRes.status)
  console.log('access_token prefix:', tokData.access_token?.slice(0, 20) + '...')
  console.log('Error:', tokData.error, tokData.error_description)
  console.log('✅ Token issued:', !!tokData.access_token)
  const ACCESS_TOKEN = tokData.access_token

  if (!ACCESS_TOKEN) {
    console.log('\n❌ FAILED AT TOKEN STEP')
    return
  }

  // Step 5: ChatGPT calls userinfo for OBI sync
  console.log('\n--- Step 5: Userinfo (OBI Sync) ---')
  const uiRes = await fetch(BASE + '/api/mcp/oauth/userinfo', {
    headers: { 'Authorization': 'Bearer ' + ACCESS_TOKEN }
  })
  const uiData = await uiRes.json()
  console.log('Status:', uiRes.status)
  console.log('sub:', uiData.sub?.slice(0, 16) + '...')
  console.log('name:', uiData.name)
  console.log('email:', uiData.email)
  console.log('Error:', uiData.error, uiData.error_description)
  console.log('✅ Userinfo OK:', !!uiData.sub)

  // Step 6: ChatGPT calls MCP with the token
  console.log('\n--- Step 6: MCP Call with Token ---')
  const mcpRes = await fetch(BASE + '/api/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + ACCESS_TOKEN
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
  })
  const mcpData = await mcpRes.json()
  console.log('Status:', mcpRes.status)
  console.log('MCP result:', JSON.stringify(mcpData).slice(0, 200))
  console.log('✅ MCP OK:', mcpRes.status === 200)

  console.log('\n=== SUMMARY ===')
  console.log('All steps passed:', !!uiData.sub && !!tokData.access_token && mcpRes.status === 200)

  // Cleanup
  if (ACCESS_TOKEN) {
    await db.from('mcp_oauth_tokens').delete().eq('access_token', ACCESS_TOKEN)
  }
  if (CLIENT_ID) {
    await db.from('mcp_oauth_clients').delete().eq('client_id', CLIENT_ID)
  }
}

run().catch(console.error)
