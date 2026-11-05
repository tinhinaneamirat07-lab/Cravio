import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Highlight } from '@/components/ui/Highlight'
import { ArrowRight, BowlFood, CheckCircle, Sparkle, Translate } from '@/components/ui/icons'

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
            className="text-[2.5rem] leading-[1.1] font-semibold tracking-tight text-balance md:text-6xl lg:text-[4rem] lg:leading-[1.06]"
          >
            <Highlight text={t('hero.title')} part={t('hero.highlight')} stroke />
          </motion.h1>
          <motion.p {...enter(0.1)} className="max-w-[46ch] text-lg leading-relaxed text-ink-muted">
            {t('hero.subtitle')}
          </motion.p>
          <motion.div {...enter(0.2)} className="flex flex-wrap items-center gap-3">
            <ButtonLink to="/register" size="lg">
              {t('nav.start')}
              <ArrowRight size={18} className="rtl:-scale-x-100" />
            </ButtonLink>
            <ButtonLink to="/explore" size="lg" variant="secondary">
              {t('hero.secondary')}
            </ButtonLink>
          </motion.div>
          <motion.ul {...enter(0.3)} className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
            <li className="flex items-center gap-2">
              <CheckCircle size={18} className="text-moss-ink" />
              {t('hero.trust.free')}
            </li>
            <li className="flex items-center gap-2">
              <Translate size={18} className="text-moss-ink" />
              <span>
                Français, English, <span lang="ar">العربية</span>
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
