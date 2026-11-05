import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate } from 'react-router-dom'
import type { Aisle, ShoppingItem } from '@/api/types'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import {
  Basket,
  Bread,
  CalendarCheck,
  Carrot,
  Check,
  Coffee,
  Egg,
  Fish,
  Jar,
  Package,
  Pepper,
  Plus,
  Trash,
  Warning,
  X,
} from '@/components/ui/icons'
import { StateMessage } from '@/components/ui/StateMessage'
import { ServerDown } from '@/components/ServerDown'
import { useMe } from '@/features/auth/queries'
import {
  useAddShoppingItem,
  useClearChecked,
  useDeleteShoppingItem,
  useShoppingList,
  useToggleShoppingItem,
} from '@/features/planner/queries'
import { useLang } from '@/hooks/useLocalized'
import { formatAmount } from '@/lib/amount'
import { cn } from '@/lib/cn'
import { langOf, pick } from '@/lib/localize'

const AISLES: Aisle[] = ['produce', 'meat', 'dairy', 'bakery', 'pantry', 'spices', 'drinks', 'other']
const AISLE_ICONS = {
  produce: Carrot,
  meat: Fish,
  dairy: Egg,
  bakery: Bread,
  pantry: Jar,
  spices: Pepper,
  drinks: Coffee,
  other: Package,
}

function Row({ item }: { item: ShoppingItem }) {
  const { t, i18n } = useTranslation()
  const lang = useLang()
  const toggle = useToggleShoppingItem()
  const remove = useDeleteShoppingItem()
  const name = item.name.custom ?? pick(item.name, lang)
  const amount = formatAmount(item.quantity, item.unit, t, i18n.language)

  return (
    <li className="flex items-center gap-1 border-b border-line last:border-b-0">
      <label className="flex min-h-14 flex-1 cursor-pointer items-center gap-3.5 py-1.5">
        <input
          type="checkbox"
          checked={item.checked}
          onChange={() => toggle.mutate({ id: item.id, checked: !item.checked })}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            'grid size-7 shrink-0 place-items-center rounded-lg border-2 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
            item.checked ? 'border-moss bg-moss text-on-moss' : 'border-line-strong bg-surface',
          )}
        >
          {item.checked && <Check size={18} weight="bold" />}
        </span>
        <span
          lang={item.name.custom ? undefined : langOf(item.name, lang)}
          className={cn('flex-1 text-[17px]', item.checked && 'text-ink-muted line-through decoration-ink-muted')}
        >
          {name}
        </span>
        {amount && <span className="text-[15px] text-ink-muted tabular-nums">{amount}</span>}
      </label>
      <button
        type="button"
        onClick={() => remove.mutate(item.id)}
        aria-label={t('shopping.remove', { name })}
        className="grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-surface-sunken"
      >
        <X size={18} />
      </button>
    </li>
  )
}

