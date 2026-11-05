import type { Lang, Localized } from '@/api/types'

/** Text in the reader's language, else English, else French, else whatever exists. */
export function pick(text: Localized | undefined, lang: Lang): string {
  if (!text) return ''
  return text[lang] ?? text.en ?? text.fr ?? Object.values(text).find(Boolean) ?? ''
}

/** True when the text had to fall back to another language (used to set `lang` on the element). */
export function langOf(text: Localized | undefined, lang: Lang): Lang {
  if (!text || text[lang]) return lang
  return text.en ? 'en' : text.fr ? 'fr' : lang
}

const FRACTIONS: [number, string][] = [
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.5, '½'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
]

/** 1.5 -> "1½", 0.333 -> "⅓", 250 -> "250", 2.4 -> "2.4" */
export function formatQuantity(value: number, locale: string): string {
  const text = formatNumber(value, locale)
  // In Arabic, "1½" would be displayed as "½1": isolate the number as left-to-right.
  return locale.startsWith('ar') && /[^\d.,]/.test(text) ? `\u2066${text}\u2069` : text
}

function formatNumber(value: number, locale: string): string {
  const whole = Math.floor(value)
  const rest = value - whole
  if (value >= 10) return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)
  if (rest < 0.05) return new Intl.NumberFormat(locale).format(whole)
  const match = FRACTIONS.find(([f]) => Math.abs(rest - f) < 0.05)
  if (match) return `${whole || ''}${match[1]}`
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)
}

export function formatMinutes(total: number, lang: Lang): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  const units = { fr: ['h', 'min'], en: ['h', 'min'], ar: ['س', 'د'] }[lang]
  if (!h) return `${m} ${units[1]}`
  return m ? `${h} ${units[0]} ${m}` : `${h} ${units[0]}`
}
