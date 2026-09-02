import { create } from 'zustand'

export interface MediaTrack {
  id: string
  title: string
  artist: string
  album?: string
  duration: number // seconds
  url: string
  coverUrl?: string
  file?: File
  dateAdded: number
  category: 'Focus & Flow' | 'Binaural Beats' | 'Lo-Fi Beats' | 'Ambient & Nature' | 'Local Device Audio'
  playCount: number
  lastPlayed: number
  affinityScore: number
  isFavorite?: boolean
  fileFormat?: string
}

export interface MediaFolder {
  id: string
  name: string
  trackIds: string[]
  color?: string
  createdAt: number
}

export type LoopMode = 'none' | 'one' | 'all'
export type SortOption = 'most_played' | 'affinity' | 'recently_played' | 'title' | 'artist' | 'duration' | 'date'
export type CategoryFilter = 'all' | 'most_played' | 'favorites' | 'Local Device Audio' | 'Focus & Flow' | 'Binaural Beats' | 'Lo-Fi Beats' | 'Ambient & Nature'

const BUILTIN_TRACKS: MediaTrack[] = [
  {
    id: 'track-builtin-1',
    title: 'Deep Focus Alpha Waves (432Hz)',
    artist: 'NIRMAAN Soundscapes',
    album: 'High Performance OS',
    duration: 180,
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=ambient-lofi-112181.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&auto=format&fit=crop&q=80',
    dateAdded: Date.now() - 500000,
    category: 'Binaural Beats',
    playCount: 14,
    lastPlayed: Date.now() - 3600000,
    affinityScore: 160,
    isFavorite: true,
    fileFormat: 'MP3',
  },
  {
    id: 'track-builtin-2',
    title: 'Midnight Lo-Fi Coding Session',
    artist: 'Aesthetic Beats',
    album: 'Zero Distraction Flow',
    duration: 210,
    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=lofi-study-112191.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
    dateAdded: Date.now() - 400000,
    category: 'Lo-Fi Beats',
    playCount: 9,
    lastPlayed: Date.now() - 7200000,
    affinityScore: 110,
    isFavorite: true,
    fileFormat: 'MP3',
  },
  {
    id: 'track-builtin-3',
    title: 'Cyberpunk Ambient Rain & Thunder',
    artist: 'Atmospheric Labs',
    album: 'Deep Work Environment',
    duration: 240,
    url: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_8b2cb1601a.mp3?filename=rain-and-thunder-nature-sounds-7803.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&auto=format&fit=crop&q=80',
    dateAdded: Date.now() - 300000,
    category: 'Ambient & Nature',
    playCount: 18,
    lastPlayed: Date.now() - 1800000,
    affinityScore: 210,
    isFavorite: false,
    fileFormat: 'MP3',
  },
  {
    id: 'track-builtin-4',
    title: 'Theta State Memory Retention',
    artist: 'NeuroFlow OS',
    album: 'Cognitive Boost',
    duration: 195,
    url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=relaxation-meditation-10903.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80',
    dateAdded: Date.now() - 200000,
    category: 'Focus & Flow',
    playCount: 6,
    lastPlayed: Date.now() - 14400000,
    affinityScore: 75,
    isFavorite: false,
    fileFormat: 'MP3',
  },
]

const DEFAULT_FOLDERS: MediaFolder[] = [
  {
    id: 'folder-focus-1',
    name: '🧠 Deep Work & Coding',
    trackIds: ['track-builtin-1', 'track-builtin-2'],
    color: '#FFD700',
    createdAt: Date.now() - 1000000,
  },
  {
    id: 'folder-relax-2',
    name: '🌧️ Rain & Meditation',
    trackIds: ['track-builtin-3', 'track-builtin-4'],
    color: '#10B981',
    createdAt: Date.now() - 500000,
  },
]

interface MediaState {
  tracks: MediaTrack[]
  folders: MediaFolder[]
  activeFolderId: string | null
  currentTrackIndex: number
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  shuffle: boolean
  loopMode: LoopMode
  sortBy: SortOption
  categoryFilter: CategoryFilter
  searchQuery: string
  playbackRate: number
  sleepTimerEnd: number | null

