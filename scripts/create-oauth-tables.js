const { createClient } = require('@supabase/supabase-js')

const db = createClient(
  'https://mfzulmibfmktllnshxox.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMyOTQ5MywiZXhwIjoyMDk3OTA1NDkzfQ.KaV1NcBeZRWTtYurPyRWqpuUpghk8wJWVK0CtqO4dA0'
)

const SUPABASE_URL = 'https://mfzulmibfmktllnshxox.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMyOTQ5MywiZXhwIjoyMDk3OTA1NDkzfQ.KaV1NcBeZRWTtYurPyRWqpuUpghk8wJWVK0CtqO4dA0'

async function execSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql })
  })
  const text = await res.text()
  return { status: res.status, body: text }
}

async function main() {
  console.log('Testing DB connection...')
  const { data, error } = await db.from('api_keys').select('id').limit(1)
  if (error) {
    console.error('DB connection error:', error.message)
    return
  }
  console.log('Connected! api_keys has rows:', data?.length)

  // Test if tables already exist
  const { data: codeTable } = await db.from('mcp_oauth_codes').select('id').limit(1)
  console.log('mcp_oauth_codes exists:', codeTable !== null ? 'YES' : 'NO - needs creation')

  const { data: tokenTable } = await db.from('mcp_oauth_tokens').select('id').limit(1)
  console.log('mcp_oauth_tokens exists:', tokenTable !== null ? 'YES' : 'NO - needs creation')

  const { data: clientTable } = await db.from('mcp_oauth_clients').select('id').limit(1)
  console.log('mcp_oauth_clients exists:', clientTable !== null ? 'YES' : 'NO - needs creation')

  // Try exec_sql RPC
  console.log('\nTrying exec_sql RPC...')
  const r = await execSQL('SELECT 1 as test')
  console.log('exec_sql result:', r.status, r.body.slice(0, 200))
}

main().catch(console.error)
