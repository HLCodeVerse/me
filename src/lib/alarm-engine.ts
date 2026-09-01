// NIRMAAN 30-Second Alarm & Ringtone Engine
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ActiveAlarm {
  id: string
  title: string
  scheduledAt: string
  soundPreset?: 'chime' | 'pulse' | 'zen' | 'custom'
  customAudioUrl?: string
}

let audioCtx: AudioContext | null = null
let activeOscillators: OscillatorNode[] = []
let activeGainNodes: GainNode[] = []
let alarmTimerId: NodeJS.Timeout | null = null
let currentAudioElement: HTMLAudioElement | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    audioCtx = new AudioContextClass()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

// Generate synth ringtone notes using Web Audio API
function playChimePreset(ctx: AudioContext, gain: GainNode) {
  const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
  let step = 0
  const interval = setInterval(() => {
    if (ctx.state === 'closed') { clearInterval(interval); return }
    const osc = ctx.createOscillator()
    const noteGain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(notes[step % notes.length], ctx.currentTime)
    noteGain.gain.setValueAtTime(0.3, ctx.currentTime)
    noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.connect(noteGain)
    noteGain.connect(gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
    step++
  }, 400)

  return () => clearInterval(interval)
}

function playPulsePreset(ctx: AudioContext, gain: GainNode) {
  const freqs = [440, 880, 587.33, 1174.66]
  let idx = 0
  const interval = setInterval(() => {
    if (ctx.state === 'closed') { clearInterval(interval); return }
    const osc = ctx.createOscillator()
    const noteGain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freqs[idx % freqs.length], ctx.currentTime)
    noteGain.gain.setValueAtTime(0.4, ctx.currentTime)
    noteGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
    osc.connect(noteGain)
    noteGain.connect(gain)
    osc.start()
    osc.stop(ctx.currentTime + 0.3)
    idx++
  }, 350)

  return () => clearInterval(interval)
}

function playZenPreset(ctx: AudioContext, gain: GainNode) {
  const notes = [293.66, 329.63, 440.00, 523.25]
  let idx = 0
  const interval = setInterval(() => {
    if (ctx.state === 'closed') { clearInterval(interval); return }
    const osc = ctx.createOscillator()
    const noteGain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(notes[idx % notes.length], ctx.currentTime)
    noteGain.gain.setValueAtTime(0.5, ctx.currentTime)
    noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2)
    osc.connect(noteGain)
    noteGain.connect(gain)
    osc.start()
    osc.stop(ctx.currentTime + 1.2)
    idx++
  }, 900)

  return () => clearInterval(interval)
}

// Start 30-Second Alarm Ringing
export function triggerAlarmRingtone(
  preset: 'chime' | 'pulse' | 'zen' | 'custom' = 'chime',
  customAudioUrl?: string,
  onAutoStop?: () => void
): () => void {
  stopAlarmRingtone()

  if (preset === 'custom' && customAudioUrl) {
    try {
      const audio = new Audio(customAudioUrl)
      audio.loop = true
      audio.volume = 1.0
      audio.play().catch(() => {})
      currentAudioElement = audio

      // Auto stop after 30 seconds
      alarmTimerId = setTimeout(() => {
        stopAlarmRingtone()
        if (onAutoStop) onAutoStop()
      }, 30000)

      return stopAlarmRingtone
    } catch {}
  }

  try {
    const ctx = getAudioContext()
    const mainGain = ctx.createGain()
    mainGain.gain.setValueAtTime(0.7, ctx.currentTime)
    mainGain.connect(ctx.destination)
    activeGainNodes.push(mainGain)

    let cleanupPreset: (() => void) | null = null
    if (preset === 'pulse') {
      cleanupPreset = playPulsePreset(ctx, mainGain)
    } else if (preset === 'zen') {
      cleanupPreset = playZenPreset(ctx, mainGain)
    } else {
      cleanupPreset = playChimePreset(ctx, mainGain)
    }

    // Auto stop after 30 seconds
    alarmTimerId = setTimeout(() => {
      if (cleanupPreset) cleanupPreset()
      stopAlarmRingtone()
      if (onAutoStop) onAutoStop()
    }, 30000)

    return () => {
      if (cleanupPreset) cleanupPreset()
      stopAlarmRingtone()
    }
  } catch (err) {
    console.error('Failed to play synth ringtone:', err)
    return () => {}
  }
}

// Stop Alarm Ringtone Immediately
export function stopAlarmRingtone() {
  if (alarmTimerId) {
    clearTimeout(alarmTimerId)
    alarmTimerId = null
  }

  if (currentAudioElement) {
    currentAudioElement.pause()
    currentAudioElement.currentTime = 0
    currentAudioElement = null
  }

  activeOscillators.forEach(osc => {
    try { osc.stop(); osc.disconnect() } catch {}
  })
  activeOscillators = []

  activeGainNodes.forEach(g => {
    try { g.disconnect() } catch {}
  })
  activeGainNodes = []
}
