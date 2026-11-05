import { useCallback, useState } from 'react'

export type Center = { lat: number; lon: number }
export type Where = { center: Center; city: string | null } // city null = the browser position

/** Big Algerian cities, so the app works without sharing a position. */
export const CITIES: { id: string; name: string; ar: string; center: Center }[] = [
  { id: 'alger', name: 'Alger', ar: 'الجزائر', center: { lat: 36.7538, lon: 3.0588 } },
  { id: 'oran', name: 'Oran', ar: 'وهران', center: { lat: 35.6971, lon: -0.6308 } },
  { id: 'constantine', name: 'Constantine', ar: 'قسنطينة', center: { lat: 36.365, lon: 6.6147 } },
  { id: 'annaba', name: 'Annaba', ar: 'عنابة', center: { lat: 36.9, lon: 7.7667 } },
  { id: 'blida', name: 'Blida', ar: 'البليدة', center: { lat: 36.4703, lon: 2.8277 } },
  { id: 'boumerdes', name: 'Boumerdès', ar: 'بومرداس', center: { lat: 36.7664, lon: 3.4772 } },
  { id: 'bejaia', name: 'Béjaïa', ar: 'بجاية', center: { lat: 36.7509, lon: 5.0567 } },
  { id: 'tizi-ouzou', name: 'Tizi Ouzou', ar: 'تيزي وزو', center: { lat: 36.7118, lon: 4.0459 } },
  { id: 'setif', name: 'Sétif', ar: 'سطيف', center: { lat: 36.19, lon: 5.41 } },
  { id: 'tlemcen', name: 'Tlemcen', ar: 'تلمسان', center: { lat: 34.8783, lon: -1.315 } },
  { id: 'batna', name: 'Batna', ar: 'باتنة', center: { lat: 35.5559, lon: 6.1741 } },
  { id: 'ghardaia', name: 'Ghardaïa', ar: 'غرداية', center: { lat: 32.4909, lon: 3.6735 } },
]

const KEY = 'cravio-city'

function savedCity(): string {
  try {
    return localStorage.getItem(KEY) ?? 'alger'
  } catch {
    return 'alger'
  }
}

function cityWhere(id: string): Where {
  const city = CITIES.find((c) => c.id === id) ?? CITIES[0]
  return { center: city.center, city: city.id }
}

/**
 * Where to search. Only the chosen CITY is remembered on this device; the browser position is
 * asked only when the person taps "Près de moi", rounded to about 100 m, and never saved.
 */
export function useWhere() {
  const [where, setWhere] = useState<Where>(() => cityWhere(savedCity()))
  const [locating, setLocating] = useState(false)
  const [denied, setDenied] = useState(false)

  const chooseCity = useCallback((id: string) => {
    try {
      localStorage.setItem(KEY, id)
    } catch {
      /* private mode: fine */
    }
    setDenied(false)
    setWhere(cityWhere(id))
  }, [])

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setDenied(true)
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const round = (n: number) => Math.round(n * 1000) / 1000
        setWhere({ center: { lat: round(pos.coords.latitude), lon: round(pos.coords.longitude) }, city: null })
        setDenied(false)
        setLocating(false)
      },
      () => {
        setDenied(true)
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    )
  }, [])

  return { where, chooseCity, locate, locating, denied }
}

export function formatDistance(m: number | null, lang: string) {
  if (m == null) return ''
  const nf = new Intl.NumberFormat(lang, { maximumFractionDigits: m < 10_000 ? 1 : 0 })
  return m < 1000 ? `${new Intl.NumberFormat(lang).format(Math.round(m / 10) * 10)} m` : `${nf.format(m / 1000)} km`
}
