import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '@/api/client'
import type { Ingredient, RecipeDetail as Recipe } from '@/api/types'
import { RecipeImage } from '@/components/RecipeImage'
import { Badge } from '@/components/ui/Badge'
import { buttonClass } from '@/components/ui/button-styles'
import { Container } from '@/components/ui/Container'
import {
  ArrowLeft,
  ArrowSquareOut,
  Check,
  ChefHat,
  CookingPot,
  Flag,
  Heart,
  Minus,
  Plus,
  Sparkle,
  Warning,
  YoutubeLogo,
} from '@/components/ui/icons'
import { StateMessage } from '@/components/ui/StateMessage'
import { useMe } from '@/features/auth/queries'
import { AddToPlanner } from '@/features/planner/AddToPlanner'
import { useRecipe, useSimilarRecipes, useToggleFavorite } from '@/features/recipes/queries'
import { StepTimer } from '@/features/recipes/StepTimer'
import { useLang } from '@/hooks/useLocalized'
import { cn } from '@/lib/cn'
import { formatMinutes, formatQuantity, langOf, pick } from '@/lib/localize'

const KNOWN_UNITS = new Set(['g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'clove', 'bunch', 'pinch', 'piece'])

function IngredientLine({ item, scale, localUnits }: { item: Ingredient; scale: number; localUnits: boolean }) {
  const { t, i18n } = useTranslation()
  const lang = useLang()
  const name = pick(item.name, lang)

  let amount = ''
  if (item.quantity != null) {
    const value = item.quantity * scale
    const unit = item.unit
      ? localUnits && KNOWN_UNITS.has(item.unit)
        ? t(`units.${item.unit}`, { count: Math.ceil(value) })
        : item.unit
      : ''
    amount = [formatQuantity(value, i18n.language), unit].filter(Boolean).join(' ')
  }

  return (
    <>
      <span className="w-24 shrink-0 font-semibold text-link tabular-nums">{amount}</span>
      <span className="flex-1">
        <span lang={langOf(item.name, lang)}>{name}</span>
        {/* Free-text measures like "To taste" read better after the name. */}
        {!amount && item.measure && <span className="text-ink-muted">, {item.measure.toLowerCase()}</span>}
      </span>
    </>
  )
}

function Ingredients({ recipe }: { recipe: Recipe }) {
  const { t } = useTranslation()
  const [servings, setServings] = useState(recipe.servings ?? 0)
  const scale = recipe.servings ? servings / recipe.servings : 1
  const stepBtn =
    'grid size-11 place-items-center rounded-full bg-surface shadow-sm transition-colors hover:bg-surface-raised disabled:opacity-40'

  return (
    <section aria-labelledby="ingredients" className="rounded-[28px] bg-surface-sunken p-6 md:p-7 lg:sticky lg:top-24">
      <h2 id="ingredients" className="text-[28px] leading-9 font-semibold">
        {t('recipe.ingredients')}
      </h2>
      {recipe.servings && (
        <div className="mt-5 flex items-center justify-between gap-2 rounded-full border border-line bg-surface-sunken p-0.5">
          <button
            type="button"
            onClick={() => setServings((s) => Math.max(1, s - 1))}
            disabled={servings <= 1}
            aria-label={t('recipe.fewer')}
            className={stepBtn}
          >
            <Minus size={18} />
          </button>
          <span className="text-[15px] font-semibold" aria-live="polite">
            {t('recipe.servings', { count: servings })}
          </span>
          <button
            type="button"
            onClick={() => setServings((s) => Math.min(24, s + 1))}
            aria-label={t('recipe.more')}
            className={stepBtn}
          >
            <Plus size={18} />
          </button>
        </div>
      )}
      <ul className="mt-4 divide-y divide-line">
        {recipe.ingredients.map((item, i) => (
          <li key={i} className="flex gap-3 py-3 leading-relaxed">
            <IngredientLine item={item} scale={scale} localUnits={recipe.source === 'cravio'} />
          </li>
        ))}
      </ul>
      {recipe.servings && <p className="mt-4 text-sm text-ink-muted">{t('recipe.adjusts')}</p>}
    </section>
  )
}

function Similar({ recipe }: { recipe: Recipe }) {
  const { t } = useTranslation()
  const lang = useLang()
  const similar = useSimilarRecipes(recipe)
  if (!similar.data?.length) return null
  return (
    <section aria-labelledby="similar" className="mt-12">
      <h2 id="similar" className="text-[22px] leading-7 font-semibold">
        {t('recipe.similar')}
      </h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {similar.data.map((r) => (
          <li key={r.slug}>
            <Link
              to={`/recipes/${r.slug}`}
              className="flex h-full items-center gap-3 rounded-2xl border border-line bg-surface p-2 shadow-sm transition-shadow hover:shadow-md"
            >
              <RecipeImage src={r.image_url} className="size-14 shrink-0 rounded-lg" />
              <span lang={langOf(r.title, lang)} className="line-clamp-2 leading-snug font-semibold">
                {pick(r.title, lang)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function FavoriteButton({ recipe }: { recipe: Recipe }) {
  const { t } = useTranslation()
  const { data: user } = useMe()
  const navigate = useNavigate()
  const location = useLocation()
  const toggle = useToggleFavorite(recipe.slug)

  const onClick = () => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`)
      return
    }
    toggle.mutate(!recipe.is_favorite)
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={recipe.is_favorite}
      aria-label={recipe.is_favorite ? t('recipe.unfavorite') : t('recipe.favorite')}
      title={user ? (recipe.is_favorite ? t('recipe.unfavorite') : t('recipe.favorite')) : t('recipe.favoriteLogin')}
      className="grid size-13 place-items-center rounded-full bg-surface-raised text-copper shadow-md transition-transform active:scale-95"
    >
      <Heart size={24} weight={recipe.is_favorite ? 'fill' : 'regular'} />
    </button>
  )
}

export default function RecipeDetail() {
  const { slug = '' } = useParams()
  const { t } = useTranslation()
  const lang = useLang()
  const { data: recipe, isPending, error, refetch } = useRecipe(slug)

  if (isPending) {
    return (
      <Container className="py-10" aria-busy="true">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="arch aspect-[9/10] animate-pulse bg-surface-sunken" />
          <div className="space-y-4">
            <div className="h-10 w-3/4 animate-pulse rounded bg-surface-sunken" />
            <div className="h-5 w-full animate-pulse rounded bg-surface-sunken" />
            <div className="h-5 w-2/3 animate-pulse rounded bg-surface-sunken" />
          </div>
        </div>
      </Container>
    )
  }

  if (error || !recipe) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <Container className="py-16">
        <StateMessage
          tone={notFound ? 'apricot' : 'danger'}
          icon={notFound ? <CookingPot size={24} /> : <Warning size={24} />}
          title={notFound ? t('recipe.notFoundTitle') : t('explore.errorTitle')}
          body={notFound ? t('recipe.notFoundBody') : t('explore.errorBody')}
          action={
            notFound ? (
              <Link to="/explore" className={buttonClass({ variant: 'secondary' })}>
                {t('recipe.back')}
              </Link>
            ) : (
              <button type="button" onClick={() => refetch()} className={buttonClass({ variant: 'secondary' })}>
                {t('explore.retry')}
              </button>
            )
          }
        />
      </Container>
    )
  }

  const title = pick(recipe.title, lang)
  const description = pick(recipe.description, lang)
  const notInMyLanguage = !recipe.title[lang]
  const times = [
    ['recipe.prep', recipe.prep_minutes],
    ['recipe.cook', recipe.cook_minutes],
    ['recipe.total', recipe.total_minutes],
  ].filter(([, v]) => v) as [string, number][]

  return (
    <article className="pb-20">
      <Container className="pt-8">
        <Link
          to="/explore"
          className="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-link hover:underline"
        >
          <ArrowLeft size={18} className="rtl:-scale-x-100" />
          {t('recipe.back')}
        </Link>
      </Container>

      <Container className="mt-4 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
        <div className="arch mx-auto aspect-[9/10] w-full max-w-xl bg-surface-sunken shadow-md">
          <RecipeImage src={recipe.image_url} alt={title} priority className="size-full" />
        </div>

        <div>
          <ul className="flex flex-wrap gap-2">
            {(recipe.origin || recipe.cuisine === 'maghrebi') && (
              <li>
                <Badge tone="apricot">
                  <Flag size={14} />
                  {recipe.origin ? t(`origins.${recipe.origin}`, { defaultValue: recipe.origin }) : t('cuisines.maghrebi')}
                </Badge>
              </li>
            )}
            {recipe.diets.map((d) => (
              <li key={d}>
                <Badge tone="moss">
                  <Check size={14} />
                  {t(`diets.${d}`, { defaultValue: d })}
                </Badge>
              </li>
            ))}
            {recipe.difficulty && (
              <li>
                <Badge>
                  <ChefHat size={14} />
                  {t(`recipes.difficulty.${recipe.difficulty}`)}
                </Badge>
              </li>
            )}
          </ul>
          <h1
            lang={langOf(recipe.title, lang)}
            className="mt-5 text-4xl leading-tight font-semibold text-balance text-brand md:text-[3.5rem] md:leading-[1.05]"
          >
            {title}
          </h1>
          {description && (
            <p lang={langOf(recipe.description, lang)} className="mt-5 max-w-[60ch] text-lg leading-relaxed text-ink-muted">
              {description}
            </p>
          )}

          {(times.length > 0 || recipe.calories) && (
            <dl className="mt-7 grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none">
              {times.map(([label, value]) => (
                <div
                  key={label}
                  className={cn(
                    'border-line p-4 not-last:border-e',
                    label === 'recipe.total' && 'bg-apricot-soft',
                  )}
                >
                  <dt className={cn('text-sm', label === 'recipe.total' ? 'text-apricot-ink' : 'text-ink-muted')}>{t(label)}</dt>
                  <dd className="font-display mt-1 text-2xl font-semibold">{formatMinutes(value, lang)}</dd>
                </div>
              ))}
              {recipe.calories && (
                <div className="p-4">
                  <dt className="text-sm text-ink-muted">{t('recipe.energy')}</dt>
                  <dd className="font-display mt-1 text-2xl font-semibold">
                    {recipe.calories} <span className="font-sans text-sm font-normal text-ink-muted">kcal</span>
                  </dd>
                </div>
              )}
            </dl>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <AddToPlanner recipe={recipe} />
            <FavoriteButton recipe={recipe} />
            <Link to={`/assistant?recipe=${recipe.slug}`} className={buttonClass({ variant: 'soft', size: 'lg' })}>
              <Sparkle size={20} />
              {t('chat.askAbout')}
            </Link>
            {recipe.video_url && (
              <a href={recipe.video_url} target="_blank" rel="noreferrer" className={buttonClass({ variant: 'ghost' })}>
                <YoutubeLogo size={20} weight="fill" className="text-danger" />
                {t('recipe.video')}
              </a>
            )}
          </div>

          {notInMyLanguage && <p className="mt-6 text-sm text-ink-muted">{t('recipe.translated')}</p>}
        </div>
      </Container>

      <Container className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] lg:items-start lg:gap-16">
        <Ingredients recipe={recipe} />

        <section aria-labelledby="steps">
          <h2 id="steps" className="text-[28px] leading-9 font-semibold">
            {t('recipe.steps')}
          </h2>
          <ol className="mt-6 space-y-8">
            {recipe.steps.map((step) => (
              <li key={step.position} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="font-display grid size-12 shrink-0 place-items-center rounded-full bg-apricot-soft text-xl font-semibold text-apricot-ink"
                >
                  {step.position}
                </span>
                <div className="pt-2">
                  <p lang={langOf(step.text, lang)} className="max-w-[65ch] text-lg leading-relaxed">
                    {pick(step.text, lang)}
                  </p>
                  {step.timer_seconds && <StepTimer seconds={step.timer_seconds} />}
                </div>
              </li>
            ))}
          </ol>

          {recipe.source === 'themealdb' && (
            <p className="mt-12 flex flex-wrap items-center gap-x-2 border-t border-line pt-6 text-sm text-ink-muted">
              {t('recipe.sourceCredit', { name: 'TheMealDB' })}
              {recipe.source_url && (
                <a
                  href={recipe.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-link hover:underline"
                >
                  {t('recipe.source')}
                  <ArrowSquareOut size={14} weight="bold" />
                </a>
              )}
            </p>
          )}

          <Similar recipe={recipe} />
        </section>
      </Container>
    </article>
  )
}
