import { describe, expect, it } from 'vitest'
import { formatMinutes, formatQuantity, langOf, pick } from './localize'

describe('pick / langOf', () => {
  const title = { fr: 'Soupe', en: 'Soup' }

  it('uses the reader language when available', () => {
    expect(pick(title, 'fr')).toBe('Soupe')
    expect(langOf(title, 'fr')).toBe('fr')
  })

  it('falls back to English, then French', () => {
    expect(pick(title, 'ar')).toBe('Soup')
    expect(langOf(title, 'ar')).toBe('en')
    expect(pick({ fr: 'Tajine' }, 'ar')).toBe('Tajine')
    expect(pick(undefined, 'fr')).toBe('')
  })
})

describe('formatQuantity', () => {
  it('shows common fractions', () => {
    expect(formatQuantity(1.5, 'fr-FR')).toBe('1½')
    expect(formatQuantity(0.25, 'en-GB')).toBe('¼')
    expect(formatQuantity(2, 'fr-FR')).toBe('2')
  })

  it('rounds large amounts and keeps one decimal otherwise', () => {
    expect(formatQuantity(250.4, 'en-GB')).toBe('250')
    expect(formatQuantity(2.4, 'en-GB')).toBe('2.4')
  })

  it('isolates fractions as left-to-right in Arabic', () => {
    expect(formatQuantity(1.5, 'ar-DZ')).toBe('⁦1½⁩')
    expect(formatQuantity(3, 'ar-DZ')).toBe('3')
  })
})

describe('formatMinutes', () => {
  it('formats minutes and hours', () => {
    expect(formatMinutes(45, 'fr')).toBe('45 min')
    expect(formatMinutes(60, 'en')).toBe('1 h')
    expect(formatMinutes(95, 'fr')).toBe('1 h 35')
    expect(formatMinutes(30, 'ar')).toBe('30 د')
  })
})
