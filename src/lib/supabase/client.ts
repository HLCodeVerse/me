import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/database.types'

const DEFAULT_URL = 'https://mfzulmibfmktllnshxox.supabase.co'
const VALID_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjk0OTMsImV4cCI6MjA5NzkwNTQ5M30.QYiOYZ9eQ_epSBRPZhyjOjl185do7tKVQtIBlgdiY0M'

function getAnonKey() {
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (envKey && envKey.includes('mfzulmibfmktllnshxox')) return envKey
  return VALID_ANON_KEY
}

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL,
    getAnonKey()
  )
}
