import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfzulmibfmktllnshxox.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjk0OTMsImV4cCI6MjA5NzkwNTQ5M30.QYiOYZ9eQ_epSBRPZhyjOjl185do7tKVQtIBlgdiY0M'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  // 1. Check nirmaan_user_id cookie from direct mobile auth
  const cookieUserId = req.cookies.get('nirmaan_user_id')?.value
  if (cookieUserId && cookieUserId.trim().length > 0) {
    return cookieUserId.trim()
  }

  // 2. Check Authorization Bearer Key
  const authHeader = req.headers.get('authorization')
  if (authHeader) {
    const rawKey = authHeader.replace('Bearer ', '').trim()
    if (rawKey.length > 0) {
      const prefix = rawKey.slice(0, 12)
      const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey))
      const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')

      const { data } = await supabase
        .from('api_keys')
        .select('user_id')
        .eq('key_prefix', prefix)
        .eq('key_hash', hashHex)
        .is('revoked_at', null)
        .maybeSingle()

      if (data?.user_id) return data.user_id
    }
  }

  // Strict requirement: NO unauthenticated fallbacks!
  return null
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req)
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required. Please log in first.', require_login: true }, { status: 401 })
  }

  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ keys: keys || [] })
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req)
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required. Please log in first.', require_login: true }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const name = (body.name || 'AI Assistant Key').trim()

  const rawKey = `nir_${crypto.randomUUID().replace(/-/g, '')}`
  const prefix = rawKey.slice(0, 12)
  const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey))
  const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')

  // Insert into Supabase database api_keys table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: createdKey, error } = await (supabase.from('api_keys') as any)
    .insert({
      user_id: userId,
      name,
      key_hash: hashHex,
      key_prefix: prefix,
      scopes: ['tasks', 'todos', 'journal', 'goals', 'ai'],
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: `Database save failed: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true, key: createdKey, rawKey })
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserIdFromRequest(req)
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required. Please log in first.', require_login: true }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Key ID is required' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('api_keys') as any)
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
