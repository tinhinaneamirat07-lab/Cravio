import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { Page, RecipeDetail, RecipeFilters, RecipeSummary } from '@/api/types'

const PAGE_SIZE = 12

function toQuery(filters: RecipeFilters, page: number, pageSize = PAGE_SIZE) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return params.toString()
}

export const recipeKeys = {
  all: ['recipes'] as const,
  list: (filters: RecipeFilters) => ['recipes', 'list', filters] as const,
  detail: (slug: string) => ['recipes', 'detail', slug] as const,
  favorites: ['recipes', 'favorites'] as const,
}

export function useRecipeSearch(filters: RecipeFilters) {
  return useInfiniteQuery({
    queryKey: recipeKeys.list(filters),
    queryFn: ({ pageParam }) => api<Page<RecipeSummary>>(`/recipes?${toQuery(filters, pageParam)}`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.page_size < last.total ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  })
}

export function useFeaturedRecipes(count = 12) {
  return useQuery({
    queryKey: ['recipes', 'featured', count],
    queryFn: () => api<Page<RecipeSummary>>(`/recipes?${toQuery({}, 1, count)}`),
    staleTime: 5 * 60_000,
    retry: false,
  })
}

export function useRecipe(slug: string) {
  return useQuery({
    queryKey: recipeKeys.detail(slug),
    queryFn: () => api<RecipeDetail>(`/recipes/${encodeURIComponent(slug)}`),
    enabled: Boolean(slug),
  })
}

export function useFavorites(enabled: boolean) {
  return useQuery({
    queryKey: recipeKeys.favorites,
    queryFn: () => api<RecipeSummary[]>('/me/favorites'),
    enabled,
  })
}

/** Other recipes of the same kind, for "You might also like". */
export function useSimilarRecipes(recipe: Pick<RecipeSummary, 'slug' | 'category'> | undefined) {
  return useQuery({
    queryKey: ['recipes', 'similar', recipe?.slug],
    queryFn: () => api<Page<RecipeSummary>>(`/recipes?${toQuery({ category: recipe!.category }, 1, 5)}`),
    select: (page) => page.items.filter((r) => r.slug !== recipe!.slug).slice(0, 4),
    enabled: Boolean(recipe),
    staleTime: 5 * 60_000,
  })
}

export function useToggleFavorite(slug: string, summary?: RecipeSummary) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (favorite: boolean) =>
      api<void>(`/recipes/${encodeURIComponent(slug)}/favorite`, { method: favorite ? 'PUT' : 'DELETE' }),
    // Update the heart immediately, roll back if the request fails.
    onMutate: async (favorite) => {
      await qc.cancelQueries({ queryKey: recipeKeys.detail(slug) })
      await qc.cancelQueries({ queryKey: recipeKeys.favorites })
      const previous = qc.getQueryData<RecipeDetail>(recipeKeys.detail(slug))
      const previousList = qc.getQueryData<RecipeSummary[]>(recipeKeys.favorites)
      if (previous) qc.setQueryData(recipeKeys.detail(slug), { ...previous, is_favorite: favorite })
      if (previousList) {
        const without = previousList.filter((r) => r.slug !== slug)
        qc.setQueryData(recipeKeys.favorites, favorite && summary ? [summary, ...without] : without)
      }
      return { previous, previousList }
    },
    onError: (_err, _favorite, context) => {
      if (context?.previous) qc.setQueryData(recipeKeys.detail(slug), context.previous)
      if (context?.previousList) qc.setQueryData(recipeKeys.favorites, context.previousList)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: recipeKeys.favorites }),
  })
}
