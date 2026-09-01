import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfzulmibfmktllnshxox.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMyOTQ5MywiZXhwIjoyMDk3OTA1NDkzfQ.KaV1NcBeZRWTtYurPyRWqpuUpghk8wJWVK0CtqO4dA0'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjk0OTMsImV4cCI6MjA5NzkwNTQ5M30.QYiOYZ9eQ_epSBRPZhyjOjl185do7tKVQtIBlgdiY0M'

const db = createClient(SUPABASE_URL, SERVICE_KEY || ANON_KEY)

// Public & Private VAPID Key (Standard WebPush VAPID key)
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BOfEZCzKLg0jG7s1rkGkHTmdABWepaC6JQI1qwe8L_-DR_QGLMK4XwWrwZeCnInuG0b_JdT_Ce2iUtvDFUMSRTQ'
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '4KLifKSr6MtbL_0N7moJkhklpNO0ESN9aRTDI1uOEj0'

export async function GET() {
  return NextResponse.json({ publicKey: VAPID_PUBLIC_KEY })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId: bodyUserId, subscription, userAgent } = body
    const userId = bodyUserId || req.headers.get('x-user-id')

    if (!userId || !subscription?.endpoint) {
      return NextResponse.json({ error: 'Missing userId or subscription endpoint' }, { status: 400 })
    }

    const { endpoint, keys } = subscription

    // Upsert push subscription into Supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db.from('push_subscriptions') as any).upsert({
      user_id: userId,
      endpoint: endpoint,
      p256dh: keys?.p256dh || '',
      auth: keys?.auth || '',
      user_agent: userAgent || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })

    if (error) {
      console.error('Push subscription save error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Subscription saved' })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { endpoint } = body
    if (endpoint) {
      await db.from('push_subscriptions').delete().eq('endpoint', endpoint)
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 })
  }
}
