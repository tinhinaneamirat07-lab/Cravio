import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import type { PlanItem, Slot } from '@/api/types'
import { RecipeImage } from '@/components/RecipeImage'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Basket, BowlFood, CaretLeft, CaretRight, Coffee, CookingPot, Minus, Plus, Warning, X } from '@/components/ui/icons'
import { StateMessage } from '@/components/ui/StateMessage'
import { ServerDown } from '@/components/ServerDown'
import { useMe } from '@/features/auth/queries'
import { usePlan, useGenerateList, useRemovePlanItem, useUpdatePlanItem } from '@/features/planner/queries'
import { RecipePicker } from '@/features/planner/RecipePicker'
import { useLang } from '@/hooks/useLocalized'
import { cn } from '@/lib/cn'
import { addDays, formatDay, fromISODate, startOfWeek, toISODate } from '@/lib/dates'
import { langOf, pick } from '@/lib/localize'

const SLOTS: Slot[] = ['breakfast', 'lunch', 'dinner']
const SLOT_ICONS = { breakfast: Coffee, lunch: BowlFood, dinner: CookingPot }

function PlanCard({ item, start }: { item: PlanItem; start: string }) {
  const { t } = useTranslation()
  const lang = useLang()
  const update = useUpdatePlanItem(start)
  const remove = useRemovePlanItem(start)
  const title = pick(item.recipe.title, lang)
  const stepBtn =
    'grid size-9 place-items-center rounded-full bg-surface shadow-sm transition-colors hover:bg-surface-raised disabled:opacity-40'

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface p-2 shadow-sm">
      <Link to={`/recipes/${item.recipe.slug}`} className="shrink-0 self-start">
        <RecipeImage src={item.recipe.image_url} className="size-13 rounded-lg" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to={`/recipes/${item.recipe.slug}`}
          lang={langOf(item.recipe.title, lang)}
          className="block truncate text-[15px] leading-5 font-semibold hover:text-link"
          title={title}
        >
          {title}
        </Link>
        <div
          className="mt-1.5 inline-flex items-center gap-0.5 rounded-full border border-line bg-surface-sunken p-0.5"
          role="group"
          aria-label={t('recipe.servings', { count: item.servings })}
        >
          <button
            type="button"
            className={stepBtn}
            aria-label={t('planner.fewer')}
            disabled={item.servings <= 1}
            onClick={() => update.mutate({ id: item.id, servings: item.servings - 1 })}
          >
            <Minus size={14} />
          </button>
          <span className="min-w-7 text-center text-sm font-semibold tabular-nums">{item.servings}</span>
          <button
            type="button"
            className={stepBtn}
            aria-label={t('planner.more')}
            disabled={item.servings >= 24}
            onClick={() => update.mutate({ id: item.id, servings: item.servings + 1 })}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => remove.mutate(item.id)}
        aria-label={t('planner.remove', { name: title })}
        className="grid size-9 shrink-0 place-items-center self-start rounded-full text-ink hover:bg-surface-sunken"
      >
        <X size={16} />
      </button>
    </div>
  )
}

