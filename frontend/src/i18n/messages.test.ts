import { describe, expect, it } from 'vitest'
import ar from './ar'
import appAr from './app.ar'
import appEn from './app.en'
import appFr from './app.fr'
import en from './en'
import fr from './fr'

const PLURAL = /_(zero|one|two|few|many|other)$/

/** Flattened keys, with plural suffixes removed so "results_one" and "results_other" count as "results". */
function keys(obj: object, prefix = ''): Set<string> {
  const out = new Set<string>()
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) keys(v, path).forEach((key) => out.add(key))
    else out.add(path.replace(PLURAL, ''))
  }
  return out
}

const locales = {
  fr: { ...fr, ...appFr },
  en: { ...en, ...appEn },
  ar: { ...ar, ...appAr },
}

describe('translations', () => {
  const reference = keys(locales.fr)

  it.each(['en', 'ar'] as const)('%s has every French key and nothing extra', (lang) => {
    const other = keys(locales[lang])
    expect([...reference].filter((k) => !other.has(k))).toEqual([])
    expect([...other].filter((k) => !reference.has(k))).toEqual([])
  })

  it('Arabic plurals cover every form i18next can ask for', () => {
    const flat = (obj: object, prefix = ''): string[] =>
      Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === 'object' && !Array.isArray(v) ? flat(v, `${prefix}${k}.`) : [`${prefix}${k}`],
      )
    const arKeys = new Set(flat(locales.ar))
    const pluralBases = new Set([...arKeys].filter((k) => PLURAL.test(k)).map((k) => k.replace(PLURAL, '')))
    for (const base of pluralBases) {
      // "one", "two", "few", "many" and "other" are required; "zero" is optional in i18next.
      for (const form of ['one', 'two', 'few', 'many', 'other']) expect(arKeys, `${base}_${form}`).toContain(`${base}_${form}`)
    }
  })

  it('has no empty strings except intentional blank units', () => {
    const empty = Object.entries(locales).flatMap(([lang, messages]) => {
      const walk = (obj: object, prefix: string): string[] =>
        Object.entries(obj).flatMap(([k, v]) =>
          typeof v === 'string' ? (v.trim() ? [] : [`${prefix}${k}`]) : v && typeof v === 'object' ? walk(v, `${prefix}${k}.`) : [],
        )
      return walk(messages, `${lang}:`)
    })
    expect(empty.filter((k) => !k.endsWith('units.piece'))).toEqual([])
  })
})
