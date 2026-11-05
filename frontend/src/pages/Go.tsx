import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PlaceCategory } from '@/api/types'
import { PlaceCard } from '@/components/places/PlaceCard'
import { PlaceMap } from '@/components/places/PlaceMap'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { CloudSun, Crosshair, Warning } from '@/components/ui/icons'
import { CATEGORIES, CATEGORY_ICON } from '@/features/places/categories'
import { CITIES, useWhere } from '@/features/places/location'
import { useNearby, useWeather } from '@/features/places/queries'
import { useLang } from '@/hooks/useLocalized'
import { cn } from '@/lib/cn'

/** "Sortir": the map and the list side by side on a computer, the map above the list on a phone. */
export default function Go() {
  const { t } = useTranslation()
  const lang = useLang()
  const { where, chooseCity, locate, locating, denied } = useWhere()
  const [category, setCategory] = useState<PlaceCategory | undefined>()
  const [selected, setSelected] = useState<string | null>(null)
  const nearby = useNearby(where.center, category)
  const weather = useWeather(where.center)
  const places = nearby.data?.places ?? []

  const city = CITIES.find((c) => c.id === where.city)
  const placeLabel = city ? (lang === 'ar' ? city.ar : city.name) : t('go.myPosition')

  // A pin tapped on the map scrolls its row into view.
  useEffect(() => {
    if (selected) document.getElementById(`place-${selected}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selected])

  return (
    <div className="mx-auto grid max-w-[1400px] gap-4 px-4 pt-5 pb-8 md:px-6 lg:h-[calc(100dvh-72px)] lg:grid-cols-[26rem_1fr] lg:grid-rows-[auto_1fr] lg:gap-x-6 lg:pb-6">
        <header className="flex flex-col gap-3 lg:col-start-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold md:text-4xl">{t('go.title')}</h1>
              <p className="mt-1 text-ink-muted">{t('go.subtitle')}</p>
            </div>
            {weather.data && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-apricot-soft px-3 py-1.5 text-sm font-medium text-apricot-ink">
                <CloudSun size={18} />
                <bdi>{weather.data.temperature}°</bdi> {t(`go.weather.${weather.data.condition}`)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant={where.city ? 'secondary' : 'soft'} size="sm" onClick={locate} disabled={locating}>
              <Crosshair size={18} />
              {locating ? t('go.locating') : t('go.near')}
            </Button>
            <label className="relative">
              <span className="sr-only">{t('go.city')}</span>
              <select
                value={where.city ?? ''}
                onChange={(e) => chooseCity(e.target.value)}
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
          </div>
          {denied && <p className="text-sm text-danger">{t('go.denied')}</p>}

          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
            <Chip active={!category} onClick={() => setCategory(undefined)} className="h-10 text-sm">
              {t('go.all')}
            </Chip>
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICON[c]
              return (
                <Chip key={c} active={category === c} onClick={() => setCategory(c)} className="h-10 text-sm">
                  <Icon size={16} />
                  {t(`go.cat.${c}`)}
                </Chip>
              )
            })}
          </div>
        </header>

        <div className="h-[46vh] overflow-hidden rounded-[28px] border border-line lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-auto">
          <PlaceMap
            center={where.center}
            places={places}
            selected={selected}
            onSelect={setSelected}
            label={t('go.map')}
            showMe={!where.city}
          />
        </div>

        <div className="min-h-0 lg:col-start-1 lg:row-start-2 lg:overflow-y-auto lg:pe-1" aria-live="polite" aria-busy={nearby.isFetching}>
          {nearby.isPending ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-ink-muted">{t('go.loading')}</p>
              <p className="text-sm text-ink-muted">{t('go.firstTime')}</p>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[100px] animate-pulse rounded-2xl bg-surface-sunken" />
              ))}
            </div>
          ) : nearby.isError ? (
            <div className="flex flex-col items-start gap-3 rounded-2xl bg-apricot-soft p-4 text-apricot-ink">
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
              <p className="mb-2 text-sm font-medium text-ink-muted">
                {t('go.results', { count: nearby.data.total, place: placeLabel })}
              </p>
              {nearby.data.stale && <p className="mb-2 text-sm text-apricot-ink">{t('go.stale')}</p>}
              {places.length === 0 ? (
                <p className="rounded-2xl bg-surface-sunken p-4 text-ink-muted">{t('go.empty')}</p>
              ) : (
                <ul className={cn('flex flex-col gap-1', nearby.isFetching && 'opacity-60')}>
                  {places.map((p) => (
                    <li key={p.id}>
                      <PlaceCard place={p} selected={p.id === selected} onSelect={() => setSelected(p.id)} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
    </div>
  )
}
