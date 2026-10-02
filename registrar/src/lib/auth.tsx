import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Registrar } from './types'

interface AuthValue {
  session: Session | null
  /** The signed-in user's registrars row, or null while it is still loading. */
  registrar: Registrar | null
  /** True until the stored session has been restored on first paint. */
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [registrar, setRegistrar] = useState<Registrar | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      setLoading(false)
    })

    // Only mirrors the session into state — calling back into supabase from
    // inside this listener can deadlock the client, so the profile fetch lives
    // in its own effect below.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id ?? null

  useEffect(() => {
    if (!userId) {
      setRegistrar(null)
      return
    }

    let cancelled = false
    supabase
      .from('registrars')
      .select('id, full_name, role')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return
        setRegistrar({ id: data.id, name: data.full_name, role: data.role })
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) throw new Error(error.message)
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setRegistrar(null)
  }, [])

  const value = useMemo(
    () => ({ session, registrar, loading, signIn, signOut }),
    [session, registrar, loading, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
