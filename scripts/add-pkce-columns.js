/**
 * Migration: Add PKCE columns to mcp_oauth_codes
 * Run: node scripts/add-pkce-columns.js
 *
 * Required for OAuth 2.1 compliance — ChatGPT sends code_challenge / code_verifier.
 */
const { Client } = require('pg')

const client = new Client({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://postgres:Chandan%409777767188@db.mfzulmibfmktllnshxox.supabase.co:5432/postgres'
})

const sql = `
-- Add PKCE columns to mcp_oauth_codes (idempotent)
ALTER TABLE public.mcp_oauth_codes
  ADD COLUMN IF NOT EXISTS code_challenge text,
  ADD COLUMN IF NOT EXISTS code_challenge_method text DEFAULT 'S256';

-- Add index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_codes_code ON public.mcp_oauth_codes(code);
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_access ON public.mcp_oauth_tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_refresh ON public.mcp_oauth_tokens(refresh_token);
`

async function main() {
  try {
    await client.connect()
    console.log('✅ Connected to PostgreSQL')
    await client.query(sql)
    console.log('✅ PKCE columns added successfully!')

    const res = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'mcp_oauth_codes'
        AND column_name IN ('code_challenge', 'code_challenge_method')
    `)
    console.log('Columns verified:', res.rows)
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
