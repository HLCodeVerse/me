'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/supabase/database.types'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  setDirectUser: (profile: Profile) => void
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  setDirectUser: () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) {
      setProfile(data)
      if (typeof window !== 'undefined') {
        localStorage.setItem('nirmaan_direct_user', JSON.stringify(data))
      }
    }
  }, [supabase])

  const setDirectUser = useCallback((prof: Profile) => {
    const syntheticUser = { id: prof.id, phone: prof.phone } as unknown as User
    setUser(syntheticUser)
    setProfile(prof)
    if (typeof window !== 'undefined') {
      localStorage.setItem('nirmaan_direct_user', JSON.stringify(prof))
      document.cookie = 'nirmaan_session=true; path=/; max-age=2592000; SameSite=Lax'
      document.cookie = `nirmaan_user_id=${prof.id}; path=/; max-age=2592000; SameSite=Lax`
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id)
  }, [user, fetchProfile])

  useEffect(() => {
    let hasDirect = false
    // 1. Check local storage for direct DB session
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nirmaan_direct_user')
      if (stored) {
        try {
          const prof = JSON.parse(stored) as Profile
          setUser({ id: prof.id, phone: prof.phone } as unknown as User)
          setProfile(prof)
          document.cookie = 'nirmaan_session=true; path=/; max-age=2592000; SameSite=Lax'
          document.cookie = `nirmaan_user_id=${prof.id}; path=/; max-age=2592000; SameSite=Lax`
          fetchProfile(prof.id)
          hasDirect = true
        } catch {}
      }
    }

    // 2. Check Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setSession(session)
          setUser(session.user)
          if (typeof window !== 'undefined') {
            document.cookie = 'nirmaan_session=true; path=/; max-age=2592000; SameSite=Lax'
            document.cookie = `nirmaan_user_id=${session.user.id}; path=/; max-age=2592000; SameSite=Lax`
          }
          await fetchProfile(session.user.id)
        }
        setLoading(false)
      }
    )

    if (hasDirect) {
      setLoading(false)
    }

    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])

  const signOut = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nirmaan_direct_user')
      document.cookie = 'nirmaan_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'nirmaan_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, setDirectUser, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
