import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Slot } from '@/api/types'
import { RecipeImage } from '@/components/RecipeImage'
import { Dialog } from '@/components/ui/Dialog'
import { MagnifyingGlass } from '@/components/ui/icons'
import { useAddToPlan } from '@/features/planner/queries'
import { useRecipeSearch } from '@/features/recipes/queries'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useLang } from '@/hooks/useLocalized'
import { formatMinutes, langOf, pick } from '@/lib/localize'

export function RecipePicker({
  target,
  label,
  onClose,
}: {
  target: { day: string; slot: Slot } | null
  label: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const lang = useLang()
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 250)
  const results = useRecipeSearch({ q: q || undefined })
  const add = useAddToPlan()
  const recipes = results.data?.pages.flatMap((p) => p.items) ?? []

  const choose = (slug: string) => {
    if (!target) return
    add.mutate({ ...target, recipe_slug: slug }, { onSuccess: onClose })
  }

  return (
    <Dialog open={target !== null} onClose={onClose} title={label}>
      <div className="relative">
        <MagnifyingGlass size={18} className="pointer-events-none absolute inset-y-0 start-4 my-auto text-ink-muted" />
        <input
          type="search"
          value={search}
          autoFocus
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('planner.pickerSearch')}
          aria-label={t('planner.pickerSearch')}
          className="h-12 w-full rounded-xl border border-line-strong bg-surface ps-11 pe-4 placeholder:text-ink-muted focus:border-focus"
        />
      </div>
      {add.isError && (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {t('planner.full')}
        </p>
      )}
      <ul className="mt-4 space-y-1" aria-busy={results.isFetching}>
        {recipes.map((r) => (
          <li key={r.slug}>
            <button
              type="button"
              onClick={() => choose(r.slug)}
              disabled={add.isPending}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-start hover:bg-surface-sunken disabled:opacity-60"
            >
              <RecipeImage src={r.image_url} className="size-14 shrink-0 rounded-lg" />
              <span className="min-w-0">
                <span lang={langOf(r.title, lang)} className="line-clamp-1 font-semibold">
                  {pick(r.title, lang)}
                </span>
                {r.total_minutes != null && (
                  <span className="text-sm text-ink-muted">{formatMinutes(r.total_minutes, lang)}</span>
                )}
              </span>
            </button>
          </li>
        ))}
        {results.isSuccess && recipes.length === 0 && <li className="p-2 text-ink-muted">{t('explore.emptyTitle')}</li>}
      </ul>
    </Dialog>
  )
}
