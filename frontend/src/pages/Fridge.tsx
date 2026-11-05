import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { RecipeCard, RecipeCardSkeleton } from '@/components/RecipeCard'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Carrot, CheckCircle, CookingPot, Plus, Sparkle, Warning, X } from '@/components/ui/icons'
import { StateMessage } from '@/components/ui/StateMessage'
import { usePantryMatch } from '@/features/recipes/pantry'
import { useLang } from '@/hooks/useLocalized'

const MAX = 15

/** "Cook with what I have": the ingredients live in the URL, so the search can be shared or bookmarked. */
export default function Fridge() {
  const { t } = useTranslation()
  const lang = useLang()
  const [params, setParams] = useSearchParams()
  const items = (params.get('i') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, MAX)
  const [draft, setDraft] = useState('')
  const matches = usePantryMatch(items, lang)

  const save = (next: string[]) => setParams(next.length ? { i: next.join(',') } : {}, { replace: true })
  const add = (e: React.FormEvent) => {
    e.preventDefault()
    // Several at once: "poulet, riz, tomates"
    const fresh = draft
      .split(/[,،;]/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s && !items.includes(s))
    if (fresh.length) save([...items, ...fresh].slice(0, MAX))
    setDraft('')
  }

  return (
    <Container className="py-10 md:py-14">
      <div className="grid gap-8 lg:grid-cols-[22rem_1fr] lg:items-start lg:gap-12">
        <aside className="rounded-[28px] bg-surface-sunken p-6 lg:sticky lg:top-24">
          <span className="grid size-12 place-items-center rounded-xl bg-moss-soft text-moss-ink">
            <Carrot size={24} />
          </span>
          <h1 className="mt-4 text-3xl font-semibold">{t('fridge.title')}</h1>
          <p className="mt-2 text-ink-muted">{t('fridge.subtitle')}</p>

          <form onSubmit={add} className="mt-6 flex gap-2">
            <label htmlFor="fridge-input" className="sr-only">
              {t('fridge.inputLabel')}
            </label>
            <input
              id="fridge-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={120}
              placeholder={t('fridge.placeholder')}
              className="h-12 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-4 placeholder:text-ink-muted focus:border-focus"
            />
            <Button type="submit" size="lg" disabled={!draft.trim() || items.length >= MAX} aria-label={t('fridge.add')}>
              <Plus size={18} />
            </Button>
          </form>

          {items.length > 0 && (
            <>
              <ul className="mt-4 flex flex-wrap gap-2">
                {items.map((item) => (
                  <li key={item}>
                    <span className="inline-flex h-10 items-center gap-1 rounded-full bg-surface ps-4 pe-1 text-[15px] font-medium shadow-sm">
                      {item}
                      <button
                        type="button"
                        onClick={() => save(items.filter((i) => i !== item))}
                        aria-label={t('fridge.remove', { name: item })}
                        className="grid size-8 place-items-center rounded-full hover:bg-surface-sunken"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => save([])} className="mt-3 min-h-11 text-sm font-medium text-link hover:underline">
                {t('fridge.clear')}
              </button>
            </>
          )}

          <ButtonLink to="/assistant" variant="soft" className="mt-6 w-full">
            <Sparkle size={18} />
            {t('fridge.askAssistant')}
          </ButtonLink>
        </aside>

        <section aria-live="polite">
          {items.length === 0 ? (
            <StateMessage icon={<Carrot size={24} />} title={t('fridge.emptyTitle')} body={t('fridge.emptyBody')} tone="moss" />
          ) : matches.isPending ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <RecipeCardSkeleton key={i} />
              ))}
            </div>
          ) : matches.isError ? (
            <StateMessage tone="danger" icon={<Warning size={24} />} title={t('explore.errorTitle')} body={t('explore.errorBody')} />
          ) : matches.data.length === 0 ? (
            <StateMessage icon={<CookingPot size={24} />} title={t('fridge.noneTitle')} body={t('fridge.noneBody')} />
          ) : (
            <ul className={`grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3 ${matches.isPlaceholderData ? 'opacity-60' : ''}`}>
              {matches.data.map(({ recipe, have, missing }) => (
                <li key={recipe.slug}>
                  <RecipeCard recipe={recipe} />
                  <p className="mt-2 flex items-start gap-1.5 text-sm text-moss-ink">
                    <CheckCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{t('fridge.uses', { items: have.join(', ') })}</span>
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {missing.length ? t('fridge.missing', { items: missing.join(', ') }) : t('fridge.complete')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Container>
  )
}