export default function Shopping() {
  const { t } = useTranslation()
  const me = useMe()
  const list = useShoppingList(Boolean(me.data))
  const add = useAddShoppingItem()
  const clear = useClearChecked()
  const [name, setName] = useState('')

  const groups = useMemo(() => {
    const byAisle = new Map<Aisle, ShoppingItem[]>()
    for (const item of list.data ?? []) byAisle.set(item.aisle, [...(byAisle.get(item.aisle) ?? []), item])
    return AISLES.filter((a) => byAisle.has(a)).map((a) => ({ aisle: a, items: byAisle.get(a)! }))
  }, [list.data])

  if (me.isSuccess && !me.data) return <Navigate to="/login?next=%2Fshopping" replace />
  if (me.isError) return <ServerDown onRetry={() => me.refetch()} />

  const items = list.data ?? []
  const remaining = items.filter((i) => !i.checked).length
  const checkedCount = items.length - remaining
  const fromPlan = items.some((i) => i.source === 'plan')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = name.trim()
    if (!value) return
    add.mutate(value, { onSuccess: () => setName('') })
  }

  return (
    <Container className="grid gap-8 py-10 md:py-14 lg:grid-cols-[1fr_21rem] lg:items-start lg:gap-12">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold md:text-4xl">{t('shopping.title')}</h1>
        {list.isSuccess && items.length > 0 && (
          <p className="mt-2 text-ink-muted" aria-live="polite">
            {t('shopping.remaining', { count: remaining })}
          </p>
        )}

        <form onSubmit={submit} className="mt-7 flex gap-3">
          <label htmlFor="new-item" className="sr-only">
            {t('shopping.addLabel')}
          </label>
          <div className="relative min-w-0 flex-1">
            <Plus size={18} className="pointer-events-none absolute inset-y-0 start-4 my-auto text-ink-muted" />
            <input
              id="new-item"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder={t('shopping.addPlaceholder')}
              className="h-12 w-full rounded-xl border border-line-strong bg-surface ps-11 pe-4 placeholder:text-ink-muted focus:border-focus"
            />
          </div>
          <Button type="submit" size="lg" disabled={!name.trim() || add.isPending}>
            {t('shopping.add')}
          </Button>
        </form>

        {fromPlan && (
          <p className="mt-4 flex min-h-12 items-center gap-2.5 rounded-xl bg-moss-soft px-4 text-[15px] text-moss-ink">
            <CalendarCheck size={18} />
            {t('shopping.fromPlanner')}
          </p>
        )}

        <div className="mt-6">
          {list.isPending ? (
            <div className="space-y-3" aria-busy="true">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-sunken" />
              ))}
            </div>
          ) : list.isError ? (
            <StateMessage tone="danger" icon={<Warning size={24} />} title={t('explore.errorTitle')} body={t('explore.errorBody')} />
          ) : items.length === 0 ? (
            <StateMessage
              tone="moss"
              icon={<Basket size={24} />}
              title={t('shopping.emptyTitle')}
              body={t('shopping.emptyBody')}
              action={<ButtonLink to="/planner">{t('shopping.toPlanner')}</ButtonLink>}
            />
          ) : (
            <div className="gap-5 md:columns-2">
              {groups.map(({ aisle, items: rows }) => {
                const Icon = AISLE_ICONS[aisle]
                return (
                  <section
                    key={aisle}
                    aria-labelledby={`aisle-${aisle}`}
                    className="mb-5 break-inside-avoid rounded-2xl border border-line bg-surface px-5 pt-4 pb-1 shadow-sm"
                  >
                    <h2 id={`aisle-${aisle}`} className="flex items-center gap-3 pb-1 text-xl font-semibold">
                      <span className="grid size-10 place-items-center rounded-lg bg-moss-soft text-moss-ink">
                        <Icon size={20} />
                      </span>
                      <span className="flex-1">{t(`aisles.${aisle}`)}</span>
                      <span className="font-sans text-sm font-normal text-ink-muted tabular-nums">
                        {t('shopping.aisleCount', { done: rows.filter((r) => r.checked).length, total: rows.length })}
                      </span>
                    </h2>
                    <ul>
                      {rows.map((item) => (
                        <Row key={item.id} item={item} />
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <aside className="rounded-2xl border border-line bg-surface p-6 shadow-sm lg:sticky lg:top-24">
          <p className="eyebrow text-brand">{t('shopping.progress')}</p>
          <p className="mt-2 text-ink-muted">
            <span className="font-display me-1.5 text-4xl font-semibold text-ink">{checkedCount}</span>
            {t('shopping.ofChecked', { total: items.length })}
          </p>
          <div
            className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-sunken"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={items.length}
            aria-valuenow={checkedCount}
            aria-label={t('shopping.progress')}
          >
            <div className="h-full rounded-full bg-moss transition-[width]" style={{ width: `${(checkedCount / items.length) * 100}%` }} />
          </div>
          {checkedCount > 0 && (
            <Button variant="secondary" className="mt-5 w-full" onClick={() => clear.mutate()} disabled={clear.isPending}>
              <Trash size={18} />
              {t('shopping.clearChecked')}
            </Button>
          )}
          <Link to="/planner" className="mt-4 inline-flex min-h-11 items-center text-[15px] font-medium text-link underline underline-offset-4">
            {t('shopping.toPlanner')}
          </Link>
        </aside>
      )}
    </Container>
  )
}
