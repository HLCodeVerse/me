import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfzulmibfmktllnshxox.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjk0OTMsImV4cCI6MjA5NzkwNTQ5M30.QYiOYZ9eQ_epSBRPZhyjOjl185do7tKVQtIBlgdiY0M'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

function formatPhone(val: string) {
  const digits = val.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`
  return val.startsWith('+') ? val : `+${digits}`
}

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json()
    if (!phone || !password) {
      return NextResponse.json({ error: 'Phone number and password are required' }, { status: 400 })
    }

    const cleanPhone = formatPhone(phone)
    const rawDigits = phone.replace(/\D/g, '').slice(-10)

    // Query profiles table server-side
    const { data: existingProfile, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`phone.eq.${cleanPhone},phone.ilike.%${rawDigits}%`)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!existingProfile) {
      return NextResponse.json({ error: 'Mobile number not registered. Please register first!' }, { status: 404 })
    }

    // Check password
    if (existingProfile.password_hash && existingProfile.password_hash !== password) {
      return NextResponse.json({ error: 'Incorrect password. Please check and try again.' }, { status: 401 })
    }

    // Success response with session cookie
    const res = NextResponse.json({ success: true, profile: existingProfile })
    res.cookies.set('nirmaan_session', 'true', { path: '/', maxAge: 2592000, sameSite: 'lax', httpOnly: false })
    res.cookies.set('nirmaan_user_id', existingProfile.id, { path: '/', maxAge: 2592000, sameSite: 'lax', httpOnly: false })
    return res
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Login failed' }, { status: 500 })
  }
}
