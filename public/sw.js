// Service Worker for NIRMAAN Background Push Notifications & PWA Auto-Updates
/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'nirmaan-cache-v4.0'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[SW] Purging legacy cache:', cacheName)
          return caches.delete(cacheName)
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Listen for messages from client (e.g. force SW update when new code is deployed)
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data.type === 'CLEAR_CACHE')) {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    self.skipWaiting()
  }
})

// Network-First strategy for HTML navigations: Ensures new deployments on GitHub/Vercel update instantly!
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    )
  }
})

// Robust WebPush notification listener (handles both JSON and text payloads)
self.addEventListener('push', (event) => {
  let title = 'NIRMAAN OS Notification'
  let options = {
    body: 'You have a new update or scheduled reminder.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'nirmaan-notification',
    renotify: true,
    data: { url: '/reminders', timestamp: Date.now() },
  }

  if (event.data) {
    try {
      const payload = event.data.json()
      title = payload.title || title
      options.body = payload.body || options.body
      options.icon = payload.icon || options.icon
      options.badge = payload.badge || options.badge
      options.tag = payload.tag || options.tag
      if (payload.url) options.data.url = payload.url
    } catch {
      options.body = event.data.text() || options.body
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
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


