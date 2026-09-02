const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfzulmibfmktllnshxox.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMyOTQ5MywiZXhwIjoyMDk3OTA1NDkzfQ.KaV1NcBeZRWTtYurPyRWqpuUpghk8wJWVK0CtqO4dA0'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function checkAndMigrate() {
  console.log('🔍 Checking Supabase connection and tasks table columns...')
  const { data, error } = await supabase.from('tasks').select('*').limit(1)
  if (error) {
    console.error('❌ Supabase error:', error.message)
    process.exit(1)
  }
  console.log('✅ Tasks table retrieved successfully!')
  if (data && data.length > 0) {
    console.log('Sample task keys:', Object.keys(data[0]))
  } else {
    console.log('No tasks found yet, table exists.')
  }
}

checkAndMigrate()