export default function Planner() {
  const { t } = useTranslation()
  const lang = useLang()
  const navigate = useNavigate()
  const me = useMe()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const start = toISODate(weekStart)
  const plan = usePlan(start, Boolean(me.data))
  const generate = useGenerateList()
  const [target, setTarget] = useState<{ day: string; slot: Slot } | null>(null)

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const today = toISODate(new Date())
  const isThisWeek = start === toISODate(startOfWeek(new Date()))

  const bySlot = useMemo(() => {
    const map = new Map<string, PlanItem[]>()
    for (const item of plan.data ?? []) {
      const key = `${item.day}|${item.slot}`
      map.set(key, [...(map.get(key) ?? []), item])
    }
    return map
  }, [plan.data])

  if (me.isSuccess && !me.data) return <Navigate to="/login?next=%2Fplanner" replace />
  if (me.isError) return <ServerDown onRetry={() => me.refetch()} />

  const count = plan.data?.length ?? 0
  const short: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const range = `${formatDay(days[0], lang, short)} - ${formatDay(days[6], lang, short)}`
  const targetLabel = target
    ? t('planner.addTo', {
        slot: t(`slots.${target.slot}`).toLowerCase(),
        day: formatDay(fromISODate(target.day), lang, { weekday: 'long', day: 'numeric' }),
      })
    : ''

  const navBtn =
    'grid size-11 shrink-0 place-items-center rounded-full border border-line-strong bg-surface hover:bg-surface-sunken active:scale-[0.97]'

  return (
    <>
      <Container className="pt-10 pb-8 md:pt-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold md:text-4xl">{t('planner.title')}</h1>
            <p className="mt-2 max-w-xl text-ink-muted">{t('planner.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className={navBtn} aria-label={t('planner.previous')} onClick={() => setWeekStart(addDays(weekStart, -7))}>
              <CaretLeft size={20} className="rtl:-scale-x-100" />
            </button>
            <div className="min-w-40 text-center" aria-live="polite">
              <p className="text-lg font-semibold">{range}</p>
              <p className="text-sm text-ink-muted">{plan.isSuccess ? t('planner.recipesCount', { count }) : ' '}</p>
            </div>
            <button type="button" className={navBtn} aria-label={t('planner.next')} onClick={() => setWeekStart(addDays(weekStart, 7))}>
              <CaretRight size={20} className="rtl:-scale-x-100" />
            </button>
            <Button
              variant="soft"
              className={cn(isThisWeek && 'invisible')}
              onClick={() => setWeekStart(startOfWeek(new Date()))}
            >
              {t('planner.thisWeek')}
            </Button>
          </div>
        </div>

        {plan.isError ? (
          <StateMessage
            className="mt-8"
            tone="danger"
            icon={<Warning size={24} />}
            title={t('explore.errorTitle')}
            body={t('explore.errorBody')}
            action={
              <Button variant="secondary" onClick={() => plan.refetch()}>
                {t('explore.retry')}
              </Button>
            }
          />
        ) : (
          <>
            {/* Column headers, desktop only (each cell names its meal on smaller screens) */}
            <div className="mt-8 hidden grid-cols-[13rem_1fr_1fr_1fr] gap-4 px-4 lg:grid" aria-hidden="true">
              <span />
              {SLOTS.map((slot) => {
                const Icon = SLOT_ICONS[slot]
                return (
                  <span key={slot} className="flex items-center gap-2 text-[15px] font-semibold text-ink-muted">
                    <Icon size={18} />
                    {t(`slots.${slot}`)}
                  </span>
                )
              })}
            </div>
            <ol className={cn('mt-3 space-y-3', plan.isPending && 'animate-pulse')}>
              {days.map((d) => {
                const iso = toISODate(d)
                const isToday = iso === today
                return (
                  <li
                    key={iso}
                    className={cn(
                      'grid gap-4 rounded-2xl border p-3 md:p-4 lg:grid-cols-[13rem_1fr_1fr_1fr]',
                      isToday ? 'border-apricot bg-apricot-soft' : 'border-transparent bg-surface-sunken',
                    )}
                    aria-current={isToday ? 'date' : undefined}
                  >
                    <div className="flex items-center gap-3 lg:self-center">
                      <span
                        className={cn(
                          'font-display grid size-12 shrink-0 place-items-center rounded-xl text-xl font-semibold',
                          isToday ? 'bg-apricot text-on-apricot' : 'bg-surface',
                        )}
                      >
                        {d.getDate()}
                      </span>
                      <div>
                        <p className="text-lg font-semibold capitalize">{formatDay(d, lang, { weekday: 'long' })}</p>
                        {isToday && (
                          <span className="mt-0.5 inline-flex min-h-6 items-center rounded-full bg-apricot px-2.5 text-[13px] font-semibold text-on-apricot">
                            {t('planner.today')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3 lg:contents">
                      {SLOTS.map((slot) => {
                        const items = bySlot.get(`${iso}|${slot}`) ?? []
                        const Icon = SLOT_ICONS[slot]
                        const dayName = formatDay(d, lang, { weekday: 'long' })
                        return (
                          <section key={slot} aria-label={`${t(`slots.${slot}`)}, ${dayName}`} className="space-y-2">
                            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink-muted lg:hidden">
                              <Icon size={16} />
                              {t(`slots.${slot}`)}
                            </h3>
                            {items.map((item) => (
                              <PlanCard key={item.id} item={item} start={start} />
                            ))}
                            {items.length === 0 ? (
                              <button
                                type="button"
                                onClick={() => setTarget({ day: iso, slot })}
                                className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-line-strong text-[15px] font-medium text-ink-muted transition-colors hover:border-primary hover:bg-primary-soft hover:text-link"
                              >
                                <Plus size={16} />
                                {t('planner.add')}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setTarget({ day: iso, slot })}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-ink-muted hover:bg-surface hover:text-link"
                              >
                                <Plus size={14} />
                                {t('planner.add')}
                              </button>
                            )}
                          </section>
                        )
                      })}
                    </div>
                  </li>
                )
              })}
            </ol>
          </>
        )}
      </Container>

      {/* Sticky call to action */}
      <div className="sticky bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-sm">
        <Container className="flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3">
            <span className="hidden size-12 place-items-center rounded-xl bg-moss-soft text-moss-ink sm:grid">
              <Basket size={22} />
            </span>
            <div>
              <p className="font-semibold">{t('planner.ready')}</p>
              <p className="text-sm text-ink-muted">{count ? t('planner.recipesCount', { count }) : t('planner.generateHint')}</p>
            </div>
          </div>
          <Button
            size="lg"
            disabled={count === 0 || generate.isPending}
            onClick={() => generate.mutate(start, { onSuccess: () => navigate('/shopping') })}
          >
            <Basket size={20} />
            <span className="hidden sm:inline">{t('planner.generate')}</span>
            <span className="sm:hidden">{t('nav.shopping')}</span>
          </Button>
        </Container>
      </div>

      <RecipePicker target={target} label={targetLabel} onClose={() => setTarget(null)} />
    </>
  )
}
