import { useTranslation } from 'react-i18next'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { House } from '@/components/ui/icons'

export default function NotFound() {
  const { t } = useTranslation()
  return (
    <Container className="py-12 md:py-20">
      <div className="grid items-center gap-10 rounded-[28px] bg-surface-sunken p-8 md:grid-cols-[16rem_1fr] md:gap-14 md:p-14">
        <div className="arch mx-auto h-72 w-56 md:h-80 md:w-full">
          <img src="/img/pumpkin-soup.webp" alt="" className="size-full object-cover" />
        </div>
        <div className="flex flex-col items-start gap-4">
          <p className="eyebrow text-brand">404</p>
          <h1 className="max-w-lg text-4xl leading-tight font-semibold md:text-5xl">{t('notFound.title')}</h1>
          <p className="text-lg text-ink-muted">{t('notFound.body')}</p>
          <ButtonLink to="/" size="lg" className="mt-2">
            <House size={20} />
            {t('notFound.back')}
          </ButtonLink>
        </div>
      </div>
    </Container>
  )
}
