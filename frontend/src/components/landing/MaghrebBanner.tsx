import { useTranslation } from 'react-i18next'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Highlight } from '@/components/ui/Highlight'
import { ArrowRight } from '@/components/ui/icons'
import { Reveal } from '@/components/ui/Reveal'

export function MaghrebBanner() {
  const { t } = useTranslation()
  const dishes = t('maghreb.dishes', { returnObjects: true }) as string[]
  return (
    <section className="pb-20 md:pb-28">
      <Container>
        <Reveal>
          <div className="grid items-end gap-10 overflow-hidden rounded-[28px] bg-apricot-soft ps-6 pt-10 md:ps-16 lg:grid-cols-2">
            <div className="flex flex-col items-start gap-6 pe-6 lg:self-center lg:pb-10">
              <p className="eyebrow text-apricot-ink">{t('maghreb.eyebrow')}</p>
              <h2 className="text-4xl leading-tight font-semibold text-balance text-brand md:text-5xl">
                <Highlight text={t('maghreb.title')} part={t('maghreb.highlight')} />
              </h2>
              <p className="max-w-[46ch] text-lg leading-relaxed">{t('maghreb.body')}</p>
              <ul className="flex flex-wrap gap-2">
                {dishes.map((d) => (
                  <li
                    key={d}
                    className="inline-flex h-10 items-center rounded-full border border-apricot-ink/60 px-4 text-[15px] text-apricot-ink"
                  >
                    {d}
                  </li>
                ))}
              </ul>
              <ButtonLink to="/explore?cuisine=maghrebi" size="lg">
                {t('maghreb.cta')}
                <ArrowRight size={18} className="rtl:-scale-x-100" />
              </ButtonLink>
            </div>
            <div className="arch mx-auto h-80 w-full max-w-md rounded-b-none md:h-[26rem]">
              <img src="/img/breads.webp" alt={t('maghreb.imageAlt')} loading="lazy" className="size-full object-cover" />
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