  // Actions
  setTracks: (tracks: MediaTrack[]) => void
  addTracks: (newTracks: MediaTrack[]) => void
  removeTrack: (id: string) => void
  clearPlaylist: () => void
  playTrack: (index: number) => void
  togglePlay: () => void
  nextTrack: () => void
  prevTrack: () => void
  seekTo: (time: number) => void
  setVolume: (val: number) => void
  toggleMute: () => void
  toggleShuffle: () => void
  cycleLoopMode: () => void
  setSortBy: (sort: SortOption) => void
  setCategoryFilter: (category: CategoryFilter) => void
  setSearchQuery: (query: string) => void
  setPlaybackRate: (rate: number) => void
  setSleepTimer: (minutes: number | null) => void
  toggleFavorite: (id: string) => void
  updateTime: (current: number, total: number) => void
  recordTrackPlay: (id: string) => void

  // Folder Actions
  createFolder: (name: string, color?: string) => void
  deleteFolder: (folderId: string) => void
  setActiveFolder: (folderId: string | null) => void
  addTrackToFolder: (folderId: string, trackId: string) => void
  removeTrackFromFolder: (folderId: string, trackId: string) => void
}

function loadPersistedTracks(): MediaTrack[] {
  if (typeof window === 'undefined') return BUILTIN_TRACKS
  try {
    const stored = localStorage.getItem('nirmaan_media_tracks_v2')
    if (stored) {
      const parsed = JSON.parse(stored) as MediaTrack[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return BUILTIN_TRACKS
}

function loadPersistedFolders(): MediaFolder[] {
  if (typeof window === 'undefined') return DEFAULT_FOLDERS
  try {
    const stored = localStorage.getItem('nirmaan_media_folders_v1')
    if (stored) {
      const parsed = JSON.parse(stored) as MediaFolder[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return DEFAULT_FOLDERS
}

function saveTracksToStorage(tracks: MediaTrack[]) {
  if (typeof window === 'undefined') return
  try {
    const serializable = tracks.map(t => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { file, ...rest } = t
      return rest
    })
    localStorage.setItem('nirmaan_media_tracks_v2', JSON.stringify(serializable))
  } catch {}
}

function saveFoldersToStorage(folders: MediaFolder[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('nirmaan_media_folders_v1', JSON.stringify(folders))
  } catch {}
}

export const useMediaStore = create<MediaState>((set, get) => ({
  tracks: loadPersistedTracks(),
  folders: loadPersistedFolders(),
  activeFolderId: null,
  currentTrackIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.85,
  isMuted: false,
  shuffle: false,
  loopMode: 'none',
  sortBy: 'date',
  categoryFilter: 'all',
  searchQuery: '',
  playbackRate: 1.0,
  sleepTimerEnd: null,

  setTracks: (tracks) => {
    saveTracksToStorage(tracks)
    set({ tracks, currentTrackIndex: tracks.length > 0 ? 0 : -1 })
  },

  addTracks: (newTracks) => set((state) => {
    const combined = [...state.tracks, ...newTracks]
    saveTracksToStorage(combined)
    return {
      tracks: combined,
      currentTrackIndex: state.currentTrackIndex === -1 && combined.length > 0 ? 0 : state.currentTrackIndex,
    }
  }),

  removeTrack: (id) => set((state) => {
    const updated = state.tracks.filter(t => t.id !== id)
    saveTracksToStorage(updated)
    let nextIdx = state.currentTrackIndex
    if (nextIdx >= updated.length) nextIdx = updated.length - 1
    return { tracks: updated, currentTrackIndex: nextIdx }
  }),

  clearPlaylist: () => {
    saveTracksToStorage([])
    set({ tracks: [], currentTrackIndex: -1, isPlaying: false, currentTime: 0 })
  },

  playTrack: (index) => {
    const { tracks, recordTrackPlay } = get()
    if (index >= 0 && index < tracks.length) {
      recordTrackPlay(tracks[index].id)
    }
    set({ currentTrackIndex: index, isPlaying: true })
  },

  togglePlay: () => set((state) => {
    const nextState = !state.isPlaying
    if (nextState && state.currentTrackIndex >= 0 && state.tracks[state.currentTrackIndex]) {
      get().recordTrackPlay(state.tracks[state.currentTrackIndex].id)
    }
    return { isPlaying: nextState }
  }),

  nextTrack: () => {
    const { tracks, currentTrackIndex, shuffle, loopMode, recordTrackPlay } = get()
    if (tracks.length === 0) return

    if (shuffle) {
      const randIdx = Math.floor(Math.random() * tracks.length)
      recordTrackPlay(tracks[randIdx].id)
      set({ currentTrackIndex: randIdx, isPlaying: true })
      return
    }

    let nextIdx = currentTrackIndex + 1
    if (nextIdx >= tracks.length) {
      nextIdx = loopMode === 'all' ? 0 : tracks.length - 1
    }
    if (tracks[nextIdx]) recordTrackPlay(tracks[nextIdx].id)
    set({ currentTrackIndex: nextIdx, isPlaying: true })
  },

  prevTrack: () => {
    const { tracks, currentTrackIndex, shuffle, recordTrackPlay } = get()
    if (tracks.length === 0) return

    if (shuffle) {
      const randIdx = Math.floor(Math.random() * tracks.length)
      recordTrackPlay(tracks[randIdx].id)
      set({ currentTrackIndex: randIdx, isPlaying: true })
      return
    }

    let prevIdx = currentTrackIndex - 1
    if (prevIdx < 0) prevIdx = tracks.length - 1
    if (tracks[prevIdx]) recordTrackPlay(tracks[prevIdx].id)
    set({ currentTrackIndex: prevIdx, isPlaying: true })
  },

  seekTo: (time) => set({ currentTime: time }),

  setVolume: (val) => set({ volume: val, isMuted: val === 0 }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),

  cycleLoopMode: () => set((state) => {
    const modes: LoopMode[] = ['none', 'all', 'one']
    const nextMode = modes[(modes.indexOf(state.loopMode) + 1) % modes.length]
    return { loopMode: nextMode }
  }),

  setSortBy: (sortBy) => set({ sortBy }),

  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setPlaybackRate: (playbackRate) => set({ playbackRate }),

  setSleepTimer: (minutes) => set({
    sleepTimerEnd: minutes ? Date.now() + minutes * 60 * 1000 : null
  }),

  toggleFavorite: (id) => set((state) => {
    const updated = state.tracks.map(t => {
      if (t.id === id) {
        const isFav = !t.isFavorite
        return { ...t, isFavorite: isFav, affinityScore: t.affinityScore + (isFav ? 25 : -25) }
      }
      return t
    })
    saveTracksToStorage(updated)
    return { tracks: updated }
  }),

  updateTime: (currentTime, duration) => set({ currentTime, duration }),

  recordTrackPlay: (id) => set((state) => {
    const updated = state.tracks.map(t => {
      if (t.id === id) {
        const newCount = (t.playCount || 0) + 1
        const newAffinity = (newCount * 12) + (t.isFavorite ? 30 : 0)
        return {
          ...t,
          playCount: newCount,
          lastPlayed: Date.now(),
          affinityScore: newAffinity,
        }
      }
      return t
    })
    saveTracksToStorage(updated)
    return { tracks: updated }
  }),

  // Folder Actions
  createFolder: (name, color = '#FFD700') => set((state) => {
    const newFolder: MediaFolder = {
      id: `folder-${Date.now()}`,
      name: name.trim(),
      trackIds: [],
      color,
      createdAt: Date.now(),
    }
    const updated = [...state.folders, newFolder]
    saveFoldersToStorage(updated)
    return { folders: updated }
  }),

  deleteFolder: (folderId) => set((state) => {
    const updated = state.folders.filter(f => f.id !== folderId)
    saveFoldersToStorage(updated)
    return {
      folders: updated,
      activeFolderId: state.activeFolderId === folderId ? null : state.activeFolderId,
    }
  }),

  setActiveFolder: (folderId) => set({ activeFolderId: folderId }),

  addTrackToFolder: (folderId, trackId) => set((state) => {
    const updated = state.folders.map(f => {
      if (f.id === folderId && !f.trackIds.includes(trackId)) {
        return { ...f, trackIds: [...f.trackIds, trackId] }
      }
      return f
    })
    saveFoldersToStorage(updated)
    return { folders: updated }
  }),

  removeTrackFromFolder: (folderId, trackId) => set((state) => {
    const updated = state.folders.map(f => {
      if (f.id === folderId) {
        return { ...f, trackIds: f.trackIds.filter(id => id !== trackId) }
      }
      return f
    })
    saveFoldersToStorage(updated)
    return { folders: updated }
  }),
}))
