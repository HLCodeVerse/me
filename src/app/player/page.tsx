'use client'

import AppShell from '@/components/layout/AppShell'
import { useMediaStore, MediaTrack, SortOption } from '@/lib/media-store'
import {
  Music, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat,
  Volume2, VolumeX, FolderPlus, Trash2, Search,
  ListMusic, Disc
} from 'lucide-react'
import { toast } from 'sonner'

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
    searchQuery,
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
    setSearchQuery,
  } = useMediaStore()

  const currentTrack = tracks[currentTrackIndex]

  // Scan & Load Local Audio Files from Device
  function handleDeviceAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newTracks: MediaTrack[] = []

    files.forEach((file, idx) => {
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|flac|aac)$/i)) return

      const url = URL.createObjectURL(file)
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')

      newTracks.push({
        id: `track-${Date.now()}-${idx}-${Math.random()}`,
        title: cleanTitle,
        artist: 'Device Audio',
        album: 'Local Storage',
        duration: 0,
        url,
        file,
        dateAdded: Date.now(),
      })
    })

    if (newTracks.length > 0) {
      addTracks(newTracks)
      toast.success(`Imported ${newTracks.length} music track(s) from device! 🎵`)
    } else {
      toast.error('No supported audio files found.')
    }
    setLoadingFiles(false)
  }

  // Filter & Sort Tracks
  const filteredTracks = tracks.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.artist.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sortedTracks = [...filteredTracks].sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title)
    if (sortBy === 'artist') return a.artist.localeCompare(b.artist)
    if (sortBy === 'duration') return a.duration - b.duration
    if (sortBy === 'date') return b.dateAdded - a.dateAdded
    return 0
  })

  function formatSecs(sec: number) {
    if (isNaN(sec)) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Disc size={20} color="#7C3AED" className={isPlaying ? 'animate-spin' : ''} />
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>NIRMAAN Audio Hub</h1>
          </div>
          <label className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>
            <FolderPlus size={15} /> Import Device Music
            <input type="file" multiple accept="audio/*" onChange={handleDeviceAudioUpload} style={{ display: 'none' }} />
          </label>
        </div>
      }
    >
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Hero Now Playing Card */}
        <div
          className="card"
          style={{
            padding: '24px',
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(59, 130, 246, 0.1))',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Cover Disc Graphic */}
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 32px rgba(124, 58, 237, 0.35)',
              marginBottom: 16,
              position: 'relative',
            }}
          >
            <Disc size={64} color="#FFFFFF" className={isPlaying ? 'animate-spin' : ''} style={{ animationDuration: '6s' }} />
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface)', position: 'absolute' }} />
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px', maxWidth: 360, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack ? currentTrack.title : 'No Track Playing'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            {currentTrack ? (currentTrack.artist || 'Local Audio File') : 'Import music files below to start playing'}
          </p>

          {/* Timeline Seek Bar */}
          <div style={{ width: '100%', maxWidth: 460, marginBottom: 16 }}>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seekTo(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#7C3AED' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              <span>{formatSecs(currentTime)}</span>
              <span>{formatSecs(duration)}</span>
            </div>
          </div>

          {/* Main Controls Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
            <button
              onClick={toggleShuffle}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: shuffle ? '#7C3AED' : 'var(--text-muted)'
              }}
            >
              <Shuffle size={18} />
            </button>

            <button onClick={prevTrack} className="btn-ghost btn-icon" style={{ width: 42, height: 42 }}>
              <SkipBack size={20} />
            </button>

            <button
              onClick={togglePlay}
              disabled={!currentTrack}
              style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                background: 'var(--primary-gradient)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                boxShadow: '0 8px 24px rgba(124, 58, 237, 0.4)',
              }}
            >
              {isPlaying ? <Pause size={24} fill="#FFF" /> : <Play size={24} fill="#FFF" style={{ marginLeft: 3 }} />}
            </button>

            <button onClick={nextTrack} className="btn-ghost btn-icon" style={{ width: 42, height: 42 }}>
              <SkipForward size={20} />
            </button>

            <button
              onClick={cycleLoopMode}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: loopMode !== 'none' ? '#7C3AED' : 'var(--text-muted)'
              }}
            >
              <Repeat size={18} />
              {loopMode === 'one' && <span style={{ fontSize: 9, fontWeight: 800, position: 'absolute' }}>1</span>}
            </button>
          </div>

          {/* Volume Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 220 }}>
            <button onClick={toggleMute} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              style={{ flex: 1, cursor: 'pointer', accentColor: '#7C3AED' }}
            />
          </div>
        </div>

        {/* Playlist & Search Toolbar */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card" style={{ flex: 1, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Search size={15} color="var(--text-muted)" />
            <input
              placeholder="Search playlist tracks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ flex: 1, border: 'none', background: 'transparent', padding: 0, fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              style={{ height: 38, fontSize: 12, padding: '0 10px' }}
            >
              <option value="title">Sort: Title A-Z</option>
              <option value="artist">Sort: Artist</option>
              <option value="duration">Sort: Duration</option>
              <option value="date">Sort: Date Added</option>
            </select>

            {tracks.length > 0 && (
              <button onClick={clearPlaylist} className="btn btn-secondary" style={{ height: 38, fontSize: 12, color: 'var(--danger)' }}>
                <Trash2 size={14} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Playlist Items List */}
        {sortedTracks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <ListMusic size={28} color="#7C3AED" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>No tracks in playlist</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 320, margin: '0 auto 20px' }}>
              Select audio files or music folders from your device to listen while working.
            </p>
            <label className="btn btn-primary">
              <FolderPlus size={15} /> Select Device Music
              <input type="file" multiple accept="audio/*" onChange={handleDeviceAudioUpload} style={{ display: 'none' }} />
            </label>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sortedTracks.map((track) => {
              const isCurrent = currentTrack?.id === track.id
              const realIndex = tracks.findIndex(t => t.id === track.id)

              return (
                <div
                  key={track.id}
                  className="card"
                  onClick={() => playTrack(realIndex)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    background: isCurrent ? 'rgba(124, 58, 237, 0.1)' : 'var(--surface)',
                    border: `1px solid ${isCurrent ? '#7C3AED' : 'var(--border)'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 6,
                        background: isCurrent ? 'var(--primary-gradient)' : 'var(--surface-3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isCurrent && isPlaying ? (
                        <Disc size={16} color="#FFF" className="animate-spin" />
                      ) : (
                        <Music size={16} color={isCurrent ? '#FFF' : 'var(--text-muted)'} />
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: isCurrent ? 700 : 600, color: isCurrent ? '#7C3AED' : 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {track.title}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        {track.artist}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeTrack(track.id)
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </AppShell>
  )
}
