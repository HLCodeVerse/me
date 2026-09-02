'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, Volume2, VolumeX, Sparkles, RefreshCw, Send, Radio } from 'lucide-react'
import { createVoiceRecognizer, speakText, cleanTextForSpeech } from '@/lib/speech'
import FormattedAIResponse from '@/components/common/FormattedAIResponse'
import { toast } from 'sonner'

interface AIVoiceTalkBarProps {
  userId?: string
  onActionComplete?: () => void
  placeholder?: string
}

export default function AIVoiceTalkBar({
  userId,
  onActionComplete,
  placeholder = "Speak live command or query (e.g., 'Add task Buy groceries at 5pm', 'Log 500ml water')...",
}: AIVoiceTalkBarProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [lastResponse, setLastResponse] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognizerRef = useRef<any>(null)

  const handleVoiceSubmit = useCallback(async (spokenText: string) => {
    if (!spokenText.trim()) return

    setIsProcessing(true)
    setLastResponse(null)
    toast.info(`Voice Command Received: "${spokenText}"`)

    try {
      const customGrokKey = typeof window !== 'undefined' ? localStorage.getItem('nirmaan_grok_key') : null
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'X-User-Id': userId } : {}),
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: spokenText }],
          model: 'x-ai/grok-2-1212',
          enableTools: true,
          grokApiKey: customGrokKey,
        }),
      })

      if (res.ok) {
        const text = await res.text()
        const lines = text.split('\n').filter(l => l.startsWith('data: ')).map(l => l.replace('data: ', ''))
        let fullOutput = ''
        for (const line of lines) {
          if (line === '[DONE]') continue
          try {
            const parsed = JSON.parse(line)
            fullOutput += parsed.choices?.[0]?.delta?.content || ''
          } catch {}
        }

        const reply = fullOutput.trim() || 'Action executed successfully.'
        setLastResponse(reply)
        toast.success('Action performed!')

        // Trigger Mistral TTS Auto-Speech if sound is enabled
        if (soundEnabled) {
          setIsSpeaking(true)
          speakText(cleanTextForSpeech(reply), () => {
            setIsSpeaking(false)
          })
        }

        if (onActionComplete) onActionComplete()
      } else {
        toast.error('Voice AI command failed')
      }
    } catch {
      toast.error('Error executing voice command')
    } finally {
      setIsProcessing(false)
      setTranscript('')
      setInterimText('')
    }
  }, [userId, soundEnabled, onActionComplete])

  useEffect(() => {
    recognizerRef.current = createVoiceRecognizer({
      onTranscript: (text, isFinal) => {
        if (isFinal) {
          setTranscript(text)
          setInterimText('')
          handleVoiceSubmit(text)
        } else {
          setInterimText(text)
        }
      },
      onError: (err) => {
        console.warn('STT Error:', err)
        setIsListening(false)
      },
      onEnd: () => {
        setIsListening(false)
      },
    })
  }, [handleVoiceSubmit])

  function toggleListening() {
    if (!recognizerRef.current?.isSupported) {
      toast.error('Web Speech API STT is not supported on this browser. Use text input below!')
      return
    }

    if (isListening) {
      recognizerRef.current.stop()
      setIsListening(false)
    } else {
      setTranscript('')
      setInterimText('')
      recognizerRef.current.start()
      setIsListening(true)
      toast.info('Listening live... speak your action command!')
    }
  }

  function handleManualFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (transcript.trim()) {
      handleVoiceSubmit(transcript.trim())
    }
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #121318 0%, #1A1C24 100%)',
        border: isListening ? '1.5px solid #10B981' : isSpeaking ? '1.5px solid #3B82F6' : '1px solid #F59E0B',
        borderRadius: 20,
        padding: '18px 20px',
        boxShadow: isListening
          ? '0 0 25px rgba(16, 185, 129, 0.4)'
          : isSpeaking
          ? '0 0 25px rgba(59, 130, 246, 0.4)'
          : '0 12px 36px rgba(245, 158, 11, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: isListening
                ? 'linear-gradient(135deg, #10B981, #059669)'
                : isSpeaking
                ? 'linear-gradient(135deg, #3B82F6, #1D4ED8)'
                : 'linear-gradient(135deg, #FFD700, #F59E0B)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000000',
            }}
          >
            {isListening ? (
              <Radio size={18} color="#FFFFFF" className="animate-pulse" />
            ) : (
              <Sparkles size={18} color="#000000" />
            )}
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              NIRMAAN Real-Time Voice Talk & Mistral Audio TTS <Sparkles size={14} color="#FFD700" />
            </h3>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
              {isListening
                ? '🔴 Live Listening Active — Speak your command...'
                : isSpeaking
                ? '🔊 Mistral Audio TTS Speaking Reply Aloud...'
                : 'Speak live action commands or type prompts'}
            </span>
          </div>
        </div>

        {/* Mute/Unmute TTS Toggle */}
        <button
          onClick={() => {
            setSoundEnabled(!soundEnabled)
            toast.info(soundEnabled ? 'Mistral Audio TTS Muted' : 'Mistral Audio TTS Enabled')
          }}
          style={{
            background: 'none',
            border: 'none',
            color: soundEnabled ? '#FFD700' : '#6B7280',
            cursor: 'pointer',
            padding: 4,
          }}
          title={soundEnabled ? 'Mute TTS Speech' : 'Unmute TTS Speech'}
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>

      {/* Input Bar & Live Mic Button */}
      <form onSubmit={handleManualFormSubmit} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          type="text"
          placeholder={interimText ? `Listening: "${interimText}"...` : placeholder}
          value={transcript || interimText}
          onChange={e => setTranscript(e.target.value)}
          style={{
            flex: 1,
            height: 44,
            background: '#0A0B0D',
            border: isListening ? '1px solid #10B981' : '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: 12,
            color: '#FFFFFF',
            fontSize: 13,
            padding: '0 14px',
            outline: 'none',
          }}
        />

        {/* Live Mic Push Button */}
        <button
          type="button"
          onClick={toggleListening}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            border: 'none',
            background: isListening ? '#EF4444' : 'linear-gradient(135deg, #10B981, #059669)',
            color: '#FFFFFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isListening ? '0 0 15px rgba(239, 68, 68, 0.6)' : 'none',
            transition: 'all 0.2s ease',
          }}
          title={isListening ? 'Stop Live Listening' : 'Start Live Voice Command'}
        >
          {isListening ? <MicOff size={20} className="animate-bounce" /> : <Mic size={20} />}
        </button>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isProcessing}
          className="btn btn-primary"
          style={{ height: 44, padding: '0 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
          <span>{isProcessing ? 'Executing...' : 'Send'}</span>
        </button>
      </form>

      {/* Response Box & TTS Playback Controls */}
      {lastResponse && (
        <div style={{ background: '#0A0B0D', border: '1px solid rgba(245, 158, 11, 0.3)', padding: 14, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#FFD700', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Volume2 size={14} color="#FFD700" /> AI REPLY (MISTRAL AUDIO TTS):
            </span>
            <button
              onClick={() => {
                setIsSpeaking(true)
                speakText(cleanTextForSpeech(lastResponse), () => setIsSpeaking(false))
              }}
              style={{
                background: 'rgba(255, 215, 0, 0.15)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                color: '#FFD700',
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Volume2 size={13} /> Speak Again
            </button>
          </div>
          <FormattedAIResponse content={lastResponse} />
        </div>
      )}
    </div>
  )
}
