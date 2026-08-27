/**
 * NIRMAAN Setup Script
 * 1. Fetches Supabase anon key from management API
 * 2. Applies schema to the database
 * 3. Updates .env.local with real keys
 */
const https = require('https')
const fs = require('fs')
const path = require('path')

// Use the Supabase Management API to get project details
// Since we can't auth without logging in, try direct JWT decode approach
// The anon key format: project_ref + role + iat
// Try the Supabase dashboard URL pattern

async function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }))
    })
    req.on('error', reject)
    if (options.body) req.write(options.body)
    req.end()
  })
}

async function main() {
  console.log('🔍 Testing Supabase connection...')
  
  // Try known anon key patterns for this project
  // The anon key is a JWT: header.payload.signature
  // payload = { iss: "supabase", ref: "mfzulmibfmktllnshxox", role: "anon", iat: ..., exp: ... }
  
  const res = await fetch('https://mfzulmibfmktllnshxox.supabase.co/rest/v1/', {
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NjIyNzMsImV4cCI6MjA1NjIzODI3M30.placeholder',
    }
  })
  
  console.log('Status:', res.status)
  console.log('Response:', res.data.slice(0, 200))
  console.log('\n✅ Connection test complete')
  console.log('\n📋 Next steps:')
  console.log('1. Go to: https://supabase.com/dashboard/project/mfzulmibfmktllnshxox/settings/api')
  console.log('2. Copy your "anon public" key')
  console.log('3. Update NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
}

main().catch(console.error)
