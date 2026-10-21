/**
 * Thin fetch wrapper around the PHP API in `api/`.
 *
 * Auth is a PHP session cookie, so every request sends credentials. In dev the
 * Vite server proxies /api to Apache (see vite.config.ts), which keeps the
 * browser on one origin and the cookie working without CORS.
 */

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
): Promise<T> {
  let res: Response
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    // fetch only rejects when the request never got an answer.
    throw new ApiError(
      `Cannot reach the API at ${BASE}. Is Apache running in Laragon?`,
      0,
    )
  }

  const text = await res.text()

  /*
   * With the Vite dev proxy in front, a dead Apache never reaches the catch
   * above: the proxy itself answers 500 with an empty text/plain body. Treat a
   * bodyless gateway failure as what it is, so the screen says to start
   * Laragon instead of "Request failed (HTTP 500)".
   */
  if (text.trim() === '' && res.status >= 500) {
    throw new ApiError(
      `Cannot reach the API at ${BASE}. Is Apache running in Laragon?`,
      res.status,
    )
  }

  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      // A PHP fatal or an Apache error page, which is not ours to parse.
      throw new ApiError(`The API returned a non-JSON response (HTTP ${res.status}).`, res.status)
    }
  }

  if (!res.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Request failed (HTTP ${res.status}).`
    throw new ApiError(message, res.status)
  }

  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}

/** Builds a query string, leaving out the filters that were left empty. */
export function queryString(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}
