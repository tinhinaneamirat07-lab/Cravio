import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { Place } from '@/api/types'
import { CategoryIcon } from '@/components/places/CategoryIcon'
import { isFood } from '@/features/places/categories'
import { formatDistance } from '@/features/places/location'
import { useLang } from '@/hooks/useLocalized'
import { cn } from '@/lib/cn'

/** A place in the grid, built like a recipe card so both halves of the app look like one. */
export function PlaceCard({ place }: { place: Place }) {
  const { t } = useTranslation()
  const lang = useLang()
  const food = isFood(place.category)
  return (
    <Link to={`/go/${place.id}`} className="group block">
      <div
        className={cn(
          'fig-go lift relative grid aspect-[4/5] place-items-center overflow-hidden',
          food ? 'bg-primary-soft text-link' : 'bg-moss-soft text-moss-ink',
        )}
      >
        {place.photo ? (
          <img
            src={place.photo.thumb_url}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <CategoryIcon category={place.category} size={44} />
        )}
        <span
          className={cn(
            'absolute start-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold',
            food ? 'bg-primary-soft text-link' : 'bg-moss-soft text-moss-ink',
          )}
        >
          <CategoryIcon category={place.category} size={14} />
          {t(`go.one.${place.category}`, { defaultValue: place.category })}
        </span>
      </div>
      <h3 className="mt-3 line-clamp-2 text-lg leading-snug font-semibold group-hover:text-link">
        <bdi>{place.name}</bdi>
      </h3>
      <p className="mt-1 line-clamp-1 text-sm text-ink-muted">
        {place.distance_m != null && <bdi>{formatDistance(place.distance_m, lang)}</bdi>}
        {place.distance_m != null && place.address && ' · '}
        {place.address}
      </p>
    </Link>
  )
}

export function PlaceCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="fig-go aspect-[4/5] w-full animate-pulse bg-surface-sunken" />
      <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-surface-sunken" />
      <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-surface-sunken" />
    </div>
  )
}
