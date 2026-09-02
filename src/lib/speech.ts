'use client'

// Active audio player instance to prevent overlapping speech
let currentAudio: HTMLAudioElement | null = null

/**
 * Clean markdown symbols, emojis, dashes & spaces for 100% natural human TTS speech
 */
export function cleanTextForSpeech(input: string): string {
  if (!input) return ''
  return input
    .replace(/```[\s\S]*?```/g, '') // remove code blocks
    .replace(/`([^`]+)`/g, '$1')     // remove inline code
    // Remove all Emojis (Unicode ranges)
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}]/gu, '')
    // Remove bullet points, dashes, hashes, asterisks, underscores, tildes, brackets
    .replace(/[*_#~>•\-[\]()]/g, ' ')
    // Collapse multiple spaces/newlines
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Text-to-Speech synthesizer using Mistral Audio API with Web Speech API fallback
 */
export async function speakText(text: string, onEnded?: () => void): Promise<void> {
  if (typeof window === 'undefined') return

  const clean = cleanTextForSpeech(text)
  if (!clean) return

  // Stop any currently playing speech audio or browser synthesis
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }

  try {
    // 1. Try Mistral Audio API Endpoint (/api/ai/tts)
    const res = await fetch('/api/ai/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: clean }),
    })

    const contentType = res.headers.get('Content-Type')
    if (res.ok && contentType && contentType.includes('audio')) {
      const blob = await res.blob()
      const audioUrl = URL.createObjectURL(blob)
      const audio = new Audio(audioUrl)
      currentAudio = audio

      audio.onended = () => {
        currentAudio = null
        if (onEnded) onEnded()
      }
      audio.onerror = () => {
        fallbackBrowserSpeech(clean, onEnded)
      }

      await audio.play()
      return
    }
  } catch (err) {
    console.warn('Mistral TTS fetch exception, invoking browser speech fallback:', err)
  }

  // 2. Fallback to Native Browser Speech Synthesis
  fallbackBrowserSpeech(clean, onEnded)
}

/**
 * Fallback browser SpeechSynthesis
 */
function fallbackBrowserSpeech(cleanText: string, onEnded?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

  const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 500))
  utterance.rate = 1.0
  utterance.pitch = 1.0

  utterance.onend = () => {
    if (onEnded) onEnded()
  }

  window.speechSynthesis.speak(utterance)
}

/**
 * Speech Recognition (STT) interface builder for live voice talk
 */
export interface VoiceRecognizerOptions {
  onTranscript: (text: string, isFinal: boolean) => void
  onError?: (error: string) => void
  onEnd?: () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any

export function createVoiceRecognizer(options: VoiceRecognizerOptions) {
  if (typeof window === 'undefined') {
    return { start: () => {}, stop: () => {}, isSupported: false }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

  if (!SpeechRecognition) {
    return { start: () => {}, stop: () => {}, isSupported: false }
  }

  const recognition: SpeechRecognitionType = new SpeechRecognition()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'en-US'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onresult = (event: any) => {
    let interim = ''
    let final = ''

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final += event.results[i][0].transcript
      } else {
        interim += event.results[i][0].transcript
      }
    }

    if (final) {
      options.onTranscript(final, true)
    } else if (interim) {
      options.onTranscript(interim, false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onerror = (event: any) => {
    if (event.error !== 'no-speech' && options.onError) {
      options.onError(event.error)
    }
  }

  recognition.onend = () => {
    if (options.onEnd) options.onEnd()
  }

  return {
    start: () => {
      try {
        recognition.start()
      } catch {}
    },
    stop: () => {
      try {
        recognition.stop()
      } catch {}
    },
    isSupported: true,
  }
}
