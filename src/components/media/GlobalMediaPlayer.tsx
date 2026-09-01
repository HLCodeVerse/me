'use client'

import { useEffect, useRef } from 'react'
import { useMediaStore } from '@/lib/media-store'
import { Play, Pause, SkipBack, SkipForward, Maximize2, Music } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function GlobalMediaPlayer() {
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const {
    tracks,
    currentTrackIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    loopMode,
    playbackRate,
    sleepTimerEnd,
    togglePlay,
    nextTrack,
    prevTrack,
    updateTime,
  } = useMediaStore()

  const currentTrack = tracks[currentTrackIndex]

  // Audio Playback Synchronization
  useEffect(() => {
    if (!audioRef.current) return
    if (currentTrack) {
      if (audioRef.current.src !== currentTrack.url) {
        audioRef.current.src = currentTrack.url
      }
      audioRef.current.playbackRate = playbackRate || 1.0
      if (isPlaying) {
        audioRef.current.play().catch(() => {})
      } else {
        audioRef.current.pause()
      }
    } else {
      audioRef.current.pause()
    }
  }, [currentTrack, isPlaying, playbackRate])

  // Volume & Mute Sync
  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.volume = isMuted ? 0 : volume
  }, [volume, isMuted])

  // Sleep Timer Check Loop
  useEffect(() => {
    if (!sleepTimerEnd || !isPlaying) return
    const interval = setInterval(() => {
      if (Date.now() >= sleepTimerEnd) {
        if (isPlaying) togglePlay()
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [sleepTimerEnd, isPlaying, togglePlay])

  // Live Audio Visualizer Canvas Effect
  useEffect(() => {
    if (!canvasRef.current || !isPlaying) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const bars = 16

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < bars; i++) {
        const h = Math.floor(Math.random() * (canvas.height - 4)) + 4
        const x = i * (canvas.width / bars)
        const w = (canvas.width / bars) - 2

        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0)
        grad.addColorStop(0, '#FFD700')
        grad.addColorStop(1, '#F59E0B')

        ctx.fillStyle = grad
        ctx.fillRect(x, canvas.height - h, w, h)
      }
      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
    }
  }, [isPlaying])

  if (!currentTrack) return null

  function handleEnded() {
    if (loopMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play()
      }
    } else {
      nextTrack()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(62px + env(safe-area-inset-bottom, 0px))',
        left: 0,
        right: 0,
        zIndex: 90,
        background: 'linear-gradient(180deg, #0A0B0D 0%, #121318 100%)',
        borderTop: '1px solid rgba(245, 158, 11, 0.35)',
        boxShadow: '0 -10px 35px rgba(0,0,0,0.85)',
        backdropFilter: 'blur(20px)',
        padding: '8px 16px',
        maxWidth: 768,
        margin: '0 auto',
        borderRadius: '16px 16px 0 0',
      }}
    >
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => updateTime(e.currentTarget.currentTime, e.currentTarget.duration || 0)}
        onEnded={handleEnded}
      />

      {/* Progress Bar Top Line */}
      <div style={{ position: 'relative', width: '100%', height: 3, marginBottom: 8, background: '#1A1C24', borderRadius: 99, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
            background: 'linear-gradient(90deg, #FFD700, #F59E0B)',
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        {/* Left: Track Info & Cover */}
        <div
          onClick={() => router.push('/player')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1, minWidth: 0 }}
        >
          <div style={{ position: 'relative', width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #FFD700, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {currentTrack.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentTrack.coverUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Music size={20} color="#000000" />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTrack.title}
            </p>
            <p style={{ fontSize: 11, color: '#FFD700', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
              {currentTrack.artist || 'Local Audio File'} • {currentTrack.category}
            </p>
          </div>
        </div>

        {/* Center: Frequency Visualizer Canvas */}
        <canvas
          ref={canvasRef}
          width={44}
          height={18}
          style={{ borderRadius: 4, opacity: isPlaying ? 1 : 0.3 }}
        />

        {/* Right: Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={prevTrack} className="btn-ghost btn-icon" style={{ width: 32, height: 32 }}>
            <SkipBack size={16} color="#FFFFFF" />
          </button>
          <button
            onClick={togglePlay}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FFD700, #F59E0B)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000000',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.45)',
            }}
          >
            {isPlaying ? <Pause size={16} fill="#000000" color="#000000" /> : <Play size={16} fill="#000000" color="#000000" style={{ marginLeft: 2 }} />}
          </button>
          <button onClick={nextTrack} className="btn-ghost btn-icon" style={{ width: 32, height: 32 }}>
            <SkipForward size={16} color="#FFFFFF" />
          </button>

          <Link href="/player" className="btn-ghost btn-icon" style={{ width: 32, height: 32 }}>
            <Maximize2 size={15} color="#F59E0B" />
          </Link>
        </div>
      </div>
    </div>
  )
}
