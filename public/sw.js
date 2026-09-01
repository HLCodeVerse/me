// Service Worker for NIRMAAN Background Push Notifications
/* eslint-disable no-restricted-globals */

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Listen for incoming WebPush notifications from the server
self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const payload = event.data.json()
    const title = payload.title || 'NIRMAAN Reminder'
    const options = {
      body: payload.body || 'You have an upcoming task or scheduled reminder.',
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      tag: payload.tag || 'nirmaan-notification',
      renotify: true,
      data: {
        url: payload.url || '/reminders',
        timestamp: Date.now(),
      },
      actions: [
        { action: 'open', title: 'Open App 🚀' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    }

    event.waitUntil(
      self.registration.showNotification(title, options)
    )
  } catch (err) {
    console.error('Error handling push event:', err)
  }
})

// Handle click on native OS notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
