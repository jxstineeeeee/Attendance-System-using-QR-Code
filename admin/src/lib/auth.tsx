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
 * Sign-in state for the admin console. The session is a PHP cookie the browser
 * holds and the API validates on every request; this only mirrors who it
 * belongs to, so the UI can gate routes and name the person in the sidebar.
 *
 * Every call names `admin` as the app it is for. Only an `admin` account may
 * sign in here — a registrar or scanner password is refused with a message
 * saying so, rather than letting them in to a console they cannot use.
 */
interface AuthValue {
  user: AuthUser | null
  /** True until the stored session has been checked on first paint. */
  loading: boolean
  /**
   * Set when the cookie belongs to one of the other two apps. One session
   * cookie is shared across all three on localhost, because a browser ignores
   * the port — so the sign-in screen explains it instead of looking broken.
   */
  otherRole: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

interface SessionResponse {
  user: AuthUser | null
  otherRole?: string
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [otherRole, setOtherRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    api
      .get<SessionResponse>('/auth/session?app=admin')
      .then((res) => {
        if (cancelled) return
        setUser(res.user)
        setOtherRole(res.otherRole ?? null)
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
      app: 'admin',
    })
    setUser(res.user)
    setOtherRole(null)
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      // Whatever the server said, this browser is done with the session.
      setUser(null)
      setOtherRole(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, otherRole, signIn, signOut }),
    [user, loading, otherRole, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
