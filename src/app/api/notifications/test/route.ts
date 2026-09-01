import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } from '../subscribe/route'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfzulmibfmktllnshxox.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMyOTQ5MywiZXhwIjoyMDk3OTA1NDkzfQ.KaV1NcBeZRWTtYurPyRWqpuUpghk8wJWVK0CtqO4dA0'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1menVsbWliZm1rdGxsbnNoeG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjk0OTMsImV4cCI6MjA5NzkwNTQ5M30.QYiOYZ9eQ_epSBRPZhyjOjl185do7tKVQtIBlgdiY0M'

const db = createClient(SUPABASE_URL, SERVICE_KEY || ANON_KEY)

try {
  webpush.setVapidDetails(
    'mailto:notifications@nirmaan.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
} catch {}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const userId = body.userId || req.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Fetch user push subscriptions
    const { data: subs, error } = await db
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (error || !subs || subs.length === 0) {
      return NextResponse.json({ error: 'No active push subscriptions found for this device. Please enable notifications first.' }, { status: 404 })
    }

    const payload = JSON.stringify({
      title: '🔔 NIRMAAN OS Notification Test',
      body: 'Automatic background notifications are working perfectly on your device!',
      url: '/reminders',
      icon: '/icon-192.png',
    })

    let sentCount = 0
    for (const sub of subs) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }
        await webpush.sendNotification(pushSubscription, payload)
        sentCount++
      } catch (err: unknown) {
        console.error('Error sending push notification:', err)
        // Clean up expired subscriptions (404/410 Gone)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((err as any)?.statusCode === 410 || (err as any)?.statusCode === 404) {
          await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    }

    return NextResponse.json({ success: true, sentCount, message: `Dispatched notification to ${sentCount} device(s).` })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 })
  }
}
