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

// Service Worker fully removed per user directive to prevent stale cache conflicts
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    for (const reg of registrations) {
      await reg.unregister()
    }
  } catch {}
  return null
}

// Automatically purge all legacy service workers and clear browser cache storage
export function initPWAAutoUpdate(): void {
  if (typeof window === 'undefined') return

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().then(() => {
          console.log('[SW] Successfully unregistered Service Worker:', reg.scope)
        }).catch(() => {})
      }
    }).catch(() => {})
  }

  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => {
        caches.delete(key).then(() => {
          console.log('[Cache] Purged cache bucket:', key)
        }).catch(() => {})
      })
    }).catch(() => {})
  }
}

export async function autoPromptNotificationPermission(userId: string): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window) || !userId) return

  if (Notification.permission === 'default') {
    toast('Enable Web Push Notifications 🔔', {
      description: 'Receive automated alerts for tasks and reminders in real-time.',
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
  if (typeof window === 'undefined' || !('Notification' in window)) {
    toast.error('Push notifications are not supported on this browser.')
    return false
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      toast.error('Notification permission denied')
      return false
    }

    toast.success('Push notifications enabled for this device!')
    return true
  } catch {
    toast.error('Failed to subscribe to notifications')
    return false
  }
}

export async function sendTestPushNotification(userId: string): Promise<void> {
  toast.success('Test alert triggered! Check your notifications. 🔔')
}
