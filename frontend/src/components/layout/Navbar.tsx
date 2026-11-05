import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
import { Container } from '@/components/ui/Container'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/cn'
import { isCookPath } from '@/lib/sections'
import { AccountMenu } from './AccountMenu'
import { LanguageSwitch } from './LanguageSwitch'
import { ThemeToggle } from './ThemeToggle'

export function Navbar() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  // Each world has its own active color: rust for cooking, sage for going out.
  const links = [
    { to: '/explore', key: 'nav.cook', active: isCookPath(pathname), on: 'bg-primary-soft text-link' },
    { to: '/go', key: 'nav.go', active: pathname.startsWith('/go'), on: 'bg-moss-soft text-moss-ink' },
    { to: '/assistant', key: 'nav.assistant', active: pathname === '/assistant', on: 'bg-surface-sunken text-ink' },
    { to: '/favorites', key: 'nav.favorites', active: pathname === '/favorites', on: 'bg-surface-sunken text-ink' },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4 md:h-[72px]">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label={t('nav.main')} className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                aria-current={l.active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-11 items-center rounded-full px-4 text-[15px] font-medium transition-colors',
                  l.active ? cn(l.on, 'font-semibold') : 'text-ink hover:bg-surface-sunken',
                )}
              >
                {t(l.key)}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitch />
          <ThemeToggle />
          <AccountMenu />
        </div>

        {/* On phones the pages are in the bottom tab bar and settings in "Compte". */}
        <div className="md:hidden">
          <ThemeToggle />
        </div>
      </Container>
    </header>
  )
}
