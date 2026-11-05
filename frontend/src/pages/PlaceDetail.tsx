import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { CategoryIcon } from '@/components/places/CategoryIcon'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { ArrowLeft, Globe, Heart, NavigationArrow, Phone, Star } from '@/components/ui/icons'
import { useMe } from '@/features/auth/queries'
import { isFood } from '@/features/places/categories'
import {
  usePlace,
  usePlaceFavorite,
  usePlaceInfo,
  usePlacePhoto,
  usePlaceReviews,
  useReviewMutations,
} from '@/features/places/queries'
import { useLang } from '@/hooks/useLocalized'
import { cn } from '@/lib/cn'

export default function PlaceDetail() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const place = usePlace(id)
  const photoQuery = usePlacePhoto(place.data)
  const info = usePlaceInfo(id)
  const me = useMe()
  const favorite = usePlaceFavorite(id)

  if (place.isPending) {
    return (
      <Container className="py-8">
        <div className="h-72 animate-pulse rounded-[28px] bg-surface-sunken" />
        <div className="mt-6 h-8 w-2/3 animate-pulse rounded bg-surface-sunken" />
      </Container>
    )
  }
  if (place.isError) {
    return (
      <Container className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-xl font-semibold">{t('go.notFound')}</p>
        <ButtonLink to="/go" variant="secondary">
          {t('go.back')}
        </ButtonLink>
      </Container>
    )
  }

  const p = place.data
  const photo = p.photo ?? photoQuery.data ?? null
  const food = isFood(p.category)
  const tags = p.tags
  const details = info.data?.info
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`
  const website = tags.website ?? tags['contact:website']
  const phone = tags.phone ?? tags['contact:phone']

  return (
    <article className="pb-28 md:pb-12">
      <div className="relative">
        <div
          className={cn(
            'grid h-64 place-items-center overflow-hidden rounded-es-[140px] md:mx-auto md:mt-6 md:h-96 md:max-w-5xl md:rounded-[28px] md:rounded-es-[160px]',
            food ? 'bg-primary-soft text-link' : 'bg-moss-soft text-moss-ink',
          )}
        >
          {photo ? <img src={photo.thumb_url} alt={p.name} className="size-full object-cover" /> : <CategoryIcon category={p.category} size={64} />}
        </div>
        <Link
          to="/go"
          aria-label={t('go.back')}
          className="absolute start-4 top-4 grid size-11 place-items-center rounded-full bg-surface shadow-md md:start-[max(1rem,calc(50%-31rem))] md:top-10"
        >
          <ArrowLeft size={20} className="rtl:-scale-x-100" />
        </Link>
        {me.data ? (
          <button
            type="button"
            aria-pressed={p.is_favorite}
            aria-label={t('nav.favorites')}
            onClick={() => favorite.mutate(!p.is_favorite)}
            className="absolute end-4 top-4 grid size-11 place-items-center rounded-full bg-surface shadow-md md:end-[max(1rem,calc(50%-31rem))] md:top-10"
          >
            <Heart size={20} weight={p.is_favorite ? 'fill' : 'regular'} className={food ? 'text-link' : 'text-moss'} />
          </button>
        ) : null}
      </div>
      {photo?.author && (
        <p className="mx-auto mt-2 max-w-5xl px-4 text-xs text-ink-muted">
          <a href={photo.page_url ?? undefined} target="_blank" rel="noreferrer" className="underline">
            {t('go.photoBy', { author: photo.author, license: photo.license ?? '' })}
          </a>
        </p>
      )}

      <Container className="mt-6 grid max-w-5xl gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <p className={cn('eyebrow', food ? 'text-link' : 'text-moss')}>
            {t(`go.one.${p.category}`, { defaultValue: p.category })}
          </p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">
            <bdi>{p.name}</bdi>
          </h1>
          {p.address && <p className="mt-2 text-ink-muted">{p.address}</p>}

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-surface p-3">
              <dt className="text-sm text-ink-muted">{t('go.reviews')}</dt>
              <dd className="mt-0.5 flex items-center gap-1 font-semibold">
                <Star size={16} weight="fill" className="text-link" />
                {p.rating_average ?? '–'} <span className="font-normal text-ink-muted">· {p.rating_count}</span>
              </dd>
            </div>
            {details?.price_min != null && details.price_max != null && (
              <div className="rounded-2xl border border-line bg-surface p-3">
                <dt className="text-sm text-ink-muted">{t('go.price')}</dt>
                <dd className="mt-0.5 font-semibold">
                  {t('go.priceRange', { min: details.price_min, max: details.price_max })}
                </dd>
              </div>
            )}
            {details?.group_min != null && details.group_max != null && (
              <div className="rounded-2xl border border-line bg-surface p-3">
                <dt className="text-sm text-ink-muted">{t('go.group')}</dt>
                <dd className="mt-0.5 font-semibold">{t('go.people', { min: details.group_min, max: details.group_max })}</dd>
              </div>
            )}
          </dl>

          {tags.opening_hours && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold">{t('go.hours')}</h2>
              <p dir="ltr" className="mt-2 rounded-2xl bg-surface-sunken p-4 font-mono text-sm">
                {tags.opening_hours}
              </p>
            </section>
          )}

          {info.data && info.data.menu.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold">{t('go.info')}</h2>
              <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
                {info.data.menu.map((m) => (
                  <li key={m.id} className="flex justify-between gap-4 px-4 py-3">
                    <span>{m.name}</span>
                    <span className="font-semibold">{m.price} DA</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Reviews id={p.id} loggedIn={Boolean(me.data)} />
        </div>

        <aside className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 flex gap-2 border-t border-line bg-bg/95 p-3 backdrop-blur md:static md:flex-col md:border-0 md:bg-transparent md:p-0">
          <a
            href={directions}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-deep px-5 font-medium text-on-brand dark:bg-brand dark:text-bg md:flex-none"
          >
            <NavigationArrow size={20} className="rtl:-scale-x-100" />
            {t('go.directions')}
          </a>
          {phone && (
            <a
              href={`tel:${phone}`}
              aria-label={t('go.call')}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-moss-soft px-4 font-medium text-moss-ink"
            >
              <Phone size={20} />
              <span className="hidden md:inline">{t('go.call')}</span>
            </a>
          )}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noreferrer"
              aria-label={t('go.website')}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-moss-soft px-4 font-medium text-moss-ink"
            >
              <Globe size={20} />
              <span className="hidden md:inline">{t('go.website')}</span>
            </a>
          )}
        </aside>
      </Container>
    </article>
  )
}

function Reviews({ id, loggedIn }: { id: string; loggedIn: boolean }) {
  const { t } = useTranslation()
  const lang = useLang()
  const reviews = usePlaceReviews(id)
  const { save, remove } = useReviewMutations(id)
  const mine = reviews.data?.reviews.find((r) => r.mine)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const current = rating || mine?.rating || 0

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">
        {t('go.reviews')} {reviews.data ? <span className="text-ink-muted">· {reviews.data.count}</span> : null}
      </h2>

      {loggedIn ? (
        <form
          className="mt-4 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (current) save.mutate({ rating: current, comment: comment || mine?.comment || '' })
          }}
        >
          <fieldset className="flex items-center gap-1">
            <legend className="mb-2 text-sm font-medium">{t('go.rating')}</legend>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n}/5`}
                aria-pressed={current >= n}
                onClick={() => setRating(n)}
                className="grid size-11 place-items-center rounded-full hover:bg-surface-sunken"
              >
                <Star size={26} weight={current >= n ? 'fill' : 'regular'} className="text-link" />
              </button>
            ))}
          </fieldset>
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t('go.comment')}
            <textarea
              rows={2}
              maxLength={1000}
              defaultValue={mine?.comment}
              onChange={(e) => setComment(e.target.value)}
              className="rounded-xl border border-line-strong bg-bg p-3 text-base font-normal"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={!current || save.isPending}>
              {mine ? t('go.update') : t('go.send')}
            </Button>
            {mine && (
              <Button type="button" size="sm" variant="ghost" onClick={() => remove.mutate()}>
                {t('go.deleteReview')}
              </Button>
            )}
          </div>
        </form>
      ) : (
        <p className="mt-3 text-ink-muted">
          <Link to="/login" className="font-semibold text-link underline">
            {t('go.loginToReview')}
          </Link>
        </p>
      )}

      {reviews.data && reviews.data.count === 0 && <p className="mt-4 text-ink-muted">{t('go.noReviews')}</p>}
      <ul className="mt-4 flex flex-col gap-3">
        {reviews.data?.reviews.map((r) => (
          <li key={r.id} className="rounded-2xl bg-surface-sunken p-4">
            <p className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold">{r.author}</span>
              <span className="flex items-center gap-1 text-ink-muted">
                <Star size={14} weight="fill" className="text-link" />
                {r.rating}/5 · {new Date(r.created_at).toLocaleDateString(lang)}
              </span>
            </p>
            {r.comment && <p className="mt-1.5">{r.comment}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
