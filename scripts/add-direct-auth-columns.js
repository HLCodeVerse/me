const { Client } = require('pg')

async function updateProfilesTable() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Chandan%409777767188@db.mfzulmibfmktllnshxox.supabase.co:5432/postgres'
  console.log('Connecting to PostgreSQL to add direct auth columns...')

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('Connected!')

    await client.query(`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash text;
      ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
      CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
    `)

    console.log('🎉 Successfully updated profiles table for direct DB auth!')
  } catch (err) {
    console.error('Error updating profiles table:', err.message)
  } finally {
    await client.end()
  }
}

updateProfilesTable()
