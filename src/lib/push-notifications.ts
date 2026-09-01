import { toast } from 'sonner'

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    return registration
  } catch (err) {
    console.error('Service worker registration failed:', err)
    return null
  }
}

// Automatically detect when new code is pushed/deployed and update PWA SW instantly
export function initPWAAutoUpdate(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  // Unregister legacy broken service workers if needed & force update
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.update().catch(() => {})
    }
  })

  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((registration) => {
    // Force immediate check on launch
    registration.update().catch(() => {})

    // Check for updates periodically every 15 seconds
    setInterval(() => {
      registration.update().catch(() => {})
    }, 15 * 1000)

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          newWorker.postMessage({ type: 'SKIP_WAITING' })
          newWorker.postMessage({ type: 'CLEAR_CACHE' })
          toast.success('✨ New NIRMAAN version deployed! Auto-updating...', { duration: 3000 })
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        }
      })
    })
  }).catch(() => {})

  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true
      window.location.reload()
    }
  })
}

// Automatically prompt user for push notification permission on web app open if default
export async function autoPromptNotificationPermission(userId: string): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window) || !userId) return

  if (Notification.permission === 'default') {
    toast('Enable Background Push Notifications 🔔', {
      description: 'Receive automated alerts for tasks and reminders even when NIRMAAN is closed.',
      action: {
        label: 'Enable Now',
        onClick: () => {
          subscribeToPushNotifications(userId)
        },
      },
      duration: 12000,
    })
  }
}

export async function subscribeToPushNotifications(userId: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    toast.error('Push notifications are not supported on this browser/device.')
    return false
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      toast.error('Notification permission was denied. Enable notifications in browser settings.')
      return false
    }

    const registration = await registerServiceWorker()
    if (!registration) {
      toast.error('Could not register notification service worker.')
      return false
    }

    // Fetch VAPID key from server
    const keyRes = await fetch('/api/notifications/subscribe')
    const keyData = await keyRes.json()
    const publicKey = keyData.publicKey

    if (!publicKey) {
      toast.error('Server VAPID key not configured.')
      return false
    }

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(publicKey)
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      })
    }

    const subJson = subscription.toJSON()
    const res = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: JSON.stringify({
        userId,
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth,
          },
        },
        userAgent: navigator.userAgent,
      }),
    })

    if (res.ok) {
      toast.success('Automatic Background Push Notifications Enabled! 🔔', {
        description: 'You will receive reminders automatically even when NIRMAAN is closed.',
      })
      return true
    } else {
      toast.error('Failed to save push subscription to server.')
      return false
    }
  } catch (err) {
    console.error('Push subscription failed:', err)
    toast.error('Could not enable device push notifications.')
    return false
  }
}

export async function sendTestPushNotification(userId: string): Promise<void> {
  try {
    const res = await fetch('/api/notifications/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: JSON.stringify({ userId }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      toast.success('Test notification dispatched! Check your device alerts. 🔔')
    } else {
      toast.error(data.error || 'Failed to send test push notification.')
    }
  } catch {
    toast.error('Error triggering test push notification.')
  }
}
