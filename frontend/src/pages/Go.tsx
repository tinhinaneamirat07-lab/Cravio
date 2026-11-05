import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PlaceCategory } from '@/api/types'
import { PlaceCard, PlaceCardSkeleton } from '@/components/places/PlaceCard'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Container } from '@/components/ui/Container'
import { CloudSun, Crosshair, Warning } from '@/components/ui/icons'
import { CATEGORIES, CATEGORY_ICON } from '@/features/places/categories'
import { CITIES, useWhere } from '@/features/places/location'
import { useNearby, useWeather } from '@/features/places/queries'
import { useLang } from '@/hooks/useLocalized'
import { cn } from '@/lib/cn'

const STEP = 24

/** "Sortir": the same layout as the recipes, a grid of photo cards with filters on top. */
export default function Go() {
  const { t } = useTranslation()
  const lang = useLang()
  const { where, chooseCity, locate, locating, denied } = useWhere()
  const [category, setCategory] = useState<PlaceCategory | undefined>()
  const [shown, setShown] = useState(STEP)
  const nearby = useNearby(where.center, category)
  const weather = useWeather(where.center)
  const places = nearby.data?.places ?? []

  const city = CITIES.find((c) => c.id === where.city)
  const placeLabel = city ? (lang === 'ar' ? city.ar : city.name) : t('go.myPosition')
  const pick = (c: PlaceCategory | undefined) => {
    setCategory(c)
    setShown(STEP)
  }

  return (
    <Container className="py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold md:text-4xl">{t('go.title')}</h1>
          <p className="mt-2 text-ink-muted">{t('go.subtitle')}</p>
        </div>
        {weather.data && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-apricot-soft px-3.5 py-2 text-sm font-medium text-apricot-ink">
            <CloudSun size={18} />
            <bdi>{weather.data.temperature}°</bdi> {t(`go.weather.${weather.data.condition}`)}
          </span>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button variant={where.city ? 'secondary' : 'soft'} size="sm" onClick={locate} disabled={locating}>
          <Crosshair size={18} />
          {locating ? t('go.locating') : t('go.near')}
        </Button>
        <label className="relative">
          <span className="sr-only">{t('go.city')}</span>
          <select
            value={where.city ?? ''}
            onChange={(e) => {
              chooseCity(e.target.value)
              setShown(STEP)
            }}
            className="h-10 appearance-none rounded-full border border-line-strong bg-surface ps-4 pe-9 text-sm font-medium"
          >
            {!where.city && <option value="">{t('go.myPosition')}</option>}
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {lang === 'ar' ? c.ar : c.name}
              </option>
            ))}
          </select>
          <span aria-hidden="true" className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-xs">
            ▾
          </span>
        </label>
        {denied && <p className="text-sm text-danger">{t('go.denied')}</p>}
      </div>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        <Chip active={!category} onClick={() => pick(undefined)}>
          {t('go.all')}
        </Chip>
        {CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICON[c]
          return (
            <Chip key={c} active={category === c} onClick={() => pick(c)}>
              <Icon size={18} />
              {t(`go.cat.${c}`)}
            </Chip>
          )
        })}
      </div>

      <div className="mt-8" aria-live="polite" aria-busy={nearby.isFetching}>
        {nearby.isPending ? (
          <>
            <p className="text-sm text-ink-muted">
              {t('go.loading')} {t('go.firstTime')}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
              {Array.from({ length: 8 }, (_, i) => (
                <PlaceCardSkeleton key={i} />
              ))}
            </div>
          </>
        ) : nearby.isError ? (
          <div className="flex max-w-xl flex-col items-start gap-3 rounded-2xl bg-apricot-soft p-5 text-apricot-ink">
            <p className="flex gap-2">
              <Warning size={20} className="shrink-0" />
              {t('go.unavailable')}
            </p>
            <Button size="sm" variant="secondary" onClick={() => nearby.refetch()}>
              {t('go.retry')}
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-ink-muted">
              {t('go.results', { count: nearby.data.total, place: placeLabel })}
            </p>
            {nearby.data.stale && <p className="mt-1 text-sm text-apricot-ink">{t('go.stale')}</p>}
            {places.length === 0 ? (
              <p className="mt-4 max-w-xl rounded-2xl bg-surface-sunken p-5 text-ink-muted">{t('go.empty')}</p>
            ) : (
              <ul
                className={cn(
                  'mt-4 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6',
                  nearby.isFetching && 'opacity-60',
                )}
              >
                {places.slice(0, shown).map((p) => (
                  <li key={p.id}>
                    <PlaceCard place={p} />
                  </li>
                ))}
              </ul>
            )}
            {places.length > shown && (
              <div className="mt-10 flex justify-center">
                <Button variant="secondary" onClick={() => setShown((n) => n + STEP)}>
                  {t('go.more')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Container>
  )
}
