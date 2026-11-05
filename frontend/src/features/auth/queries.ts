import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, api, hasSession, refreshSession } from '@/api/client'
import type { Lang, User } from '@/api/types'

export const meKey = ['auth', 'me'] as const

async function fetchMe(): Promise<User | null> {
  // Visitors who never logged in: no request at all, so no 401 noise in the console.
  if (!hasSession()) return null
  try {
    return await api<User>('/auth/me')
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // The 15-minute access token may simply have expired: try the refresh token once.
      if (await refreshSession()) {
        try {
          return await api<User>('/auth/me')
        } catch {
          return null
        }
      }
      return null
    }
    throw error
  }
}

export function useMe() {
  return useQuery({ queryKey: meKey, queryFn: fetchMe, staleTime: 5 * 60_000, retry: false })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => api<User>('/auth/login', { method: 'POST', body }),
    onSuccess: (user) => {
      qc.setQueryData(meKey, user)
      qc.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

export function useRegister() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; email: string; password: string; locale: Lang }) =>
      api<User>('/auth/register', { method: 'POST', body }),
    onSuccess: (user) => qc.setQueryData(meKey, user),
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      qc.setQueryData(meKey, null)
      qc.removeQueries({ queryKey: ['recipes', 'favorites'] })
      qc.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}
