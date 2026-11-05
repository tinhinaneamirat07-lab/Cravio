import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Container } from '@/components/ui/Container'
import { ArrowRight, Basket, CalendarCheck, Carrot, Check, Microphone, Translate } from '@/components/ui/icons'
import { Reveal } from '@/components/ui/Reveal'
import { useLang } from '@/hooks/useLocalized'
import { cn } from '@/lib/cn'
import { addDays, formatDay, startOfWeek } from '@/lib/dates'

function Waveform() {
  const bars = [0.35, 0.7, 1, 0.55, 0.85, 0.4, 0.75, 0.5, 0.95, 0.3, 0.6]
  return (
    <div className="flex h-10 items-center gap-1.5" aria-hidden="true">
      {bars.map((h, i) => (
        <span
          key={i}
          className="wave-bar w-1.5 rounded-full bg-copper"
          style={{ height: `${h * 100}%`, animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  )
}

function IconTile({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={cn(
        'grid size-12 place-items-center rounded-xl',
        dark ? 'bg-on-brand/10 text-apricot' : 'bg-primary-soft text-link',
      )}
    >
      {children}
    </span>
  )
}

const WEEK = ['/img/chorba-frik.webp', '/img/breads.webp', '/img/chicken-skewers.webp', '/img/pumpkin-soup.webp', '/img/citrus-mocktail.webp']

export function Features() {
  const { t } = useTranslation()
  const lang = useLang()
  const items = t('features.shopping.items', { returnObjects: true }) as { name: string; qty: string }[]
  const monday = startOfWeek(new Date(2026, 8, 28))
  const card = 'h-full rounded-[28px] border border-line bg-surface p-6 shadow-sm md:p-8'

  return (
    <section id="features" className="py-20 md:py-24">
      <Container>
        <Reveal>
          <p className="eyebrow text-brand">{t('features.eyebrow')}</p>
          <h2 className="mt-3 max-w-2xl text-4xl leading-tight font-semibold text-balance md:text-5xl">
            {t('features.title')}
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {/* Planner, with a real week strip */}
          <Reveal className="lg:col-span-2">
            <article className={cn(card, 'grid items-center gap-8 md:grid-cols-[1fr_1.2fr]')}>
              <div>
                <IconTile>
                  <CalendarCheck size={24} />
                </IconTile>
                <h3 className="font-display mt-5 text-[22px] leading-7 font-semibold">{t('features.planner.title')}</h3>
                <p className="mt-3 leading-relaxed text-ink-muted">{t('features.planner.body')}</p>
              </div>
              <ol className="grid grid-cols-5 gap-2" aria-hidden="true">
                {WEEK.map((src, i) => (
                  <li
                    key={src}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-2xl p-1.5 pt-2.5',
                      i === 2 ? 'bg-apricot text-on-apricot' : 'bg-surface-sunken',
                    )}
                  >
                    <span className="text-sm font-semibold capitalize">
                      {formatDay(addDays(monday, i), lang, { weekday: 'short' })}
                    </span>
                    <img src={src} alt="" loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
                  </li>
                ))}
              </ol>
            </article>
          </Reveal>

          {/* Pantry: tall card with a photo on top */}
          <Reveal delay={0.05} className="lg:row-span-2">
            <article className="flex h-full flex-col overflow-hidden rounded-[28px] border border-line bg-surface shadow-sm">
              <img
                src="/img/garden-salad.webp"
                alt={t('features.pantry.imageAlt')}
                loading="lazy"
                className="h-56 w-full object-cover lg:h-auto lg:flex-1"
              />
              <div className="p-6 md:p-8">
                <IconTile>
                  <Carrot size={24} />
                </IconTile>
                <h3 className="font-display mt-5 text-[22px] leading-7 font-semibold">{t('features.pantry.title')}</h3>
                <p className="mt-3 leading-relaxed text-ink-muted">{t('features.pantry.body')}</p>
                <Link to="/fridge" className="mt-4 inline-flex min-h-11 items-center gap-1.5 font-semibold text-link hover:underline">
                  {t('fridge.cta')}
                  <ArrowRight size={16} className="rtl:-scale-x-100" />
                </Link>
              </div>
            </article>
          </Reveal>

          {/* Shopping list, with a real checklist */}
          <Reveal>
            <article className={card}>
              <IconTile>
                <Basket size={24} />
              </IconTile>
              <h3 className="font-display mt-5 text-[22px] leading-7 font-semibold">{t('features.shopping.title')}</h3>
              <p className="mt-3 leading-relaxed text-ink-muted">{t('features.shopping.body')}</p>
              <div className="mt-6 rounded-2xl bg-surface-sunken p-4" aria-hidden="true">
                <p className="eyebrow flex items-center gap-2 text-ink">
                  <Carrot size={16} />
                  {t('aisles.produce')}
                </p>
                <ul className="mt-2 divide-y divide-line">
                  {items.map((item, i) => (
                    <li key={item.name} className="flex min-h-11 items-center gap-3">
                      <span
                        className={cn(
                          'grid size-6 shrink-0 place-items-center rounded-md border-2',
                          i < 2 ? 'border-moss bg-moss text-on-moss' : 'border-line-strong bg-surface',
                        )}
                      >
                        {i < 2 && <Check size={14} weight="bold" />}
                      </span>
                      <span className={cn('flex-1', i < 2 && 'text-ink-muted line-through')}>{item.name}</span>
                      <span className="text-sm text-ink-muted">{item.qty}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </Reveal>

          {/* Voice: burgundy card */}
          <Reveal delay={0.05}>
            <article className="flex h-full flex-col rounded-[28px] bg-brand-deep p-6 text-on-brand md:p-8">
              <IconTile dark>
                <Microphone size={24} />
              </IconTile>
              <h3 className="font-display mt-5 text-[22px] leading-7 font-semibold">{t('features.voice.title')}</h3>
              <p className="mt-3 leading-relaxed text-on-brand-muted">{t('features.voice.body')}</p>
              <div className="mt-8">
                <Waveform />
              </div>
            </article>
          </Reveal>

          {/* Languages */}
          <Reveal className="lg:col-span-3">
            <article className={cn(card, 'grid items-center gap-6 md:grid-cols-[1fr_2fr]')}>
              <div className="flex gap-4">
                <IconTile>
                  <Translate size={24} />
                </IconTile>
                <div>
                  <h3 className="font-display text-[22px] leading-7 font-semibold">{t('features.languages.title')}</h3>
                  <p className="mt-2 leading-relaxed text-ink-muted">{t('features.languages.body')}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3" aria-hidden="true">
                {[
                  { word: 'Bonjour', lang: 'fr' },
                  { word: 'Hello', lang: 'en' },
                  { word: 'مرحبا', lang: 'ar' },
                ].map((w) => (
                  <span
                    key={w.lang}
                    lang={w.lang}
                    className={cn(
                      'font-display grid h-16 place-items-center rounded-2xl text-2xl font-semibold',
                      w.lang === lang ? 'bg-apricot-soft text-apricot-ink' : 'bg-surface-sunken',
                    )}
                  >
                    {w.word}
                  </span>
                ))}
              </div>
            </article>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}
