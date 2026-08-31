// NIRMAAN v3 — Migration: new tables for reminders, notes, habits, habit_logs, push_subscriptions
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://mfzulmibfmktllnshxox.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMyOTQ5MywiZXhwIjoyMDk3OTA1NDkzfQ.KaV1NcBeZRWTtYurPyRWqpuUpghk8wJWVK0CtqO4dA0'

const db = createClient(SUPABASE_URL, SERVICE_KEY)

const MIGRATIONS = [
  {
    name: 'reminders',
    sql: `
      CREATE TABLE IF NOT EXISTS reminders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT,
        remind_at TIMESTAMPTZ NOT NULL,
        repeat_rule TEXT DEFAULT NULL,
        is_sent BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;
    `
  },
  {
    name: 'notes',
    sql: `
      CREATE TABLE IF NOT EXISTS notes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        title TEXT,
        content TEXT NOT NULL,
        is_pinned BOOLEAN DEFAULT false,
        tags TEXT[] DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
    `
  },
  {
    name: 'habits',
    sql: `
      CREATE TABLE IF NOT EXISTS habits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        icon TEXT DEFAULT '⭐',
        color TEXT DEFAULT '#34D399',
        frequency TEXT DEFAULT 'daily',
        target_count INT DEFAULT 1,
        archived BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      ALTER TABLE habits DISABLE ROW LEVEL SECURITY;
    `
  },
  {
    name: 'habit_logs',
    sql: `
      CREATE TABLE IF NOT EXISTS habit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
        count INT DEFAULT 1,
        note TEXT,
        UNIQUE(habit_id, logged_at)
      );
      ALTER TABLE habit_logs DISABLE ROW LEVEL SECURITY;
    `
  },
  {
    name: 'push_subscriptions',
    sql: `
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;
    `
  }
]

async function runMigration(migration) {
  console.log(`\n▸ Migrating: ${migration.name}...`)
  // Use raw SQL via rpc or just try a select and create via insert
  // Since Supabase JS client doesn't support raw DDL, we'll test with a simple insert
  // The actual table creation needs to be done via the SQL editor or Supabase CLI
  // But we can verify existence by attempting a select
  const { error } = await db.from(migration.name).select('id').limit(1)
  if (!error) {
    console.log(`  ✅ Table '${migration.name}' already exists`)
    return true
  }
  console.log(`  ⚠️  Table '${migration.name}' does not exist — run SQL in Supabase dashboard`)
  console.log(`\n  SQL to run:\n  ${migration.sql}`)
  return false
}

async function main() {
  console.log('NIRMAAN v3 Migration Check\n' + '─'.repeat(40))
  const results = []
  for (const m of MIGRATIONS) {
    const ok = await runMigration(m)
    results.push({ name: m.name, ok })
  }
  console.log('\n' + '─'.repeat(40))
  const missing = results.filter(r => !r.ok)
  if (missing.length === 0) {
    console.log('✅ All tables exist!')
  } else {
    console.log(`⚠️  ${missing.length} table(s) need to be created in Supabase SQL editor:`)
    missing.forEach(m => console.log(`   - ${m.name}`))
    console.log('\nRun scripts/migrate-v3.sql in Supabase SQL Editor')
  }
}

main().catch(console.error)
