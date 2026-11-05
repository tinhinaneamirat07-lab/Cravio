import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
import { Container } from '@/components/ui/Container'
import { cn } from '@/lib/cn'

const tabs = [
  { to: '/explore', key: 'nav.recipes' },
  { to: '/fridge', key: 'nav.fridge' },
  { to: '/planner', key: 'nav.planner' },
  { to: '/shopping', key: 'nav.shopping' },
]

/** The four cooking tools as one segmented control. The white pill slides to the open tab. */
export function CookTabs() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const reduce = useReducedMotion()
  return (
    <Container className="pt-6">
      <nav aria-label={t('nav.cook')} className="flex max-w-xl gap-1 rounded-full bg-surface-sunken p-1">
        {tabs.map((tab) => {
          const active = pathname === tab.to
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={cn(
                'relative flex h-10 flex-1 items-center justify-center rounded-full px-2 text-sm font-medium transition-colors',
                active ? 'font-semibold text-link' : 'text-ink-muted hover:text-ink',
              )}
            >
              {active && (
                <motion.span
                  layoutId="cook-tab"
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-full bg-surface shadow-sm"
                />
              )}
              <span className="relative">{t(tab.key)}</span>
            </NavLink>
          )
        })}
      </nav>
    </Container>
  )
}
