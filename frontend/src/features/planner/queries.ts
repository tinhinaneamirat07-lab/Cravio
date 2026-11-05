import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { PlanItem, ShoppingItem, Slot } from '@/api/types'

const planKey = (start: string) => ['planner', start] as const
const shoppingKey = ['shopping'] as const

export function usePlan(start: string, enabled = true) {
  return useQuery({
    queryKey: planKey(start),
    queryFn: () => api<PlanItem[]>(`/planner?start=${start}&days=7`),
    enabled,
  })
}

export function useAddToPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { day: string; slot: Slot; recipe_slug: string; servings?: number }) =>
      api<PlanItem>('/planner', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planner'] }),
  })
}

export function useUpdatePlanItem(start: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; servings?: number; day?: string; slot?: Slot }) =>
      api<PlanItem>(`/planner/${id}`, { method: 'PATCH', body }),
    onMutate: async ({ id, ...changes }) => {
      await qc.cancelQueries({ queryKey: planKey(start) })
      const previous = qc.getQueryData<PlanItem[]>(planKey(start))
      qc.setQueryData<PlanItem[]>(planKey(start), (items) => items?.map((i) => (i.id === id ? { ...i, ...changes } : i)))
      return { previous }
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(planKey(start), ctx.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: ['planner'] }),
  })
}

export function useRemovePlanItem(start: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/planner/${id}`, { method: 'DELETE' }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: planKey(start) })
      const previous = qc.getQueryData<PlanItem[]>(planKey(start))
      qc.setQueryData<PlanItem[]>(planKey(start), (items) => items?.filter((i) => i.id !== id))
      return { previous }
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(planKey(start), ctx.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: ['planner'] }),
  })
}

export function useShoppingList(enabled = true) {
  return useQuery({ queryKey: shoppingKey, queryFn: () => api<ShoppingItem[]>('/shopping-list'), enabled })
}

export function useGenerateList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (start: string) =>
      api<ShoppingItem[]>('/shopping-list/generate', { method: 'POST', body: { start, days: 7 } }),
    onSuccess: (items) => qc.setQueryData(shoppingKey, items),
  })
}

export function useAddShoppingItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api<ShoppingItem>('/shopping-list', { method: 'POST', body: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: shoppingKey }),
  })
}

export function useToggleShoppingItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, checked }: { id: number; checked: boolean }) =>
      api<ShoppingItem>(`/shopping-list/${id}`, { method: 'PATCH', body: { checked } }),
    // Ticking must feel instant in the supermarket, even on a slow connection.
    onMutate: async ({ id, checked }) => {
      await qc.cancelQueries({ queryKey: shoppingKey })
      const previous = qc.getQueryData<ShoppingItem[]>(shoppingKey)
      qc.setQueryData<ShoppingItem[]>(shoppingKey, (items) => items?.map((i) => (i.id === id ? { ...i, checked } : i)))
      return { previous }
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(shoppingKey, ctx.previous),
  })
}

export function useDeleteShoppingItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/shopping-list/${id}`, { method: 'DELETE' }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: shoppingKey })
      const previous = qc.getQueryData<ShoppingItem[]>(shoppingKey)
      qc.setQueryData<ShoppingItem[]>(shoppingKey, (items) => items?.filter((i) => i.id !== id))
      return { previous }
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(shoppingKey, ctx.previous),
  })
}

export function useClearChecked() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<void>('/shopping-list?checked_only=true', { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: shoppingKey }),
  })
}
