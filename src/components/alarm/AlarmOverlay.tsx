'use client'

import { useState, useEffect } from 'react'
import { Bell, VolumeX, Clock, Music } from 'lucide-react'
import { triggerAlarmRingtone, stopAlarmRingtone } from '@/lib/alarm-engine'
import { toast } from 'sonner'

interface AlarmOverlayProps {
  alarmTitle: string
  scheduledTime?: string
  isOpen: boolean
  onClose: () => void
  onSnooze: (minutes: number) => void
}

export default function AlarmOverlay({
  alarmTitle,
  scheduledTime,
  isOpen,
  onClose,
  onSnooze,
}: AlarmOverlayProps) {
  const [ringing, setRinging] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<'chime' | 'pulse' | 'zen' | 'custom'>('chime')
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null)
  const [customFileName, setCustomFileName] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setRinging(true)
      const stopFn = triggerAlarmRingtone(selectedPreset, customAudioUrl || undefined, () => {
        setRinging(false)
        toast.info('Alarm finished 30s ring cycle.')
      })
      return () => {
        stopFn()
        setRinging(false)
      }
    } else {
      stopAlarmRingtone()
      setRinging(false)
    }
  }, [isOpen, selectedPreset, customAudioUrl])

  if (!isOpen) return null

  function handleCustomFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setCustomAudioUrl(url)
      setCustomFileName(file.name)
      setSelectedPreset('custom')
      toast.success(`Selected device sound: "${file.name}"`)
    }
  }

  function handleStop() {
    stopAlarmRingtone()
    setRinging(false)
    onClose()
  }

  function handleSnoozeMinutes(min: number) {
    stopAlarmRingtone()
    setRinging(false)
    onSnooze(min)
    toast.success(`Snoozed for ${min} minutes! ⏰`)
  }

  return (
    <>
      <div
        className="overlay"
        style={{ background: 'rgba(10, 11, 13, 0.85)', backdropFilter: 'blur(12px)', zIndex: 999 }}
        onClick={handleStop}
      />

      <div
        className="animate-fade-in"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: 440,
          background: 'var(--surface)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 'var(--radius-card)',
          padding: '28px 24px',
          zIndex: 1000,
          boxShadow: '0 20px 50px rgba(245, 158, 11, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Pulsing Alarm Ring Graphic */}
        <div style={{ position: 'relative', width: 84, height: 84, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              position: 'absolute',
              inset: -12,
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.2)',
              animation: ringing ? 'pulse 1.2s infinite ease-in-out' : 'none',
            }}
          />
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #F59E0B, #7C3AED)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)',
            }}
          >
            <Bell size={36} color="#FFFFFF" className={ringing ? 'animate-bounce' : ''} />
          </div>
        </div>

        {/* Title & Time */}
        <span className="badge badge-warning" style={{ fontSize: 11, marginBottom: 8, padding: '4px 10px' }}>
          30-Sec Alarm Ringing 🔔
        </span>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px', lineHeight: 1.3 }}>
          {alarmTitle}
        </h2>
        {scheduledTime && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={13} /> {scheduledTime}
          </p>
        )}

        {/* Ringtone Preset Picker */}
        <div style={{ width: '100%', marginBottom: 20, padding: 12, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>RINGTONE SOUND</span>
            <label style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Music size={12} /> {customFileName ? 'Change Audio' : 'Upload Device Audio'}
              <input type="file" accept="audio/*" onChange={handleCustomFile} style={{ display: 'none' }} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {[
              { id: 'chime', label: 'Chime' },
              { id: 'pulse', label: 'Pulse' },
              { id: 'zen', label: 'Zen' },
              { id: 'custom', label: customFileName ? 'Custom' : 'Device' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'custom' && !customAudioUrl) {
                    toast.info('Please select a device music file first!')
                    return
                  }
                  setSelectedPreset(item.id as 'chime' | 'pulse' | 'zen' | 'custom')
                }}
                style={{
                  padding: '6px 4px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: selectedPreset === item.id ? '#F59E0B' : 'var(--surface-3)',
                  color: selectedPreset === item.id ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Snooze Options */}
        <div style={{ width: '100%', marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>SNOOZE ALARM</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <button onClick={() => handleSnoozeMinutes(5)} className="btn btn-secondary" style={{ fontSize: 12, height: 36 }}>
              +5 min
            </button>
            <button onClick={() => handleSnoozeMinutes(10)} className="btn btn-secondary" style={{ fontSize: 12, height: 36 }}>
              +10 min
            </button>
            <button onClick={() => handleSnoozeMinutes(15)} className="btn btn-secondary" style={{ fontSize: 12, height: 36 }}>
              +15 min
            </button>
          </div>
        </div>

        {/* Stop Alarm Action */}
        <button
          onClick={handleStop}
          className="btn btn-primary"
          style={{
            width: '100%',
            height: 46,
            fontSize: 15,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
          }}
        >
          <VolumeX size={18} /> Stop Alarm
        </button>
      </div>
    </>
  )
}
