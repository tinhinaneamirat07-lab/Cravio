import type { Lang, RecipeSummary } from '@/api/types'
import { pick } from '@/lib/localize'

/** The agent refers to recipes as [[slug]]; the app turns them into links. */
export const MARKER = /\[\[([a-z0-9][a-z0-9-]*)\]\]/g

/** The reply with markers replaced by recipe names, for reading aloud. */
export function plainText(text: string, recipes: RecipeSummary[], lang: Lang) {
  const titles = new Map(recipes.map((r) => [r.slug, pick(r.title, lang)]))
  return text.replace(MARKER, (_, slug: string) => titles.get(slug) ?? '').replace(/^\s*[-•*]\s+/gm, '')
}
