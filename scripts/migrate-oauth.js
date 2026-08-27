const { Client } = require('pg')

const client = new Client({
  connectionString: 'postgresql://postgres:Chandan%409777767188@db.mfzulmibfmktllnshxox.supabase.co:5432/postgres'
})

const sql = `
CREATE TABLE IF NOT EXISTS public.mcp_oauth_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  user_id uuid NOT NULL,
  client_id text NOT NULL,
  redirect_uri text,
  scope text DEFAULT 'mcp:read mcp:write',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mcp_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text UNIQUE NOT NULL,
  refresh_token text UNIQUE,
  user_id uuid NOT NULL,
  client_id text,
  scope text DEFAULT 'mcp:read mcp:write',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '365 days'),
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mcp_oauth_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text UNIQUE NOT NULL,
  client_secret text NOT NULL,
  client_name text,
  redirect_uris text[],
  grant_types text[],
  created_at timestamptz DEFAULT now()
);
`

async function main() {
  try {
    await client.connect()
    console.log('Connected to PostgreSQL')
    await client.query(sql)
    console.log('Tables created successfully!')

    // Verify
    const res = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('mcp_oauth_codes', 'mcp_oauth_tokens', 'mcp_oauth_clients')
    `)
    console.log('Created tables:', res.rows.map(r => r.table_name))
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await client.end()
  }
}

main()
