import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } from '../../notifications/subscribe/route'

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

async function dispatchNotification(userId: string, title: string, body: string, url: string) {
  const { data: subs } = await db
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return 0

  const payload = JSON.stringify({
    title,
    body,
    url,
    icon: '/icon-192.png',
  })

  let successCount = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }, payload)
      successCount++
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((err as any)?.statusCode === 410 || (err as any)?.statusCode === 404) {
        await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }
  }
  return successCount
}

export async function GET() {
  return await handleNotificationDispatch()
}

export async function POST() {
  return await handleNotificationDispatch()
}

async function handleNotificationDispatch() {
  const nowISO = new Date().toISOString()
  let totalDispatched = 0

  try {
    // 1. Check Due Reminders
    const { data: dueReminders } = await db
      .from('reminders')
      .select('id, user_id, title, remind_at')
      .lte('remind_at', nowISO)
      .eq('is_sent', false)

    if (dueReminders && dueReminders.length > 0) {
      for (const rem of dueReminders) {
        const sent = await dispatchNotification(
          rem.user_id,
          '⏰ Scheduled Reminder',
          `Reminder: "${rem.title}" is due now!`,
          '/reminders'
        )
        totalDispatched += sent
        // Mark reminder as sent
        await db.from('reminders').update({ is_sent: true }).eq('id', rem.id)
      }
    }

    // 2. Check Overdue Urgent Tasks (P1/P2)
    const { data: dueTasks } = await db
      .from('tasks')
      .select('id, user_id, title, due_date')
      .lte('due_date', nowISO)
      .neq('status', 'done')
      .limit(10)

    if (dueTasks && dueTasks.length > 0) {
      for (const task of dueTasks) {
        const sent = await dispatchNotification(
          task.user_id,
          '📋 Task Due Alert',
          `Your task "${task.title}" is due today!`,
          '/tasks'
        )
        totalDispatched += sent
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: nowISO,
      dispatched_notifications: totalDispatched,
      reminders_processed: dueReminders?.length || 0,
      tasks_processed: dueTasks?.length || 0,
    })
  } catch (err: unknown) {
    console.error('[Notification Dispatch Error]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Dispatch failed' }, { status: 500 })
  }
}
