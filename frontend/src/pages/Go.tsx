import { useTranslation } from 'react-i18next'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { MapPin } from '@/components/ui/icons'
import { Reveal } from '@/components/ui/Reveal'

/** Placeholder for the "Sortir" part, filled in phase 3 with GoSpot's places and map. */
export default function Go() {
  const { t } = useTranslation()
  return (
    <Container className="py-14 md:py-20">
      <Reveal className="mx-auto flex max-w-xl flex-col items-center gap-5 text-center">
        <span className="fig-go grid size-20 place-items-center bg-moss-soft text-moss-ink">
          <MapPin size={36} />
        </span>
        <p className="eyebrow text-moss">{t('go.eyebrow')}</p>
        <h1 className="text-4xl font-semibold md:text-5xl">{t('go.title')}</h1>
        <p className="text-lg text-ink-muted">{t('go.body')}</p>
        <ButtonLink to="/explore" variant="secondary">
          {t('go.cta')}
        </ButtonLink>
      </Reveal>
    </Container>
  )
}
