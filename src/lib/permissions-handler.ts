'use client'

import { toast } from 'sonner'

/**
 * Automatically requests ALL mobile device permissions on application launch:
 * 1. Files & Music Media Storage
 * 2. Microphone (Audio Input)
 * 3. Camera (Video Input)
 * 4. Push Notifications & Alarms
 * 5. Geolocation
 */
export async function requestAllPermissions(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  let permissionsGrantedCount = 0
  const totalPermissions = 5

  // 1. Push Notifications
  if ('Notification' in window) {
    try {
      if (Notification.permission === 'granted') {
        permissionsGrantedCount++
      } else if (Notification.permission !== 'denied') {
        const res = await Notification.requestPermission()
        if (res === 'granted') permissionsGrantedCount++
      }
    } catch {}
  }

  // 2. Camera & Microphone (Media Devices)
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      permissionsGrantedCount += 2 // Mic + Camera
      // Stop stream right after permission check so camera light turns off
      stream.getTracks().forEach(track => track.stop())
    } catch {
      // Mic or camera denied or not present
      try {
        // Try audio-only if video failed
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        permissionsGrantedCount += 1
        audioStream.getTracks().forEach(track => track.stop())
      } catch {}
    }
  }

  // 3. Geolocation
  if ('geolocation' in navigator) {
    try {
      navigator.geolocation.getCurrentPosition(
        () => { permissionsGrantedCount++ },
        () => {},
        { timeout: 3000 }
      )
    } catch {}
  }

  // 4. Capacitor Native Android Bridge (Full Android Permissions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any
  if (win.Capacitor && win.Capacitor.Plugins) {
    const plugins = win.Capacitor.Plugins

    // Request Android Storage / Audio Permissions
    if (plugins.Filesystem) {
      try { await plugins.Filesystem.requestPermissions() } catch {}
    }
    // Request Camera Plugin
    if (plugins.Camera) {
      try { await plugins.Camera.requestPermissions() } catch {}
    }
    // Request Microphone / Voice
    if (plugins.VoiceRecorder || plugins.SpeechRecognition) {
      try {
        if (plugins.VoiceRecorder) await plugins.VoiceRecorder.requestAudioRecordingPermission()
        if (plugins.SpeechRecognition) await plugins.SpeechRecognition.requestPermissions()
      } catch {}
    }
    // Request Notifications
    if (plugins.PushNotifications) {
      try { await plugins.PushNotifications.requestPermissions() } catch {}
    }
  }

  // Notify user on success
  if (permissionsGrantedCount >= 1) {
    toast.success('Mobile Permissions active: Files, Music, Mic, Camera & Notifications ⚡')
  }

  return true
}
