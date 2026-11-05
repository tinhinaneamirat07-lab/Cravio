import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Container } from '@/components/ui/Container'
import { BowlFood, CheckCircle, CookingPot, MapPin, Sparkle, Translate } from '@/components/ui/icons'
import { Link } from 'react-router-dom'

const ease = [0.16, 1, 0.3, 1] as const

export function Hero() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const enter = (delay: number) =>
    reduce
      ? {}
      : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease } }

  return (
    <section className="relative overflow-x-clip">
      <Container className="grid items-center gap-14 pt-10 pb-20 md:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20 lg:pb-28">
        <div className="flex max-w-2xl flex-col items-start gap-7">
          <motion.p
            {...enter(0)}
            className="inline-flex items-center gap-1.5 rounded-full bg-apricot-soft px-3 py-1.5 text-[13px] font-semibold text-apricot-ink"
          >
            <Sparkle size={16} />
            {t('hero.eyebrow')}
          </motion.p>
          <motion.h1
            {...enter(0.05)}
            className="text-[2.75rem] leading-[1.06] font-medium tracking-tight text-balance md:text-6xl lg:text-[4.5rem]"
          >
            {t('hero.title.lead')} <em className="text-link">{t('hero.title.cook')}</em> {t('hero.title.mid')}{' '}
            <em className="relative text-moss">
              {t('hero.title.go')}
              {/* Blueberry underline that draws itself under "sort" */}
              <motion.span
                aria-hidden="true"
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.5, ease }}
                className="absolute inset-x-0 bottom-1 -z-10 h-2 origin-left rounded-full bg-apricot rtl:origin-right"
              />
            </em>{' '}
            {t('hero.title.end')}
          </motion.h1>
          <motion.p {...enter(0.1)} className="max-w-[46ch] text-lg leading-relaxed text-ink-muted">
            {t('hero.subtitle')}
          </motion.p>
          {/* The two doors of the app, each in its own color */}
          <motion.div {...enter(0.2)} className="grid w-full max-w-md grid-cols-2 gap-3">
            <Link
              to="/explore"
              className="fig lift flex h-28 flex-col justify-between bg-primary p-4 text-on-primary hover:bg-primary-hover"
            >
              <CookingPot size={26} />
              <span className="text-lg font-semibold">{t('nav.cook')}</span>
            </Link>
            <Link to="/go" className="fig-go lift flex h-28 flex-col justify-between bg-moss p-4 text-on-moss">
              <MapPin size={26} />
              <span className="text-lg font-semibold">{t('nav.go')}</span>
            </Link>
          </motion.div>
          <motion.div {...enter(0.25)} className="w-full max-w-md">
            <Link
              to="/assistant"
              className="flex h-14 items-center gap-3 rounded-full border border-line-strong bg-surface ps-5 pe-2 text-ink-muted hover:bg-surface-raised"
            >
              <Sparkle size={20} className="text-brand" />
              <span className="flex-1">{t('hero.ask')}</span>
              <span className="ai-ring grid size-10 place-items-center rounded-full bg-brand-deep text-on-brand dark:bg-brand dark:text-bg">
                <Sparkle size={18} weight="fill" />
              </span>
            </Link>
          </motion.div>
          <motion.ul {...enter(0.3)} className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
            <li className="flex items-center gap-2">
              <CheckCircle size={18} className="text-moss-ink" />
              {t('hero.trust.free')}
            </li>
            <li className="flex items-center gap-2">
              <Translate size={18} className="text-moss-ink" />
              <span>
                Français, English, <span lang="ar">العربية</span>, Darija
              </span>
            </li>
            <li className="flex items-center gap-2">
              <BowlFood size={18} className="text-moss-ink" />
              {t('hero.trust.recipes')}
            </li>
          </motion.ul>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.1, ease }}
          className="relative mx-auto w-full max-w-md pe-6 pb-6 lg:max-w-[440px]"
        >
          {/* Apricot arch behind the photo, offset like a shadow */}
          <div aria-hidden="true" className="arch absolute inset-0 start-6 top-6 bg-apricot-soft" />
          <div className="arch relative aspect-[4/5] shadow-md">
            <img
              src="/img/chorba-frik.webp"
              alt={t('hero.imageAlt')}
              width={720}
              height={900}
              fetchPriority="high"
              className="size-full object-cover"
            />
          </div>

          {/* A real planner entry, not a fake screenshot */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7, ease }}
            className="absolute bottom-0 -start-4 w-72 rounded-2xl bg-surface-raised p-4 shadow-lg sm:-start-16"
          >
            <div className="flex gap-3">
              <img src="/img/chorba-frik.webp" alt="" className="size-16 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0">
                <p className="eyebrow text-apricot-ink">{t('hero.card.day')}</p>
                <p className="mt-1 text-lg leading-6 font-semibold">{t('hero.card.recipe')}</p>
                <p className="text-sm text-ink-muted">{t('hero.card.meta')}</p>
              </div>
            </div>
            <p className="mt-3 flex min-h-9 items-center gap-2 rounded-full bg-moss-soft px-3 text-sm font-semibold text-moss-ink">
              <CheckCircle size={18} />
              {t('hero.card.status')}
            </p>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  )
}
