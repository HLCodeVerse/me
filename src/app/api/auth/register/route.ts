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
    const { phone, password, displayName } = await req.json()
    if (!phone || !password) {
      return NextResponse.json({ error: 'Phone number and password are required' }, { status: 400 })
    }

    const cleanPhone = formatPhone(phone)
    const cleanUsername = `user_${cleanPhone.replace(/\D/g, '').slice(-10)}`

    // Check if phone already registered
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Mobile number already registered! Please login.' }, { status: 409 })
    }

    const newProfile = {
      id: crypto.randomUUID(),
      username: cleanUsername,
      display_name: displayName || 'Builder',
      phone: cleanPhone,
      password_hash: password,
      timezone: 'Asia/Kolkata',
      life_score: 0,
      current_streak: 0,
      longest_streak: 0,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: createdProfile, error: insertErr } = await (supabase.from('profiles') as any)
      .insert(newProfile)
      .select()
      .single()

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // Seed default life areas
    const areas = [
      { name: 'Career',  icon: '💼', color: '#60A5FA' },
      { name: 'Health',  icon: '🏋️', color: '#34D399' },
      { name: 'Finance', icon: '💰', color: '#F59E0B' },
      { name: 'Mind',    icon: '🧠', color: '#A78BFA' },
      { name: 'Skills',  icon: '⚡', color: '#FB923C' },
    ]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('life_areas') as any).insert(areas.map(a => ({ ...a, user_id: createdProfile.id, target_score: 80 })))

    const res = NextResponse.json({ success: true, profile: createdProfile })
    res.cookies.set('nirmaan_session', 'true', { path: '/', maxAge: 2592000, sameSite: 'lax', httpOnly: false })
    res.cookies.set('nirmaan_user_id', createdProfile.id, { path: '/', maxAge: 2592000, sameSite: 'lax', httpOnly: false })
    return res
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Registration failed' }, { status: 500 })
  }
}
