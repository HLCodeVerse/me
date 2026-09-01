'use client'

import { useState, useRef, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useMediaStore, MediaTrack, SortOption, CategoryFilter } from '@/lib/media-store'
import {
  Music, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat,
  Volume2, VolumeX, FolderPlus, Trash2, Search,
  Disc, Heart, Sparkles, SlidersHorizontal, Flame, Gauge, Clock, UploadCloud, Folder, Plus, X
} from 'lucide-react'
import { toast } from 'sonner'

export default function PlayerPage() {
  const {
    tracks,
    folders,
    activeFolderId,
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
    sleepTimerEnd,
    addTracks,
    removeTrack,
    clearPlaylist,
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
    setSleepTimer,
    toggleFavorite,
    createFolder,
    deleteFolder,
    setActiveFolder,
    addTrackToFolder,
    removeTrackFromFolder,
  } = useMediaStore()

  const [isDragOver, setIsDragOver] = useState(false)
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [openFolderMenuTrackId, setOpenFolderMenuTrackId] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const currentTrack = tracks[currentTrackIndex]

  // Dynamic Audio Visualizer Animation Loop
  useEffect(() => {
    if (!canvasRef.current || !isPlaying) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const barCount = 36

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < barCount; i++) {
        const height = Math.floor(Math.random() * (canvas.height - 8)) + 8
        const x = i * (canvas.width / barCount)
        const width = (canvas.width / barCount) - 3

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

  // Handle Local Device Audio File Import (MP3, M4A, WAV, AAC, FLAC, OGG)
  function processAudioFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList)
    if (files.length === 0) return

    const newTracks: MediaTrack[] = []

    files.forEach((file, idx) => {
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|flac|aac|webm|opus)$/i)) return

      const url = URL.createObjectURL(file)
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ').replace(/-/g, ' ')
      const ext = file.name.split('.').pop()?.toUpperCase() || 'AUDIO'

      newTracks.push({
        id: `local-track-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        title: cleanTitle,
        artist: 'Device Local Library',
        album: 'Local Storage',
        duration: 0,
        url,
        file,
        dateAdded: Date.now(),
        category: 'Local Device Audio',
        playCount: 1,
        lastPlayed: Date.now(),
        affinityScore: 20,
        isFavorite: false,
        fileFormat: ext,
      })
    })

    if (newTracks.length > 0) {
      addTracks(newTracks)
      toast.success(`Imported ${newTracks.length} local audio track(s)! 🎵`)
    } else {
      toast.error('No supported audio files found. (Supported: MP3, M4A, WAV, AAC, FLAC, OGG)')
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) processAudioFiles(e.target.files)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files) processAudioFiles(e.dataTransfer.files)
  }

  function handleFolderCreateSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newFolderName.trim()) return
    createFolder(newFolderName.trim())
    toast.success(`Folder "${newFolderName.trim()}" created! 📁`)
    setNewFolderName('')
    setShowCreateFolderModal(false)
  }

  // Active Folder Filter
  const activeFolder = folders.find(f => f.id === activeFolderId)

  // Filter & Sort Engine
  const filteredTracks = tracks.filter(t => {
    // If active folder selected, restrict to tracks in folder
    if (activeFolderId && activeFolder) {
      if (!activeFolder.trackIds.includes(t.id)) return false
    }

    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.category.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false

    if (categoryFilter === 'all') return true
    if (categoryFilter === 'most_played') return t.playCount > 3
    if (categoryFilter === 'favorites') return Boolean(t.isFavorite)
    return t.category === categoryFilter
  })

  const sortedTracks = [...filteredTracks].sort((a, b) => {
    if (sortBy === 'most_played') return b.playCount - a.playCount
    if (sortBy === 'affinity') return b.affinityScore - a.affinityScore
    if (sortBy === 'recently_played') return b.lastPlayed - a.lastPlayed
    if (sortBy === 'title') return a.title.localeCompare(b.title)
    if (sortBy === 'duration') return b.duration - a.duration
    if (sortBy === 'date') return b.dateAdded - a.dateAdded
    return 0
  })

  function formatSecs(sec: number) {
    if (isNaN(sec) || sec <= 0) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #FFD700, #F59E0B)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000000',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
            }}>
              <Disc size={20} className={isPlaying ? 'animate-spin' : ''} style={{ animationDuration: '4s' }} color="#000000" />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 6 }}>
                NIRMAAN Audio Engine <Sparkles size={16} color="#FFD700" />
              </h1>
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>ML Track Intelligence, Custom Folders & Local Audio</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowCreateFolderModal(true)}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: 12.5 }}
            >
              <FolderPlus size={15} color="#FFD700" /> New Playlist Folder
            </button>
            <label className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Folder size={15} color="#FFD700" /> Import Device Folder
              {/* @ts-expect-error - webkitdirectory is non-standard HTML5 directory attribute */}
              <input type="file" multiple webkitdirectory="" directory="" onChange={handleFileInputChange} style={{ display: 'none' }} />
            </label>
            <label className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <UploadCloud size={16} /> Import Files
              <input type="file" multiple accept="audio/*,.mp3,.m4a,.wav,.aac,.flac,.ogg" onChange={handleFileInputChange} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      }
    >
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 24, position: 'relative' }}>

        {/* Dynamic Fog / Gas Glow Animation Keyframes */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes fogGlowPulse {
            0%, 100% { transform: scale(1) translate(0px, 0px); opacity: 0.35; }
            50% { transform: scale(1.2) translate(30px, -20px); opacity: 0.65; }
          }
        `}} />

        {/* Hero Dynamic Player Card with Fog Gas Glow Backdrop */}
        <div style={{
          position: 'relative',
          borderRadius: 24,
          background: 'linear-gradient(135deg, #0A0B0D 0%, #121318 50%, #1A1C24 100%)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          padding: '28px 24px',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}>

          {/* Ambient Glowing Fog Gas Orbs */}
          <div style={{
            position: 'absolute',
            top: '-20%',
            left: '20%',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0) 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
            animation: 'fogGlowPulse 8s ease-in-out infinite',
          }} />

          <div style={{
            position: 'absolute',
            bottom: '-20%',
            right: '20%',
            width: 340,
            height: 340,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0) 70%)',
            filter: 'blur(70px)',
            pointerEvents: 'none',
            animation: 'fogGlowPulse 10s ease-in-out infinite alternate',
          }} />

          {/* Spinning Vinyl Emblem */}
          <div style={{
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFD700 0%, #F59E0B 50%, #10B981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isPlaying ? '0 15px 45px rgba(245, 158, 11, 0.5)' : '0 10px 30px rgba(0,0,0,0.6)',
            marginBottom: 18,
            position: 'relative',
            border: '4px solid rgba(255, 255, 255, 0.15)',
          }}>
            <Disc
              size={64}
              color="#000000"
              className={isPlaying ? 'animate-spin' : ''}
              style={{ animationDuration: '6s' }}
            />
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#0A0B0D', border: '2px solid #F59E0B', position: 'absolute' }} />
          </div>

          {/* ML Track Badge */}
          {currentTrack && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span className="badge badge-warning">
                <Flame size={12} color="#FFD700" /> ML Play Count: {currentTrack.playCount}
              </span>
              <span className="badge badge-success">
                <Sparkles size={12} color="#10B981" /> ML Affinity: {currentTrack.affinityScore}
              </span>
              {currentTrack.fileFormat && (
                <span className="badge badge-muted">
                  {currentTrack.fileFormat}
                </span>
              )}
            </div>
          )}

          {/* Track Title & Artist */}
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#FFFFFF', margin: '0 0 6px', maxWidth: 460, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack ? currentTrack.title : 'No Track Selected'}
          </h2>
          <p style={{ fontSize: 13, color: '#F59E0B', margin: '0 0 18px', fontWeight: 600 }}>
            {currentTrack ? `${currentTrack.artist || 'Local Device Audio'} • ${currentTrack.category}` : 'Import or select a track below'}
          </p>

          {/* Real-time Spectrum Visualizer Canvas */}
          <canvas
            ref={canvasRef}
            width={280}
            height={36}
            style={{ width: 280, height: 36, borderRadius: 8, marginBottom: 18, opacity: isPlaying ? 1 : 0.3 }}
          />

          {/* Seek Bar */}
          <div style={{ width: '100%', maxWidth: 520, marginBottom: 18 }}>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seekTo(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#F59E0B', height: 6 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#9CA3AF', marginTop: 6, fontWeight: 700 }}>
              <span>{formatSecs(currentTime)}</span>
              <span>{formatSecs(duration)}</span>
            </div>
          </div>

          {/* Main Playback Control Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
            <button
              onClick={toggleShuffle}
              style={{
                background: shuffle ? 'rgba(245, 158, 11, 0.2)' : 'none',
                border: `1px solid ${shuffle ? '#F59E0B' : 'transparent'}`,
                borderRadius: 8,
                padding: 6,
                cursor: 'pointer',
                color: shuffle ? '#FFD700' : '#9CA3AF',
              }}
              title="Toggle Shuffle Mode"
            >
              <Shuffle size={19} />
            </button>

            <button onClick={prevTrack} className="btn-ghost btn-icon" style={{ width: 44, height: 44 }}>
              <SkipBack size={22} color="#FFFFFF" />
            </button>

            <button
              onClick={togglePlay}
              disabled={!currentTrack}
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000000',
                boxShadow: '0 10px 30px rgba(245, 158, 11, 0.5)',
                transition: 'transform 150ms ease',
              }}
            >
              {isPlaying ? <Pause size={28} fill="#000000" color="#000000" /> : <Play size={28} fill="#000000" color="#000000" style={{ marginLeft: 4 }} />}
            </button>

            <button onClick={nextTrack} className="btn-ghost btn-icon" style={{ width: 44, height: 44 }}>
              <SkipForward size={22} color="#FFFFFF" />
            </button>

            <button
              onClick={cycleLoopMode}
              style={{
                background: loopMode !== 'none' ? 'rgba(245, 158, 11, 0.2)' : 'none',
                border: `1px solid ${loopMode !== 'none' ? '#F59E0B' : 'transparent'}`,
                borderRadius: 8,
                padding: 6,
                cursor: 'pointer',
                color: loopMode !== 'none' ? '#FFD700' : '#9CA3AF',
                position: 'relative',
              }}
              title={`Loop Mode: ${loopMode}`}
            >
              <Repeat size={19} />
              {loopMode === 'one' && <span style={{ fontSize: 9, fontWeight: 900, position: 'absolute', top: 2, right: 2, color: '#FFD700' }}>1</span>}
            </button>

            {currentTrack && (
              <button
                onClick={() => toggleFavorite(currentTrack.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}
                title="Toggle Favorite"
              >
                <Heart size={20} fill={currentTrack.isFavorite ? '#EF4444' : 'none'} color={currentTrack.isFavorite ? '#EF4444' : '#9CA3AF'} />
              </button>
            )}
          </div>

          {/* Secondary Controls Bar: Speed, Sleep Timer, Volume */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            paddingTop: 16,
            borderTop: '1px solid rgba(245, 158, 11, 0.2)',
            width: '100%',
            maxWidth: 520,
          }}>
            {/* Playback Speed */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Gauge size={15} color="#F59E0B" />
              <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700 }}>SPEED:</span>
              <select
                value={playbackRate}
                onChange={e => setPlaybackRate(Number(e.target.value))}
                style={{ background: '#121318', color: '#FFFFFF', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 8, padding: '4px 8px', fontSize: 12, outline: 'none' }}
              >
                <option value={0.75}>0.75x</option>
                <option value={1.0}>1.0x (Normal)</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2.0}>2.0x</option>
              </select>
            </div>

            {/* Sleep Timer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={15} color="#10B981" />
              <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700 }}>SLEEP:</span>
              <select
                onChange={e => {
                  const val = e.target.value ? Number(e.target.value) : null
                  setSleepTimer(val)
                  toast.success(val ? `Sleep timer set for ${val} minutes 🌙` : 'Sleep timer turned off')
                }}
                style={{ background: '#121318', color: '#FFFFFF', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 8, padding: '4px 8px', fontSize: 12, outline: 'none' }}
              >
                <option value="">Off</option>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
              </select>
              {sleepTimerEnd && (
                <span style={{ fontSize: 10, color: '#10B981', fontWeight: 700 }}>Active</span>
              )}
            </div>

            {/* Volume */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 140 }}>
              <button onClick={toggleMute} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} color="#F59E0B" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                style={{ flex: 1, cursor: 'pointer', accentColor: '#F59E0B' }}
              />
            </div>
          </div>
        </div>

        {/* Media Folders Bar */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#F59E0B', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Folder size={15} color="#F59E0B" /> CUSTOM MEDIA FOLDERS
            </div>
            {activeFolderId && (
              <button
                onClick={() => setActiveFolder(null)}
                style={{ fontSize: 11.5, color: '#FFD700', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
              >
                View All Folders
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
            <button
              onClick={() => setActiveFolder(null)}
              style={{
                padding: '10px 16px',
                borderRadius: 14,
                border: `1px solid ${activeFolderId === null ? '#F59E0B' : 'rgba(245, 158, 11, 0.25)'}`,
                background: activeFolderId === null ? 'rgba(245, 158, 11, 0.2)' : '#121318',
                color: activeFolderId === null ? '#FFD700' : '#FFFFFF',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>📁 All Tracks ({tracks.length})</span>
            </button>

            {folders.map(folder => (
              <div
                key={folder.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 14,
                  border: `1px solid ${activeFolderId === folder.id ? folder.color || '#F59E0B' : 'rgba(245, 158, 11, 0.25)'}`,
                  background: activeFolderId === folder.id ? 'rgba(245, 158, 11, 0.25)' : '#121318',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                onClick={() => setActiveFolder(folder.id)}
              >
                <span>{folder.name} ({folder.trackIds.length})</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteFolder(folder.id)
                    toast.info(`Deleted folder "${folder.name}"`)
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2 }}
                  title="Delete Folder"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Drag & Drop Device Upload Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragOver ? '#F59E0B' : 'rgba(245, 158, 11, 0.3)'}`,
            borderRadius: 18,
            padding: '20px',
            textAlign: 'center',
            background: isDragOver ? 'rgba(245, 158, 11, 0.1)' : '#0A0B0D',
            transition: 'all 200ms ease',
          }}
        >
          <UploadCloud size={28} color="#F59E0B" style={{ margin: '0 auto 8px' }} />
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px' }}>
            Drag & Drop Audio Files Here or Browse Device
          </h3>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 12px' }}>
            Auto-discovers and categorizes MP3, M4A, WAV, AAC, FLAC, OGG files automatically
          </p>
          <label className="btn btn-secondary" style={{ padding: '6px 16px', fontSize: 12, cursor: 'pointer' }}>
            Browse Device Files
            <input type="file" multiple accept="audio/*,.mp3,.m4a,.wav,.aac,.flac,.ogg" onChange={handleFileInputChange} style={{ display: 'none' }} />
          </label>
        </div>

        {/* Category Filters Pill Bar */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {[
            { id: 'all', label: 'All Categories' },
            { id: 'most_played', label: '🔥 ML Most Played' },
            { id: 'favorites', label: '⭐ Favorites' },
            { id: 'Local Device Audio', label: '📂 Local Device Audio' },
            { id: 'Focus & Flow', label: '⚡ Focus & Flow' },
            { id: 'Binaural Beats', label: '🧠 Binaural Beats' },
            { id: 'Lo-Fi Beats', label: '🎧 Lo-Fi Beats' },
            { id: 'Ambient & Nature', label: '🌧️ Ambient & Nature' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id as CategoryFilter)}
              style={{
                padding: '8px 14px',
                borderRadius: 99,
                border: `1px solid ${categoryFilter === cat.id ? '#F59E0B' : 'rgba(245, 158, 11, 0.25)'}`,
                background: categoryFilter === cat.id ? 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)' : '#121318',
                color: categoryFilter === cat.id ? '#000000' : '#FFFFFF',
                fontSize: 12.5,
                fontWeight: categoryFilter === cat.id ? 800 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 150ms ease',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Sorting Toolbar */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={16} color="#F59E0B" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              placeholder="Search by title, artist, or format..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: 42,
                paddingLeft: 42,
                paddingRight: 14,
                background: '#121318',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 12,
                color: '#FFFFFF',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9CA3AF', fontSize: 12, fontWeight: 700 }}>
              <SlidersHorizontal size={15} color="#F59E0B" /> Sort:
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              style={{ height: 42, fontSize: 12.5, background: '#121318', color: '#FFFFFF', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 12, padding: '0 12px', outline: 'none' }}
            >
              <option value="most_played">🔥 ML Most Played Rank</option>
              <option value="affinity">⭐ ML Affinity Score</option>
              <option value="recently_played">🕒 Recently Played</option>
              <option value="title">Title (A-Z)</option>
              <option value="duration">Duration (Longest)</option>
              <option value="date">Date Added</option>
            </select>

            {tracks.length > 0 && (
              <button onClick={clearPlaylist} className="btn btn-secondary" style={{ height: 42, fontSize: 12, color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <Trash2 size={15} /> Clear All
              </button>
            )}
          </div>
        </div>

        {/* Track List Items */}
        {sortedTracks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#0A0B0D', borderRadius: 20, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <Disc size={40} color="#F59E0B" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px' }}>No tracks match active filter</h3>
            <p style={{ color: '#9CA3AF', fontSize: 13, maxWidth: 360, margin: '0 auto 16px' }}>
              Import local audio files or clear your search query to view all tracks.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedTracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id
              const realIndex = tracks.findIndex(t => t.id === track.id)

              return (
                <div
                  key={track.id}
                  onClick={() => playTrack(realIndex)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 16,
                    cursor: 'pointer',
                    background: isCurrent ? 'rgba(245, 158, 11, 0.15)' : '#121318',
                    border: `1px solid ${isCurrent ? '#F59E0B' : 'rgba(245, 158, 11, 0.2)'}`,
                    boxShadow: isCurrent ? '0 4px 20px rgba(245, 158, 11, 0.25)' : 'none',
                    transition: 'all 150ms ease',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: isCurrent ? '#FFD700' : '#9CA3AF', width: 24, textAlign: 'center' }}>
                      #{idx + 1}
                    </div>

                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: isCurrent ? 'linear-gradient(135deg, #FFD700, #F59E0B)' : '#1A1C24',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {isCurrent && isPlaying ? (
                        <Disc size={20} color="#000000" className="animate-spin" />
                      ) : (
                        <Music size={18} color={isCurrent ? '#000000' : '#F59E0B'} />
                      )}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: isCurrent ? 800 : 700, color: isCurrent ? '#FFD700' : '#FFFFFF', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {track.title}
                      </p>
                      <p style={{ fontSize: 11.5, color: '#9CA3AF', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {track.artist || 'Local Device Track'} • <span style={{ color: '#F59E0B' }}>{track.category}</span>
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#FFD700' }}>
                        🔥 {track.playCount} Plays
                      </div>
                      <div style={{ fontSize: 10, color: '#9CA3AF' }}>
                        Score: {track.affinityScore}
                      </div>
                    </div>

                    {/* Folder Dropdown Toggle Button */}
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenFolderMenuTrackId(openFolderMenuTrackId === track.id ? null : track.id)
                        }}
                        style={{ background: '#1A1C24', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 8, padding: '5px 8px', color: '#FFD700', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                        title="Add to folder"
                      >
                        <Folder size={13} color="#FFD700" /> + Folder
                      </button>

                      {openFolderMenuTrackId === track.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: '100%',
                            marginTop: 6,
                            zIndex: 100,
                            background: '#0A0B0D',
                            border: '1px solid #F59E0B',
                            borderRadius: 12,
                            padding: 8,
                            minWidth: 180,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.9)',
                          }}
                        >
                          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#9CA3AF', padding: '4px 8px', letterSpacing: '0.06em' }}>
                            ADD TO FOLDER:
                          </div>
                          {folders.map(f => {
                            const inFolder = f.trackIds.includes(track.id)
                            return (
                              <button
                                key={f.id}
                                onClick={() => {
                                  if (inFolder) {
                                    removeTrackFromFolder(f.id, track.id)
                                    toast.info(`Removed from "${f.name}"`)
                                  } else {
                                    addTrackToFolder(f.id, track.id)
                                    toast.success(`Added to "${f.name}"! 📁`)
                                  }
                                  setOpenFolderMenuTrackId(null)
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  width: '100%',
                                  padding: '7px 10px',
                                  borderRadius: 8,
                                  border: 'none',
                                  background: inFolder ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                                  color: inFolder ? '#FFD700' : '#FFFFFF',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                <span>{f.name}</span>
                                {inFolder && <span style={{ fontSize: 10, fontWeight: 800 }}>✓</span>}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(track.id)
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                      title="Favorite Track"
                    >
                      <Heart size={18} fill={track.isFavorite ? '#EF4444' : 'none'} color={track.isFavorite ? '#EF4444' : '#9CA3AF'} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeTrack(track.id)
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}
                      title="Remove Track"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* Create New Folder Modal */}
      {showCreateFolderModal && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, backdropFilter: 'blur(6px)' }}
            onClick={() => setShowCreateFolderModal(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 210,
              width: '90%',
              maxWidth: 400,
              background: '#0A0B0D',
              border: '1px solid #F59E0B',
              borderRadius: 20,
              padding: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800, color: '#FFFFFF' }}>
                <FolderPlus size={20} color="#F59E0B" /> Create Custom Media Folder
              </div>
              <button onClick={() => setShowCreateFolderModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFolderCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#F59E0B', marginBottom: 6, display: 'block' }}>FOLDER NAME</label>
                <input
                  type="text"
                  placeholder="e.g. 🎧 High Energy Workout"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  autoFocus
                  required
                  style={{ width: '100%', height: 44, background: '#121318', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 12, color: '#FFFFFF', padding: '0 14px', fontSize: 13, outline: 'none' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ height: 44, fontSize: 14, marginTop: 4 }}>
                <Plus size={16} /> Create Folder
              </button>
            </form>
          </div>
        </>
      )}
    </AppShell>
  )
}
