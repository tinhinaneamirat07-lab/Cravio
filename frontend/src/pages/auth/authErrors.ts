import { ApiError } from '@/api/client'

export function authErrorKey(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'auth.errors.invalid'
    if (error.status === 409) return 'auth.errors.exists'
    if (error.status === 429) return 'auth.errors.tooMany'
  }
  return 'auth.errors.network'
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Only follow redirects to paths inside the app (never to another site). */
export function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/explore'
}
