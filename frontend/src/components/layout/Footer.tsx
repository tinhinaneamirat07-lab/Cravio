import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Container } from '@/components/ui/Container'
import { Logo } from '@/components/ui/Logo'
import { LanguageSwitch } from './LanguageSwitch'

export function Footer() {
  const { t } = useTranslation()
  const groups = [
    {
      title: t('footer.product'),
      links: [
        { to: '/explore', label: t('nav.explore') },
        { to: '/planner', label: t('nav.planner') },
        { to: '/shopping', label: t('nav.shopping') },
        { to: '/assistant', label: t('nav.assistant') },
      ],
    },
    {
      title: t('footer.company'),
      links: [
        { to: '/about', label: t('footer.about') },
        { to: '/privacy', label: t('footer.privacy') },
        { to: '/terms', label: t('footer.terms') },
      ],
    },
  ]

  return (
    <footer className="bg-brand-deep text-on-brand">
      <Container className="grid gap-10 py-16 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="max-w-xs space-y-4">
          <Logo onDark />
          <p className="leading-relaxed text-on-brand-muted">{t('footer.tagline')}</p>
        </div>
        {groups.map((g) => (
          <div key={g.title}>
            <h2 className="eyebrow font-sans text-apricot">{g.title}</h2>
            <ul className="mt-4 space-y-1">
              {g.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="inline-flex min-h-9 items-center text-[15px] text-on-brand hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h2 className="eyebrow font-sans text-apricot">{t('footer.language')}</h2>
          <LanguageSwitch onDark className="mt-4" />
        </div>
      </Container>
      <div className="border-t border-on-brand/15">
        <Container className="py-6">
          <p className="text-sm text-on-brand-muted">{t('footer.rights')}</p>
        </Container>
      </div>
    </footer>
  )
}
