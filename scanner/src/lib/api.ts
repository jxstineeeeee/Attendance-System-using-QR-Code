/**
 * Thin fetch wrapper around the PHP API in `api/`, same contract as the
 * registrar's: a session cookie, and errors as { "error": "…" }.
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

async function request<T>(
  method: 'GET' | 'POST',
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
      throw new ApiError(
        `The API returned a non-JSON response (HTTP ${res.status}).`,
        res.status,
      )
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
}
