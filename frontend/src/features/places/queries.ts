import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, hasSession } from '@/api/client'
import type { NearbyPage, Place, PlaceCategory, PlaceDetail, PlaceInfo, PlaceReviews, Weather } from '@/api/types'
import type { Center } from './location'

export const placeKeys = {
  nearby: (c: Center, category?: PlaceCategory) => ['places', 'nearby', c.lat, c.lon, category ?? 'all'] as const,
  detail: (id: string) => ['places', 'detail', id] as const,
  reviews: (id: string) => ['places', 'reviews', id] as const,
  info: (id: string) => ['places', 'info', id] as const,
  mine: ['places', 'mine'] as const,
}

export function useNearby(center: Center, category?: PlaceCategory) {
  const params = new URLSearchParams({ lat: String(center.lat), lon: String(center.lon), radius: '5000', limit: '120' })
  if (category) params.set('category', category)
  return useQuery({
    queryKey: placeKeys.nearby(center, category),
    queryFn: () => api<NearbyPage>(`/places/nearby?${params}`),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60_000,
    retry: false, // a 503 means OpenStreetMap is busy: the page offers "Réessayer"
  })
}

export function usePlace(id: string) {
  return useQuery({ queryKey: placeKeys.detail(id), queryFn: () => api<PlaceDetail>(`/places/${id}`), retry: false })
}

/** Asks Wikimedia once if the place has no photo yet; the answer is saved by the API. */
export function usePlacePhoto(place: Place | undefined) {
  return useQuery({
    queryKey: ['places', 'photo', place?.id],
    queryFn: () => api<{ photo: Place['photo'] }>(`/places/${place!.id}/photo`).then((r) => r.photo),
    enabled: Boolean(place && !place.photo),
    staleTime: Infinity,
  })
}

export function usePlaceInfo(id: string) {
  return useQuery({ queryKey: placeKeys.info(id), queryFn: () => api<PlaceInfo>(`/places/${id}/info`) })
}

export function usePlaceReviews(id: string) {
  return useQuery({ queryKey: placeKeys.reviews(id), queryFn: () => api<PlaceReviews>(`/places/${id}/reviews`) })
}

export function useReviewMutations(id: string) {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: placeKeys.reviews(id) })
    qc.invalidateQueries({ queryKey: placeKeys.detail(id) })
  }
  const save = useMutation({
    mutationFn: (body: { rating: number; comment: string }) => api(`/places/${id}/reviews`, { method: 'POST', body }),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: () => api(`/places/${id}/reviews/mine`, { method: 'DELETE' }),
    onSuccess: refresh,
  })
  return { save, remove }
}

export function usePlaceFavorite(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (on: boolean) => api(`/places/${id}/favorite`, { method: on ? 'PUT' : 'DELETE' }),
    onMutate: (on) => {
      qc.setQueryData<PlaceDetail>(placeKeys.detail(id), (old) => (old ? { ...old, is_favorite: on } : old))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: placeKeys.detail(id) })
      qc.invalidateQueries({ queryKey: placeKeys.mine })
    },
  })
}

export function useMyPlaces() {
  return useQuery({ queryKey: placeKeys.mine, queryFn: () => api<Place[]>('/me/places'), enabled: hasSession() })
}

export function useWeather(center: Center) {
  return useQuery({
    queryKey: ['weather', center.lat.toFixed(2), center.lon.toFixed(2)],
    queryFn: () => api<Weather>(`/weather?lat=${center.lat}&lon=${center.lon}`),
    staleTime: 15 * 60_000,
    retry: false, // the weather is a nice-to-have
  })
}
