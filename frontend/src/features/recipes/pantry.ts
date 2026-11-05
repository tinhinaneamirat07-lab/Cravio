import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { Lang, PantryMatch } from '@/api/types'

export function usePantryMatch(ingredients: string[], lang: Lang) {
  const key = ingredients.join(',')
  return useQuery({
    queryKey: ['recipes', 'match', key, lang],
    queryFn: () => api<PantryMatch[]>(`/recipes/match?${new URLSearchParams({ ingredients: key, lang })}`),
    enabled: ingredients.length > 0,
    placeholderData: keepPreviousData,
  })
}
