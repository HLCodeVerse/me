const { Client } = require('pg')

const DATABASE_URL = 'postgresql://postgres:Chandan%409777767188@db.mfzulmibfmktllnshxox.supabase.co:5432/postgres'

const UNIFY_MIGRATION_SQL = `
-- 1. Add new columns to public.tasks if they do not exist
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'todo'::text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_time TEXT DEFAULT NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'one-time'::text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_dates JSONB DEFAULT '{}'::jsonb;

-- 2. Add performance indexes on user_id + category & user_id + due_date
CREATE INDEX IF NOT EXISTS idx_tasks_user_category ON public.tasks(user_id, category);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due_date ON public.tasks(user_id, due_date);

-- 3. Migrate existing todos into tasks if public.todos table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'todos') THEN
    INSERT INTO public.tasks (user_id, title, status, due_date, category, created_at, completed_at)
    SELECT
      user_id,
      title,
      CASE WHEN is_done THEN 'done' ELSE 'todo' END as status,
      due_date::timestamp with time zone,
      'todo' as category,
      created_at,
      CASE WHEN is_done THEN created_at ELSE NULL END as completed_at
    FROM public.todos
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
`

async function runUnifyMigration() {
  console.log('🚀 Connecting to Supabase PostgreSQL DB...')
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log('✅ Connected to Supabase DB!')

  console.log('⚡ Executing unify tasks schema migration...')
  await client.query(UNIFY_MIGRATION_SQL)
  console.log('✅ Migration SQL executed successfully!')

  // Verify new columns on public.tasks
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tasks';
  `)

  console.log('\n📋 Current columns on public.tasks table:')
  res.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`))

  await client.end()
  console.log('\n🎉 DB Migration fully complete!')
}

runUnifyMigration().catch(err => {
  console.error('❌ Migration failed:', err.message)
  process.exit(1)
})
