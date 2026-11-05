import { useTranslation } from 'react-i18next'
import { CategoryIcon } from '@/components/places/CategoryIcon'
import { Link } from 'react-router-dom'
import type { Place } from '@/api/types'
import { isFood } from '@/features/places/categories'
import { formatDistance } from '@/features/places/location'
import { useLang } from '@/hooks/useLocalized'
import { cn } from '@/lib/cn'

/** One row of the list next to the map. Hovering or focusing it highlights its pin. */
export function PlaceCard({ place, selected, onSelect }: { place: Place; selected: boolean; onSelect: () => void }) {
  const { t } = useTranslation()
  const lang = useLang()
  const food = isFood(place.category)
  return (
    <Link
      id={`place-${place.id}`}
      to={`/go/${place.id}`}
      onMouseEnter={onSelect}
      onFocus={onSelect}
      className={cn(
        'flex items-center gap-3 rounded-2xl border p-2.5 transition-colors',
        selected ? 'border-line-strong bg-surface-raised shadow-sm' : 'border-transparent hover:bg-surface',
      )}
    >
      <span
        className={cn(
          'fig-go grid size-20 shrink-0 place-items-center overflow-hidden',
          food ? 'bg-primary-soft text-link' : 'bg-moss-soft text-moss-ink',
        )}
      >
        {place.photo ? (
          <img src={place.photo.thumb_url} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <CategoryIcon category={place.category} size={28} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 font-semibold">
          <bdi>{place.name}</bdi>
        </span>
        <span className="mt-0.5 block text-sm text-ink-muted">
          {t(`go.one.${place.category}`, { defaultValue: place.category })}
          {place.distance_m != null && <> · <bdi>{formatDistance(place.distance_m, lang)}</bdi></>}
        </span>
        {place.address && <span className="line-clamp-1 block text-sm text-ink-muted">{place.address}</span>}
      </span>
    </Link>
  )
}
