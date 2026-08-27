const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function runMigration() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Chandan%409777767188@db.mfzulmibfmktllnshxox.supabase.co:5432/postgres'
  console.log('Connecting to PostgreSQL database at Supabase...')

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connected to database!')

    const schemaSql = fs.readFileSync(path.join(__dirname, '../supabase/schema.sql'), 'utf8')
    console.log('Executing schema.sql...')

    await client.query(schemaSql)
    console.log('🎉 Database Schema & Seeds applied successfully to Supabase!')
  } catch (err) {
    console.error('❌ Migration failed:', err.message)
  } finally {
    await client.end()
  }
}

runMigration()
