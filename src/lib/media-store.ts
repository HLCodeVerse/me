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
}

export type LoopMode = 'none' | 'one' | 'all'
export type SortOption = 'title' | 'artist' | 'duration' | 'date'

interface MediaState {
  tracks: MediaTrack[]
  currentTrackIndex: number
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  shuffle: boolean
  loopMode: LoopMode
  sortBy: SortOption
  searchQuery: string

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
  setSearchQuery: (query: string) => void
  updateTime: (current: number, total: number) => void
}

export const useMediaStore = create<MediaState>((set, get) => ({
  tracks: [],
  currentTrackIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  shuffle: false,
  loopMode: 'none',
  sortBy: 'title',
  searchQuery: '',

  setTracks: (tracks) => set({ tracks, currentTrackIndex: tracks.length > 0 ? 0 : -1 }),

  addTracks: (newTracks) => set((state) => {
    const combined = [...state.tracks, ...newTracks]
    return {
      tracks: combined,
      currentTrackIndex: state.currentTrackIndex === -1 && combined.length > 0 ? 0 : state.currentTrackIndex,
    }
  }),

  removeTrack: (id) => set((state) => {
    const updated = state.tracks.filter(t => t.id !== id)
    let nextIdx = state.currentTrackIndex
    if (nextIdx >= updated.length) nextIdx = updated.length - 1
    return { tracks: updated, currentTrackIndex: nextIdx }
  }),

  clearPlaylist: () => set({ tracks: [], currentTrackIndex: -1, isPlaying: false, currentTime: 0 }),

  playTrack: (index) => set({ currentTrackIndex: index, isPlaying: true }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  nextTrack: () => {
    const { tracks, currentTrackIndex, shuffle, loopMode } = get()
    if (tracks.length === 0) return

    if (shuffle) {
      const randIdx = Math.floor(Math.random() * tracks.length)
      set({ currentTrackIndex: randIdx, isPlaying: true })
      return
    }

    let nextIdx = currentTrackIndex + 1
    if (nextIdx >= tracks.length) {
      nextIdx = loopMode === 'all' ? 0 : tracks.length - 1
    }
    set({ currentTrackIndex: nextIdx, isPlaying: true })
  },

  prevTrack: () => {
    const { tracks, currentTrackIndex, shuffle } = get()
    if (tracks.length === 0) return

    if (shuffle) {
      const randIdx = Math.floor(Math.random() * tracks.length)
      set({ currentTrackIndex: randIdx, isPlaying: true })
      return
    }

    let prevIdx = currentTrackIndex - 1
    if (prevIdx < 0) prevIdx = tracks.length - 1
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

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  updateTime: (currentTime, duration) => set({ currentTime, duration }),
}))
