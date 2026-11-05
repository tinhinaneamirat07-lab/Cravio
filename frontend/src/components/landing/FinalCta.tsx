import { useTranslation } from 'react-i18next'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { ArrowRight } from '@/components/ui/icons'
import { Reveal } from '@/components/ui/Reveal'
import { cn } from '@/lib/cn'

const PHOTOS = ['chorba-frik', 'honey-garlic-chicken', 'lasagna', 'garden-salad', 'mushroom-veloute']

export function FinalCta() {
  const { t } = useTranslation()
  return (
    // The lower part is burgundy so the arches sit across the edge of the footer.
    <section className="bg-[linear-gradient(to_bottom,var(--bg)_calc(100%-5rem),var(--brand-deep)_calc(100%-5rem))] pt-20 md:pt-28">
      <Container>
        <Reveal className="flex flex-col items-center gap-5 text-center">
          <h2 className="max-w-3xl text-4xl leading-tight font-semibold text-balance md:text-5xl">{t('cta.title')}</h2>
          <p className="text-lg text-ink-muted">{t('cta.body')}</p>
          <ButtonLink to="/register" size="lg">
            {t('cta.button')}
            <ArrowRight size={18} className="rtl:-scale-x-100" />
          </ButtonLink>
        </Reveal>
        <div className="mt-14 grid grid-cols-3 items-end gap-3 md:grid-cols-5 md:gap-5" aria-hidden="true">
          {PHOTOS.map((p, i) => (
            <div key={p} className={cn('arch aspect-[4/5] bg-surface-sunken', i % 2 === 1 && 'md:mb-12', i > 2 && 'hidden md:block')}>
              <img src={`/img/${p}.webp`} alt="" loading="lazy" className="size-full object-cover" />
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
