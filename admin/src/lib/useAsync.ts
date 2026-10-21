import { useCallback, useEffect, useState } from 'react'
import { ApiError } from './api'

/**
 * One load of one thing, with the three states every screen here needs.
 *
 * `reload` refetches without clearing what is on screen, so saving a row does
 * not blank the table behind the dialog. A load that has been superseded is
 * dropped rather than applied late.
 */
export interface Async<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

export function useAsync<T>(
  load: () => Promise<T>,
  deps: unknown[] = [],
): Async<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  // The caller passes a fresh closure every render; the dependency list is
  // what actually decides when to refetch.
  const run = useCallback(load, deps)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    run()
      .then((result) => {
        if (cancelled) return
        setData(result)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof ApiError ? err.message : 'Something went wrong.',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [run, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return { data, loading, error, reload }
}

/** The message to show for a failed write, in the shape the API sends. */
export const errorMessage = (err: unknown) =>
  err instanceof ApiError ? err.message : 'Something went wrong.'
