import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { LoadingBlock } from './states'

/**
 * Gate for the signed-in routes. RLS is what actually protects the data; this
 * only keeps the UI from flashing empty tables at a signed-out visitor.
 */
export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <LoadingBlock label="Checking your session…" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
