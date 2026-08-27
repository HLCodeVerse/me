const { Client } = require('pg')

async function fixRlsPolicies() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Chandan%409777767188@db.mfzulmibfmktllnshxox.supabase.co:5432/postgres'
  console.log('Connecting to PostgreSQL to disable RLS restrictions...')

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('Connected to database!')

    const tables = [
      'profiles',
      'api_keys',
      'ai_provider_keys',
      'life_areas',
      'goals',
      'tasks',
      'todos',
      'journal_entries',
      'ai_conversations',
      'ai_messages',
      'lesson_progress',
      'daily_plans',
      'streaks',
      'courses',
      'modules',
      'lessons'
    ]

    for (const t of tables) {
      await client.query(`
        ALTER TABLE ${t} DISABLE ROW LEVEL SECURITY;
      `)
      console.log(`Disabled RLS on table: ${t}`)
    }

    console.log('🎉 Successfully disabled RLS restrictions on all NIRMAAN tables!')
  } catch (err) {
    console.error('Error updating RLS policies:', err.message)
  } finally {
    await client.end()
  }
}

fixRlsPolicies()
