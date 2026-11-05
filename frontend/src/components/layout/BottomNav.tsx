import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { CookingPot, House, MapPin, Sparkle, UserCircle } from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import { isCookPath } from '@/lib/sections'

/**
 * Phone navigation: five tabs, the assistant raised in the middle.
 * Each world keeps its color when active: rust for cooking, sage for going out.
 */
export function BottomNav() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const reduce = useReducedMotion()

  const tabs = [
    { to: '/', key: 'nav.home', Icon: House, active: pathname === '/', tone: 'text-ink' },
    { to: '/explore', key: 'nav.cook', Icon: CookingPot, active: isCookPath(pathname), tone: 'text-link' },
    { to: '/go', key: 'nav.go', Icon: MapPin, active: pathname.startsWith('/go'), tone: 'text-moss' },
    { to: '/account', key: 'nav.account', Icon: UserCircle, active: ['/account', '/favorites'].includes(pathname), tone: 'text-ink' },
  ]

  const tab = (item: (typeof tabs)[number]) => (
    <li key={item.to} className="flex justify-center">
      <Link
        to={item.to}
        aria-current={item.active ? 'page' : undefined}
        className={cn(
          'relative flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 text-[11px] font-medium',
          item.active ? cn(item.tone, 'font-semibold') : 'text-ink-muted',
        )}
      >
        {item.active && (
          <motion.span
            layoutId="bottom-tab"
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 32 }}
            className="absolute -top-1.5 h-1 w-6 rounded-full bg-current"
          />
        )}
        <item.Icon size={24} weight={item.active ? 'fill' : 'regular'} />
        {t(item.key)}
      </Link>
    </li>
  )

  return (
    <nav
      aria-label={t('nav.main')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid h-[72px] max-w-md grid-cols-5 items-center">
        {tabs.slice(0, 2).map(tab)}
        <li className="flex justify-center">
          <Link to="/assistant" className="flex flex-col items-center gap-1 text-[11px] font-medium text-ink-muted">
            <span className="ai-ring -mt-7 grid size-14 place-items-center rounded-full bg-brand-deep text-on-brand shadow-lg dark:bg-brand dark:text-bg">
              <Sparkle size={26} weight="fill" />
            </span>
            {t('nav.assistant')}
          </Link>
        </li>
        {tabs.slice(2).map(tab)}
      </ul>
    </nav>
  )
}
