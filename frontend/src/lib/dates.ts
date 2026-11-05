import type { Lang } from '@/api/types'

/** Local calendar dates as YYYY-MM-DD, never through UTC (which could shift the day). */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + days)
  return next
}

/** Monday of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7
  const monday = addDays(d, -day)
  monday.setHours(0, 0, 0, 0)
  return monday
}

// Algerian Arabic locale keeps Latin digits, consistent with the rest of the interface.
export const intlLocale = (lang: Lang) => (lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-GB' : 'fr-FR')

export function formatDay(d: Date, lang: Lang, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(intlLocale(lang), options).format(d)
}
