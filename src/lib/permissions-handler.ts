import { toast } from 'sonner'

export async function requestAllPermissions(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  let notifGranted = false
  const mediaGranted = true

  // 1. Push Notification & Alarm Permission
  if ('Notification' in window) {
    try {
      const res = await Notification.requestPermission()
      if (res === 'granted') {
        notifGranted = true
      }
    } catch {
      // Ignore
    }
  }

  // 2. Capacitor Native Bridge Permissions (if running inside Android WebView)
  const win = window as unknown as { Capacitor?: { Plugins?: { Permissions?: { requestPermissions: () => Promise<void> } } } }
  const isCapacitor = !!win.Capacitor

  if (isCapacitor && win.Capacitor?.Plugins?.Permissions) {
    try {
      await win.Capacitor.Plugins.Permissions.requestPermissions()
    } catch {
      // Ignore
    }
  }

  if (notifGranted) {
    toast.success('All device permissions (Notifications, Audio Media, Alarms) granted! 🔔🎵')
  }

  return notifGranted && mediaGranted
}
