import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Container } from '@/components/ui/Container'
import { cn } from '@/lib/cn'

type Section = { heading: string; body: string }
const PAGES = [
  { key: 'about', to: '/about' },
  { key: 'privacy', to: '/privacy' },
  { key: 'terms', to: '/terms' },
] as const

function LegalPage({ page }: { page: (typeof PAGES)[number]['key'] }) {
  const { t } = useTranslation()
  const sections = t(`legal.${page}.sections`, { returnObjects: true }) as Section[]
  return (
    <Container className="max-w-3xl py-10 md:py-14">
      <nav aria-label="Cravio" className="flex flex-wrap gap-2">
        {PAGES.map((p) => (
          <Link
            key={p.key}
            to={p.to}
            aria-current={p.key === page ? 'page' : undefined}
            className={cn(
              'inline-flex h-10 items-center rounded-full px-4 text-[15px] font-medium',
              p.key === page ? 'bg-primary-soft text-link' : 'text-ink hover:bg-surface-sunken',
            )}
          >
            {t(`legal.${p.key}.title`)}
          </Link>
        ))}
      </nav>
      <h1 className="mt-8 text-4xl font-semibold md:text-5xl">{t(`legal.${page}.title`)}</h1>
      <p className="mt-3 text-sm text-ink-muted">{t('legal.updated')}</p>
      <div className="mt-10 space-y-8">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-2xl font-semibold">{s.heading}</h2>
            <p className="mt-2 text-lg leading-relaxed text-ink-muted">{s.body}</p>
          </section>
        ))}
      </div>
    </Container>
  )
}

export function About() {
  return <LegalPage page="about" />
}
export function Privacy() {
  return <LegalPage page="privacy" />
}
export function Terms() {
  return <LegalPage page="terms" />
}
