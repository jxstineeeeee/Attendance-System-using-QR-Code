import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from './api'
import type { AuthUser } from './types'

/**
 * Sign-in state. The session itself is a PHP cookie the browser holds and the
 * API validates on every request; this only mirrors who it belongs to so the
 * UI can gate routes and name the person in the sidebar.
 */
interface AuthValue {
  user: AuthUser | null
  /** True until the stored session has been checked on first paint. */
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    api
      .get<{ user: AuthUser | null }>('/auth/session')
      .then(({ user }) => {
        if (!cancelled) setUser(user)
      })
      .catch(() => {
        // An unreachable API is the same as being signed out: the login screen
        // is where the error belongs, and it reports it on submit.
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ user: AuthUser }>('/auth/login', {
      email: email.trim(),
      password,
    })
    setUser(res.user)
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      // Whatever the server said, this browser is done with the session.
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, signIn, signOut }),
    [user, loading, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
