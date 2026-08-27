const { Client } = require('pg')
const crypto = require('crypto')

async function registerUser() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Chandan%409777767188@db.mfzulmibfmktllnshxox.supabase.co:5432/postgres'
  console.log('Connecting to PostgreSQL database...')

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('Connected to database!')

    const phone = '+919777767188'
    const rawPhone = '9777767188'
    const password = 'Chandan@9777767188.'
    const username = `user_${rawPhone}`
    const displayName = 'Chandan'

    // Check if user already exists
    const checkRes = await client.query('SELECT * FROM profiles WHERE phone = $1 OR username = $2', [phone, username])
    let userId

    if (checkRes.rows.length > 0) {
      userId = checkRes.rows[0].id
      console.log(`User already exists with ID: ${userId}. Updating password & details...`)
      await client.query(`
        UPDATE profiles
        SET phone = $1, password_hash = $2, display_name = $3
        WHERE id = $4
      `, [phone, password, displayName, userId])
    } else {
      userId = crypto.randomUUID()
      console.log(`Inserting new user with ID: ${userId}...`)
      await client.query(`
        INSERT INTO profiles (id, username, display_name, phone, password_hash, timezone, life_score, current_streak, longest_streak)
        VALUES ($1, $2, $3, $4, $5, 'Asia/Kolkata', 85, 5, 12)
      `, [userId, username, displayName, phone, password])
    }

    // Seed default life areas
    const areas = [
      { name: 'Career',  icon: '💼', color: '#60A5FA' },
      { name: 'Health',  icon: '🏋️', color: '#34D399' },
      { name: 'Finance', icon: '💰', color: '#F59E0B' },
      { name: 'Mind',    icon: '🧠', color: '#A78BFA' },
      { name: 'Skills',  icon: '⚡', color: '#FB923C' },
    ]

    for (const a of areas) {
      await client.query(`
        INSERT INTO life_areas (id, user_id, name, icon, color, target_score)
        VALUES ($1, $2, $3, $4, $5, 80)
        ON CONFLICT DO NOTHING
      `, [crypto.randomUUID(), userId, a.name, a.icon, a.color])
    }

    // Seed sample focus tasks
    const sampleTasks = [
      { title: 'Complete NIRMAAN OS Setup & Testing', priority: 4, status: 'in_progress' },
      { title: 'Review OpenRouter AI Fallback Integration', priority: 3, status: 'todo' },
      { title: 'Reflect on Weekly Goals & Skill Milestones', priority: 2, status: 'todo' },
    ]

    for (const t of sampleTasks) {
      await client.query(`
        INSERT INTO tasks (id, user_id, title, priority, status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [crypto.randomUUID(), userId, t.title, t.priority, t.status])
    }

    console.log('🎉 Registered user 9777767188 successfully!')
    console.log(`Mobile: ${phone}`)
    console.log(`Password: ${password}`)
  } catch (err) {
    console.error('Registration failed:', err.message)
  } finally {
    await client.end()
  }
}

registerUser()
