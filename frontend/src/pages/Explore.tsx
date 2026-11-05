import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import type { Category, Cuisine, RecipeFilters } from '@/api/types'
import { RecipeCard, RecipeCardSkeleton } from '@/components/RecipeCard'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Container } from '@/components/ui/Container'
import { Carrot, CookingPot, MagnifyingGlass, Warning, X } from '@/components/ui/icons'
import { StateMessage } from '@/components/ui/StateMessage'
import { useRecipeSearch } from '@/features/recipes/queries'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const CATEGORIES: Category[] = ['main', 'soup', 'salad', 'starter', 'side', 'breakfast', 'dessert', 'drink']
const CUISINES: Cuisine[] = ['maghrebi', 'mediterranean', 'world']
const DIETS = ['no-pork', 'halal', 'vegetarian', 'vegan', 'gluten-free', 'no-alcohol']
const TIMES = [15, 30, 60]

type FilterKey = 'category' | 'cuisine' | 'diet' | 'max_minutes'

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
      <span className="w-32 shrink-0 text-[15px] font-semibold">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
      >
        {children}
      </div>
    </div>
  )
}

export default function Explore() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const debounced = useDebouncedValue(search.trim(), 300)

  // Keep the URL in sync with the search box, so results can be shared and survive a reload.
  useEffect(() => {
    const current = params.get('q') ?? ''
    if (debounced === current) return
    const next = new URLSearchParams(params)
    if (debounced) next.set('q', debounced)
    else next.delete('q')
    setParams(next, { replace: true })
  }, [debounced, params, setParams])

  const filters: RecipeFilters = useMemo(
    () => ({
      q: params.get('q') ?? undefined,
      category: (params.get('category') as Category) ?? undefined,
      cuisine: (params.get('cuisine') as Cuisine) ?? undefined,
      diet: params.get('diet') ?? undefined,
      max_minutes: params.get('max_minutes') ? Number(params.get('max_minutes')) : undefined,
    }),
    [params],
  )

  const toggle = (key: FilterKey, value: string) => {
    const next = new URLSearchParams(params)
    if (next.get(key) === value) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const clearKey = (key: FilterKey) => {
    const next = new URLSearchParams(params)
    next.delete(key)
    setParams(next, { replace: true })
  }

  const hasFilters = ['q', 'category', 'cuisine', 'diet', 'max_minutes'].some((k) => params.has(k))
  const clear = () => {
    setSearch('')
    setParams(new URLSearchParams(), { replace: true })
  }

  const query = useRecipeSearch(filters)
  const recipes = query.data?.pages.flatMap((p) => p.items) ?? []
  const total = query.data?.pages[0]?.total ?? 0

  return (
    <Container className="py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold md:text-4xl">{t('explore.title')}</h1>
          <p className="mt-2 text-ink-muted">{t('explore.subtitle')}</p>
        </div>
        <ButtonLink to="/fridge" variant="soft">
          <Carrot size={18} />
          {t('fridge.cta')}
        </ButtonLink>
      </div>

      <div className="relative mt-8">
        <label htmlFor="recipe-search" className="sr-only">
          {t('explore.searchLabel')}
        </label>
        <MagnifyingGlass size={20} className="pointer-events-none absolute inset-y-0 start-4 my-auto text-ink-muted" />
        <input
          id="recipe-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('explore.searchPlaceholder')}
          autoComplete="off"
          className="h-14 w-full rounded-full border border-line bg-surface ps-12 pe-12 text-[17px] shadow-sm placeholder:text-ink-muted focus:border-focus [&::-webkit-search-cancel-button]:hidden"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label={t('explore.clear')}
            className="absolute inset-y-0 end-1.5 my-auto grid size-11 place-items-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink"
          >
            <X size={18} weight="bold" />
          </button>
        )}
      </div>

      <div className="mt-6 space-y-4 rounded-[28px] bg-surface-sunken p-5 md:p-6">
        <FilterRow label={t('explore.filters.category')}>
          <Chip active={!filters.category} onClick={() => clearKey('category')}>
            {t('explore.filters.any')}
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} active={filters.category === c} onClick={() => toggle('category', c)}>
              {t(`categories.${c}`)}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label={t('explore.filters.cuisine')}>
          <Chip active={!filters.cuisine} onClick={() => clearKey('cuisine')}>
            {t('explore.filters.any')}
          </Chip>
          {CUISINES.map((c) => (
            <Chip key={c} active={filters.cuisine === c} onClick={() => toggle('cuisine', c)}>
              {t(`cuisines.${c}`)}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label={t('explore.filters.diet')}>
          <Chip active={!filters.diet} onClick={() => clearKey('diet')}>
            {t('explore.filters.any')}
          </Chip>
          {DIETS.map((d) => (
            <Chip key={d} active={filters.diet === d} onClick={() => toggle('diet', d)}>
              {t(`diets.${d}`)}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label={t('explore.filters.time')}>
          <Chip active={!filters.max_minutes} onClick={() => clearKey('max_minutes')}>
            {t('explore.filters.any')}
          </Chip>
          {TIMES.map((m) => (
            <Chip key={m} active={filters.max_minutes === m} onClick={() => toggle('max_minutes', String(m))}>
              {t('explore.filters.under', { count: m })}
            </Chip>
          ))}
        </FilterRow>
      </div>

      <div className="mt-8 flex min-h-9 items-center justify-between gap-4">
        <p className="font-semibold" aria-live="polite">
          {query.isSuccess && t('explore.results', { count: total })}
        </p>
        {hasFilters && (
          <button type="button" onClick={clear} className="min-h-11 text-[15px] font-medium text-link underline-offset-4 hover:underline">
            {t('explore.clear')}
          </button>
        )}
      </div>

      <div className="mt-4">
        {query.isPending ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {Array.from({ length: 8 }, (_, i) => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
        ) : query.isError ? (
          <StateMessage
            tone="danger"
            icon={<Warning size={24} weight="bold" />}
            title={t('explore.errorTitle')}
            body={t('explore.errorBody')}
            action={
              <Button variant="secondary" onClick={() => query.refetch()}>
                {t('explore.retry')}
              </Button>
            }
          />
        ) : recipes.length === 0 ? (
          <StateMessage
            icon={<CookingPot size={24} weight="duotone" />}
            title={t('explore.emptyTitle')}
            body={t('explore.emptyBody')}
            action={
              hasFilters && (
                <Button variant="secondary" onClick={clear}>
                  {t('explore.clear')}
                </Button>
              )
            }
          />
        ) : (
          <>
            <ul
              className={`grid grid-cols-2 gap-x-4 gap-y-10 transition-opacity sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 ${query.isPlaceholderData ? 'opacity-60' : ''}`}
            >
              {recipes.map((r) => (
                <li key={r.slug}>
                  <RecipeCard recipe={r} />
                </li>
              ))}
            </ul>
            <div className="mt-12 flex flex-col items-center gap-3">
              {query.hasNextPage && (
                <Button variant="secondary" size="lg" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                  {t('explore.loadMore')}
                </Button>
              )}
              <p className="text-sm text-ink-muted">{t('explore.showing', { shown: recipes.length, total })}</p>
            </div>
          </>
        )}
      </div>

      <p className="mt-16 text-sm text-ink-muted">
        {t('explore.credit')}{' '}
        <a href="https://www.themealdb.com" target="_blank" rel="noreferrer" className="font-medium text-link hover:underline">
          TheMealDB
        </a>
        .
      </p>
    </Container>
  )
}
