'use client'

import { useState, useEffect } from 'react'
import { BellRing, X } from 'lucide-react'
import { requestAllPermissions } from '@/lib/permissions-handler'
import { toast } from 'sonner'

export default function BrowserPermissionBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const dismissed = localStorage.getItem('nirmaan_permissions_dismissed')

    if ('Notification' in window && Notification.permission !== 'granted' && !dismissed) {
      setShowBanner(true)
    }
  }, [])

  if (!showBanner) return null

  async function handleEnable() {
    const granted = await requestAllPermissions()
    if (granted) {
      toast.success('Sound & Push Notifications Enabled! 🔔🎵')
    } else {
      toast.info('Notification permission prompt completed.')
    }
    setShowBanner(false)
    localStorage.setItem('nirmaan_permissions_dismissed', 'true')
  }

  function handleDismiss() {
    setShowBanner(false)
    localStorage.setItem('nirmaan_permissions_dismissed', 'true')
  }

  return (
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: '92%',
        maxWidth: 520,
        background: 'linear-gradient(135deg, #121318 0%, #1A1C24 100%)',
        border: '1px solid #F59E0B',
        borderRadius: 'var(--radius-card)',
        padding: '14px 18px',
        boxShadow: '0 12px 36px rgba(245, 158, 11, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #F59E0B, #06B6D4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            flexShrink: 0,
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
          }}
        >
          <BellRing size={20} className="animate-bounce" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            Enable Sound & Push Notifications 🔔
          </p>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>
            Get 30s ringtone alarms, snooze alerts, and background task reminders on this device.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          onClick={handleEnable}
          className="btn"
          style={{
            padding: '8px 14px',
            fontSize: 12,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #F59E0B, #EAB308)',
            color: '#0A0B0D',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
          }}
        >
          Enable Now
        </button>
        <button
          onClick={handleDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
