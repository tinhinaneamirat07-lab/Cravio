const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  detail: unknown

  constructor(status: number, detail: unknown) {
    super(typeof detail === 'string' ? detail : `Request failed with status ${status}`)
    this.status = status
    this.detail = detail
  }
}

type Options = Omit<RequestInit, 'body'> & { body?: unknown; retryOnUnauthorized?: boolean }

let refreshing: Promise<boolean> | null = null

/** Set by the API next to the httpOnly session cookies. It carries no secret, only "a session exists". */
export function hasSession(): boolean {
  return typeof document !== 'undefined' && document.cookie.split('; ').some((c) => c.startsWith('cravio_logged_in='))
}

// One refresh at a time, shared by every request that hit a 401 at the same moment.
function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(`${BASE_URL}/api/v1/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

export async function api<T>(path: string, { body, retryOnUnauthorized = true, headers, ...init }: Options = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401 && retryOnUnauthorized && !path.startsWith('/auth/') && hasSession()) {
    if (await refreshSession()) return api<T>(path, { body, headers, ...init, retryOnUnauthorized: false })
  }

  if (!res.ok) {
    let detail: unknown = res.statusText
    try {
      detail = (await res.json()).detail ?? detail
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, detail)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export { refreshSession }
