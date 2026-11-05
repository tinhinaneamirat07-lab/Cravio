import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { AgentAction, RecipeSummary } from '@/api/types'
import { RecipeImage } from '@/components/RecipeImage'
import { Basket, CalendarCheck, CheckCircle, Clock, SpeakerHigh, SpeakerSlash } from '@/components/ui/icons'
import { MARKER } from '@/features/assistant/text'
import { useLang } from '@/hooks/useLocalized'
import { cn } from '@/lib/cn'
import { formatDay, fromISODate } from '@/lib/dates'
import { formatMinutes, langOf, pick } from '@/lib/localize'

/** Renders one line, turning [[slug]] markers into links to the recipe. */
function Inline({ text, recipes }: { text: string; recipes: Map<string, RecipeSummary> }) {
  const lang = useLang()
  const parts = text.split(MARKER)
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part
        const recipe = recipes.get(part)
        if (!recipe) return null
        return (
          <Link
            key={i}
            to={`/recipes/${part}`}
            lang={langOf(recipe.title, lang)}
            className="font-semibold text-link underline decoration-1 underline-offset-4 hover:decoration-2"
          >
            {pick(recipe.title, lang)}
          </Link>
        )
      })}
    </>
  )
}

/** Short paragraphs and "- " lists, the only formatting the agent is asked to use. */
export function ReplyText({ text, recipes }: { text: string; recipes: RecipeSummary[] }) {
  const bySlug = new Map(recipes.map((r) => [r.slug, r]))
  const blocks: { list: boolean; lines: string[] }[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) {
      blocks.push({ list: false, lines: [] })
      continue
    }
    const isItem = /^[-•*]\s+/.test(line)
    const last = blocks.at(-1)
    const content = line.replace(/^[-•*]\s+/, '')
    if (last && last.list === isItem && last.lines.length) last.lines.push(content)
    else blocks.push({ list: isItem, lines: [content] })
  }
  return (
    <div className="space-y-2">
      {blocks
        .filter((b) => b.lines.length)
        .map((b, i) =>
          b.list ? (
            <ul key={i} className="list-disc space-y-1 ps-5 marker:text-copper">
              {b.lines.map((l, j) => (
                <li key={j}>
                  <Inline text={l} recipes={bySlug} />
                </li>
              ))}
            </ul>
          ) : (
            <p key={i}>
              {b.lines.map((l, j) => (
                <span key={j}>
                  {j > 0 && <br />}
                  <Inline text={l} recipes={bySlug} />
                </span>
              ))}
            </p>
          ),
        )}
    </div>
  )
}

export function RecipeChips({ recipes }: { recipes: RecipeSummary[] }) {
  const lang = useLang()
  if (!recipes.length) return null
  return (
    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
      {recipes.slice(0, 4).map((r) => (
        <li key={r.slug}>
          <Link
            to={`/recipes/${r.slug}`}
            className="flex h-full items-center gap-3 rounded-xl bg-surface-sunken p-2 transition-colors hover:bg-primary-soft"
          >
            <RecipeImage src={r.image_url} className="size-12 shrink-0 rounded-lg" />
            <span className="min-w-0">
              <span lang={langOf(r.title, lang)} className="line-clamp-1 font-semibold">
                {pick(r.title, lang)}
              </span>
              {r.total_minutes != null && (
                <span className="flex items-center gap-1 text-sm text-ink-muted">
                  <Clock size={14} />
                  {formatMinutes(r.total_minutes, lang)}
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function ActionChips({ actions, recipes }: { actions: AgentAction[]; recipes: RecipeSummary[] }) {
  const { t } = useTranslation()
  const lang = useLang()
  if (!actions.length) return null
  const titles = new Map(recipes.map((r) => [r.slug, pick(r.title, lang)]))
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {actions.map((a, i) => {
        const planner = a.type === 'planner_add'
        const label =
          a.type === 'planner_add'
            ? t('chat.actions.planner_add', {
                recipe: titles.get(a.slug) ?? a.slug,
                day: formatDay(fromISODate(a.day), lang, { weekday: 'long', day: 'numeric', month: 'short' }),
                slot: t(`slots.${a.slot}`).toLowerCase(),
              })
            : a.type === 'shopping_add'
              ? t('chat.actions.shopping_add', { items: a.items.join(', ') })
              : t('chat.actions.shopping_generate', { count: a.count })
        const Icon = planner ? CalendarCheck : Basket
        return (
          <li key={i}>
            <Link
              to={planner ? '/planner' : '/shopping'}
              className="inline-flex min-h-9 items-center gap-2 rounded-full bg-moss-soft px-3 py-1 text-sm font-semibold text-moss-ink hover:underline"
            >
              <CheckCircle size={16} className="shrink-0" />
              <Icon size={16} className="shrink-0" />
              {label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function SpeakButton({ speaking, onSpeak, onStop }: { speaking: boolean; onSpeak: () => void; onStop: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={speaking ? onStop : onSpeak}
      aria-label={speaking ? t('chat.stopSpeaking') : t('chat.speak')}
      title={speaking ? t('chat.stopSpeaking') : t('chat.speak')}
      className={cn(
        'grid size-9 place-items-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink',
        speaking && 'text-copper',
      )}
    >
      {speaking ? <SpeakerSlash size={18} /> : <SpeakerHigh size={18} />}
    </button>
  )
}
