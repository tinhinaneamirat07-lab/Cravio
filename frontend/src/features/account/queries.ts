import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { Lang, User } from '@/api/types'
import { meKey } from '@/features/auth/queries'

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name?: string; locale?: Lang }) => api<User>('/users/me', { method: 'PATCH', body }),
    onSuccess: (user) => qc.setQueryData(meKey, user),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { current_password: string; new_password: string }) =>
      api<void>('/users/me/password', { method: 'PUT', body }),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<void>('/users/me', { method: 'DELETE' }),
    onSuccess: () => {
      qc.clear()
      qc.setQueryData(meKey, null)
    },
  })
}
