import { toast } from 'sonner'

export interface ScheduledAlarm {
  id: string
  title: string
  scheduledTime: number // timestamp ms
  ringtoneUrl?: string
  type: 'task' | 'todo' | 'reminder' | 'meditation'
  isTriggered?: boolean
}

const RINGTONE_STORAGE_KEY = 'nirmaan_alarm_ringtone_v1'
const ALARMS_STORAGE_KEY = 'nirmaan_scheduled_alarms_v1'

let alarmAudioInstance: HTMLAudioElement | null = null

// Get user selected custom ringtone URL (defaults to built-in ambient track)
export function getSelectedRingtone(): string {
  if (typeof window === 'undefined') return ''
  try {
    return localStorage.getItem(RINGTONE_STORAGE_KEY) || 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3'
  } catch {
    return 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3'
  }
}

// Set user selected custom ringtone URL from media tracks
export function setSelectedRingtone(ringtoneUrl: string, trackTitle?: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(RINGTONE_STORAGE_KEY, ringtoneUrl)
    toast.success(`Set "${trackTitle || 'Custom Track'}" as default alarm ringtone! 🔔`)
  } catch {}
}

// Trigger Alarm Sound & Native Notification
export function triggerAlarm(title: string, ringtoneUrl?: string): void {
  if (typeof window === 'undefined') return

  const soundUrl = ringtoneUrl || getSelectedRingtone()

  // 1. Play Alarm Audio
  try {
    if (alarmAudioInstance) {
      alarmAudioInstance.pause()
      alarmAudioInstance = null
    }
    alarmAudioInstance = new Audio(soundUrl)
    alarmAudioInstance.loop = true
    alarmAudioInstance.play().catch(err => console.warn('Alarm audio play error:', err))
  } catch (err) {
    console.warn('Alarm audio error:', err)
  }

  // 2. Native Android / Web OS Notification Popup
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`⏰ NIRMAAN Alarm: ${title}`, {
      body: `Scheduled item time reached! Tap to view details.`,
      icon: '/icons/icon-192x192.png',
      tag: `alarm-${Date.now()}`,
    })
  }

  toast.warning(`⏰ ALARM: ${title}`, {
    duration: 10000,
    action: {
      label: 'Stop Alarm',
      onClick: () => stopAlarm(),
    },
  })
}

// Stop currently playing alarm sound
export function stopAlarm(): void {
  if (alarmAudioInstance) {
    alarmAudioInstance.pause()
    alarmAudioInstance.currentTime = 0
    alarmAudioInstance = null
    toast.info('Alarm stopped 🔕')
  }
}

// Schedule an item (task/todo/reminder) for automatic notification push on its date & time
export function scheduleItemNotification(item: { id: string; title: string; scheduledTime: number; type: 'task' | 'todo' | 'reminder' }): void {
  if (typeof window === 'undefined' || !item.scheduledTime) return

  const delay = item.scheduledTime - Date.now()
  if (delay <= 0) return // Past item

  // Request notification permission if not yet decided
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }

  // Schedule timer in browser runtime
  setTimeout(() => {
    triggerAlarm(item.title)
  }, delay)

  console.log(`[AlarmScheduler] Scheduled alarm for "${item.title}" in ${Math.round(delay / 1000)} seconds.`)
}

// Register MediaSession notification shade controls for Android notification panel
export function updateMediaSessionPanel(track: { title: string; artist: string; album?: string; coverUrl?: string }, handlers: { onPlay: () => void; onPause: () => void; onNext: () => void; onPrev: () => void; onSeek?: (time: number) => void }): void {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) return

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album || 'NIRMAAN Personal OS',
      artwork: [
        { src: track.coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=512', sizes: '512x512', type: 'image/jpeg' },
      ],
    })

    navigator.mediaSession.setActionHandler('play', handlers.onPlay)
    navigator.mediaSession.setActionHandler('pause', handlers.onPause)
    navigator.mediaSession.setActionHandler('previoustrack', handlers.onPrev)
    navigator.mediaSession.setActionHandler('nexttrack', handlers.onNext)
    if (handlers.onSeek) {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && handlers.onSeek) {
          handlers.onSeek(details.seekTime)
        }
      })
    }
  } catch (err) {
    console.warn('MediaSession panel registration error:', err)
  }
}
