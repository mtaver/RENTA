import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export interface AccountProfile {
  user_id: string
  display_name: string
  is_landlord: boolean
  is_tenant: boolean
}

interface AuthState {
  configured: boolean
  loading: boolean
  session: Session | null
  profile: AccountProfile | null
  isAgencyStaff: boolean
  profileError: string | null
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [isAgencyStaff, setIsAgencyStaff] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const refreshProfile = async () => {
    if (!supabase || !session?.user) {
      setProfile(null)
      setIsAgencyStaff(false)
      return
    }

    const [profileResult, staffResult] = await Promise.all([
      supabase.from('profiles').select('user_id, display_name, is_landlord, is_tenant').eq('user_id', session.user.id).maybeSingle(),
      supabase.from('agency_staff').select('user_id').eq('user_id', session.user.id).maybeSingle(),
    ])

    if (profileResult.error) {
      setProfileError('Your account is signed in, but the profile could not be loaded.')
      setProfile(null)
    } else {
      setProfile(profileResult.data as AccountProfile | null)
      setProfileError(null)
    }
    setIsAgencyStaff(Boolean(staffResult.data) && !staffResult.error)
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session)
        setLoading(false)
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    void refreshProfile()
  }, [session?.user.id])

  const value = useMemo(() => ({ configured: isSupabaseConfigured, loading, session, profile, isAgencyStaff, profileError, refreshProfile }), [loading, session, profile, isAgencyStaff, profileError])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
