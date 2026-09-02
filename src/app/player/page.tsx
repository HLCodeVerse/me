'use client'

import { useState, useRef, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useMediaStore, MediaTrack, SortOption, CategoryFilter } from '@/lib/media-store'
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat,
  Volume2, VolumeX, Search, Disc, Sparkles, SlidersHorizontal,
  Maximize2, Minimize2, ChevronDown, Radio, ShieldCheck, Bell
} from 'lucide-react'
import { toast } from 'sonner'
import { updateMediaSessionPanel, setSelectedRingtone } from '@/lib/alarm-scheduler'

export default function PlayerPage() {
  const {
    tracks,
    currentTrackIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    loopMode,
    sortBy,
    categoryFilter,
    searchQuery,
    playbackRate,
    addTracks,
    playTrack,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleLoopMode,
    setSortBy,
    setCategoryFilter,
    setSearchQuery,
    setPlaybackRate,
  } = useMediaStore()

  const [isFullScreenPlayer, setIsFullScreenPlayer] = useState(false)
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const currentTrack = tracks[currentTrackIndex]

  // Auto-discover Native Device Audio files via Android JavascriptInterface bridge
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    if (win.AndroidNativeAudio && typeof win.AndroidNativeAudio.getDeviceMusic === 'function') {
      try {
        const rawJson = win.AndroidNativeAudio.getDeviceMusic()
        if (rawJson) {
          const parsedTracks = JSON.parse(rawJson) as MediaTrack[]
          if (Array.isArray(parsedTracks) && parsedTracks.length > 0) {
            addTracks(parsedTracks)
            toast.success(`Discovered ${parsedTracks.length} local audio track(s) from device storage! 🎵`)
          }
        }
      } catch (err) {
        console.warn('Native device music scan exception:', err)
      }
    }
  }, [addTracks])

  // Dynamic Audio Visualizer Animation Loop
  useEffect(() => {
    if (!canvasRef.current || !isPlaying) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const barCount = 32

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < barCount; i++) {
        const height = Math.floor(Math.random() * (canvas.height - 6)) + 6
        const x = i * (canvas.width / barCount)
        const width = (canvas.width / barCount) - 2

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0)
        gradient.addColorStop(0, '#FFD700')
        gradient.addColorStop(0.5, '#F59E0B')
        gradient.addColorStop(1, '#10B981')

        ctx.fillStyle = gradient
        ctx.fillRect(x, canvas.height - height, width, height)
      }
      animId = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animId)
  }, [isPlaying])

  // Sync Native Android Notification Panel Media Controls
  useEffect(() => {
    if (!currentTrack) return
    updateMediaSessionPanel(
      { title: currentTrack.title, artist: currentTrack.artist, album: currentTrack.album, coverUrl: currentTrack.coverUrl },
      { onPlay: togglePlay, onPause: togglePlay, onNext: nextTrack, onPrev: prevTrack, onSeek: seekTo }
    )
  }, [currentTrack, isPlaying, togglePlay, nextTrack, prevTrack, seekTo])

  // Format Time Helper (seconds to MM:SS)
  function formatTime(seconds: number) {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Filter & Sort Tracks (Default: Newest to Oldest)
  const filteredTracks = tracks.filter(t => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchTitle = t.title.toLowerCase().includes(q)
      const matchArtist = t.artist.toLowerCase().includes(q)
      if (!matchTitle && !matchArtist) return false
    }
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'Local Device Audio') return t.category === 'Local Device Audio' || t.url.startsWith('file://') || t.id.startsWith('native-audio-')
      return t.category === categoryFilter
    }
    return true
  }).sort((a, b) => {
    if (sortBy === 'date') return (b.dateAdded || 0) - (a.dateAdded || 0)
    if (sortBy === 'most_played') return (b.playCount || 0) - (a.playCount || 0)
    if (sortBy === 'title') return a.title.localeCompare(b.title)
    if (sortBy === 'duration') return (b.duration || 0) - (a.duration || 0)
    return (b.dateAdded || 0) - (a.dateAdded || 0)
  })

  // Generate AI Focus & Soundscape Insight
  async function generateAiInsight() {
    if (!currentTrack) return
    setLoadingAi(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Analyze audio track "${currentTrack.title}" by ${currentTrack.artist} (${currentTrack.category}). Provide a 2-sentence acoustic focus & mindfulness insight for mental clarity.`
          }]
        })
      })
      const data = await res.json()
      setAiInsight(data.response || data.reply || 'This soundscape enhances deep cognitive focus and neural synchronization.')
    } catch {
      setAiInsight('This soundscape promotes relaxed alertness and high cognitive flow.')
    } finally {
      setLoadingAi(false)
    }
  }

  const categoryTabs: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: 'All Tracks' },
    { key: 'Local Device Audio', label: 'Device Storage' },
    { key: 'Focus & Flow', label: 'Focus & Flow' },
    { key: 'Binaural Beats', label: 'Binaural Beats' },
    { key: 'Lo-Fi Beats', label: 'Lo-Fi' },
    { key: 'Ambient & Nature', label: 'Ambient' },
  ]

  return (
    <AppShell>
      {/* CSS KEYFRAMES FOR CASSETTE SPIN & ANIMATED GRADIENT FOG */}
      <style jsx global>{`
        @keyframes cassetteSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fogPulse {
          0% { transform: scale(1) translate(0px, 0px); opacity: 0.35; }
          50% { transform: scale(1.15) translate(20px, -20px); opacity: 0.55; }
          100% { transform: scale(1) translate(0px, 0px); opacity: 0.35; }
        }
        @keyframes marqueeText {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-cassette {
          animation: cassetteSpin 6s linear infinite;
        }
        .animate-fog {
          animation: fogPulse 10s ease-in-out infinite;
        }
        .marquee-container {
          overflow: hidden;
          white-space: nowrap;
          width: 100%;
          position: relative;
        }
        .marquee-content {
          display: inline-block;
          white-space: nowrap;
        }
        .marquee-active {
          animation: marqueeText 14s linear infinite;
        }
      `}</style>

      <div style={{ background: '#000000', color: '#FFFFFF', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 110 }}>

        {/* TOP HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Disc size={13} color="#FFD700" /> AMOLED Sound Engine
              </span>
              <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={13} color="#10B981" /> Direct Device Sync
              </span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
              Media Studio & Soundscape 🎧
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#FFD700', fontWeight: 800, padding: '6px 12px', borderRadius: 99, background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.25)' }}>
              {tracks.length} Audio Files Available
            </span>
          </div>
        </div>

        {/* SEARCH & SORTING FILTER BAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: 12 }} />
              <input
                type="text"
                placeholder="Search tracks by name, artist, or format..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', height: 40, background: '#0F1117', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 12, color: '#FFFFFF', fontSize: 12.5, paddingLeft: 36, paddingRight: 12, outline: 'none' }}
              />
            </div>

            {/* Sort Dropdown (Default: Newest to Oldest) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0F1117', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 12, padding: '0 12px', height: 40 }}>
              <SlidersHorizontal size={14} color="#FFD700" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                style={{ background: 'transparent', border: 'none', color: '#FFFFFF', fontSize: 12, fontWeight: 700, outline: 'none', cursor: 'pointer' }}
              >
                <option value="date" style={{ background: '#0F1117', color: '#FFF' }}>Sort: Newest Added (New to Old)</option>
                <option value="most_played" style={{ background: '#0F1117', color: '#FFF' }}>Sort: Most Played</option>
                <option value="title" style={{ background: '#0F1117', color: '#FFF' }}>Sort: Title (A-Z)</option>
                <option value="duration" style={{ background: '#0F1117', color: '#FFF' }}>Sort: Duration</option>
              </select>
            </div>
          </div>

          {/* CATEGORY FILTER PILLS */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {categoryTabs.map(tab => {
              const active = categoryFilter === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setCategoryFilter(tab.key)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 99,
                    border: active ? '1px solid #FFD700' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: active ? 'rgba(255, 215, 0, 0.15)' : '#0F1117',
                    color: active ? '#FFD700' : '#9CA3AF',
                    fontSize: 11.5,
                    fontWeight: active ? 800 : 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* CLEAN TRACK LIST (NO DELETE, NO HEART, NO FOLDER ADD) */}
        <div style={{ background: '#0A0B0D', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 20, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '0 8px' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tracks ({filteredTracks.length})
            </span>
            <span style={{ fontSize: 11, color: '#6B7280' }}>Tap to play in full screen</span>
          </div>

          {filteredTracks.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>
              No audio files found. Connect audio or check media permissions.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredTracks.map((track, idx) => {
                const originalIndex = tracks.findIndex(t => t.id === track.id)
                const isSelected = currentTrackIndex === originalIndex
                const isPlayingThis = isSelected && isPlaying

                return (
                  <div
                    key={track.id}
                    onClick={() => {
                      playTrack(originalIndex)
                      setIsFullScreenPlayer(true)
                    }}
                    style={{
                      background: isSelected ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.12), rgba(16, 185, 129, 0.05))' : '#0F1117',
                      border: isSelected ? '1px solid rgba(255, 215, 0, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: 14,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      gap: 12,
                    }}
                  >
                    {/* Left: Index & Play Icon */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background: isSelected ? '#FFD700' : 'rgba(255, 255, 255, 0.06)',
                          color: isSelected ? '#000000' : '#FFD700',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: 13,
                          flexShrink: 0,
                        }}
                      >
                        {isPlayingThis ? <Radio size={18} className="animate-pulse" /> : <Play size={16} style={{ marginLeft: 2 }} />}
                      </div>

                      {/* Middle: Full Track Title & Artist */}
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        {/* Auto Marquee Container for Full Track Name */}
                        <div className="marquee-container">
                          <span
                            className={`marquee-content ${track.title.length > 28 ? 'marquee-active' : ''}`}
                            style={{
                              fontSize: 13.5,
                              fontWeight: 800,
                              color: isSelected ? '#FFD700' : '#FFFFFF',
                            }}
                          >
                            {track.title}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                          <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {track.artist}
                          </span>
                          <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(255, 255, 255, 0.08)', color: '#D1D5DB' }}>
                            {track.category || 'Audio'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Duration Time */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', fontFamily: 'monospace' }}>
                        {formatTime(track.duration)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* MINI PLAYER FLOATING BAR */}
      {currentTrack && (
        <div
          onClick={() => setIsFullScreenPlayer(true)}
          style={{
            position: 'fixed',
            bottom: 72,
            left: 16,
            right: 16,
            background: 'linear-gradient(135deg, rgba(20, 22, 30, 0.95), rgba(10, 11, 13, 0.98))',
            border: '1px solid rgba(255, 215, 0, 0.35)',
            borderRadius: 18,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(16px)',
            zIndex: 40,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            {/* Spinning Cassette Thumbnail */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FFD700, #F59E0B)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000000',
                flexShrink: 0,
                boxShadow: '0 0 12px rgba(255, 215, 0, 0.4)',
              }}
              className={isPlaying ? 'animate-cassette' : ''}
            >
              <Disc size={22} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentTrack.title}
              </div>
              <div style={{ fontSize: 10.5, color: '#9CA3AF' }}>
                {currentTrack.artist} • {formatTime(currentTime)} / {formatTime(duration || currentTrack.duration)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={e => e.stopPropagation()}>
            <button onClick={prevTrack} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 4 }}>
              <SkipBack size={18} />
            </button>
            <button
              onClick={togglePlay}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#FFD700',
                color: '#000000',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
            </button>
            <button onClick={nextTrack} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 4 }}>
              <SkipForward size={18} />
            </button>
            <button onClick={() => setIsFullScreenPlayer(true)} style={{ background: 'none', border: 'none', color: '#FFD700', cursor: 'pointer', padding: 4 }}>
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
      )}

      {/* FULL-SCREEN AMOLED AUDIO PLAYER MODAL WITH SPINNING CASSETTE & LIVE GRADIENT FOG */}
      {isFullScreenPlayer && currentTrack && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#000000',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px 20px 36px',
            overflowY: 'auto',
          }}
        >
          {/* LIVE ANIMATED BLURRED GRADIENT FOG BACKGROUND */}
          <div
            className="animate-fog"
            style={{
              position: 'absolute',
              top: '15%',
              left: '10%',
              width: 280,
              height: 280,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 215, 0, 0.25) 0%, rgba(16, 185, 129, 0.15) 50%, transparent 100%)',
              filter: 'blur(50px)',
              pointerEvents: 'none',
            }}
          />
          <div
            className="animate-fog"
            style={{
              position: 'absolute',
              bottom: '20%',
              right: '10%',
              width: 320,
              height: 320,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, rgba(236, 72, 153, 0.15) 50%, transparent 100%)',
              filter: 'blur(60px)',
              pointerEvents: 'none',
            }}
          />

          {/* Modal Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
            <button
              onClick={() => setIsFullScreenPlayer(false)}
              style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <ChevronDown size={24} />
            </button>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#FFD700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Playing From Device
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#9CA3AF' }}>
                {currentTrack.category || 'Soundscape Engine'}
              </div>
            </div>

            <button
              onClick={() => setIsFullScreenPlayer(false)}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
            >
              <Minimize2 size={20} />
            </button>
          </div>

          {/* CENTER: ANIMATED SPINNING CASSETTE / VINYL DISC */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '24px 0', position: 'relative', zIndex: 10 }}>
            <div
              style={{
                width: 220,
                height: 220,
                borderRadius: '50%',
                background: 'radial-gradient(circle, #1F2937 0%, #000000 70%, #FFD700 100%)',
                border: '4px solid rgba(255, 215, 0, 0.4)',
                boxShadow: '0 0 50px rgba(255, 215, 0, 0.3), 0 20px 40px rgba(0, 0, 0, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
              className={isPlaying ? 'animate-cassette' : ''}
            >
              {/* Vinyl Groove Rings */}
              <div style={{ width: 170, height: 170, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 120, height: 120, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000000' }}>
                    <Disc size={36} />
                  </div>
                </div>
              </div>
            </div>

            {/* Visualizer Canvas */}
            <canvas ref={canvasRef} width={240} height={40} style={{ marginTop: 24, borderRadius: 8 }} />
          </div>

          {/* TRACK INFO & MARQUEE TITLE */}
          <div style={{ position: 'relative', zIndex: 10, marginBottom: 12, textAlign: 'center' }}>
            <div className="marquee-container" style={{ maxWidth: 320, margin: '0 auto' }}>
              <h2
                className={`marquee-content ${currentTrack.title.length > 24 ? 'marquee-active' : ''}`}
                style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', margin: 0 }}
              >
                {currentTrack.title}
              </h2>
            </div>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: '6px 0 0', fontWeight: 600 }}>
              {currentTrack.artist}
            </p>
          </div>

          {/* AI INSIGHT ASSISTANT CARD */}
          <div style={{ position: 'relative', zIndex: 10, background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 215, 0, 0.25)', borderRadius: 16, padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: '#FFD700', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} color="#FFD700" /> NIRMAAN AI Sound Analysis
              </span>
              <button
                onClick={generateAiInsight}
                disabled={loadingAi}
                style={{ background: 'rgba(255, 215, 0, 0.15)', border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: 8, padding: '3px 8px', color: '#FFD700', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}
              >
                {loadingAi ? 'Analyzing...' : 'Generate Insight'}
              </button>
            </div>
            <p style={{ fontSize: 11.5, color: '#D1D5DB', margin: 0, fontStyle: 'italic', lineHeight: 1.4 }}>
              {aiInsight || 'Tap "Generate Insight" for AI acoustic focus insights customized for your mental workflow.'}
            </p>
          </div>

          {/* SEEKBAR & COUNTERS */}
          <div style={{ position: 'relative', zIndex: 10, width: '100%', marginBottom: 16 }}>
            <input
              type="range"
              min={0}
              max={duration || currentTrack.duration || 100}
              value={currentTime}
              onChange={e => seekTo(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#FFD700', cursor: 'pointer', height: 6 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', marginTop: 6, fontWeight: 700 }}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration || currentTrack.duration)}</span>
            </div>
          </div>

          {/* MAIN PLAYER CONTROLS */}
          <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-around', marginBottom: 20 }}>
            <button onClick={toggleShuffle} style={{ background: 'none', border: 'none', color: shuffle ? '#FFD700' : '#6B7280', cursor: 'pointer' }}>
              <Shuffle size={20} />
            </button>

            <button onClick={prevTrack} style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', borderRadius: '50%', width: 50, height: 50, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <SkipBack size={22} />
            </button>

            <button
              onClick={togglePlay}
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FFD700, #F59E0B)',
                color: '#000000',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 24px rgba(255, 215, 0, 0.5)',
              }}
            >
              {isPlaying ? <Pause size={30} /> : <Play size={30} style={{ marginLeft: 3 }} />}
            </button>

            <button onClick={nextTrack} style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', borderRadius: '50%', width: 50, height: 50, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <SkipForward size={22} />
            </button>

            <button onClick={cycleLoopMode} style={{ background: 'none', border: 'none', color: loopMode !== 'none' ? '#FFD700' : '#6B7280', cursor: 'pointer' }}>
              <Repeat size={20} />
            </button>
          </div>

          {/* BOTTOM VOLUME & PLAYBACK RATE CONTROLS */}
          <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 14, padding: '8px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <button onClick={toggleMute} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}>
                {isMuted || volume === 0 ? <VolumeX size={16} color="#EF4444" /> : <Volume2 size={16} color="#FFD700" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={e => setVolume(Number(e.target.value))}
                style={{ width: 90, accentColor: '#FFD700', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {[1.0, 1.25, 1.5, 2.0].map(rate => (
                <button
                  key={rate}
                  onClick={() => setPlaybackRate(rate)}
                  style={{
                    padding: '3px 7px',
                    borderRadius: 6,
                    border: playbackRate === rate ? '1px solid #FFD700' : '1px solid transparent',
                    background: playbackRate === rate ? 'rgba(255, 215, 0, 0.2)' : 'transparent',
                    color: playbackRate === rate ? '#FFD700' : '#9CA3AF',
                    fontSize: 10.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
