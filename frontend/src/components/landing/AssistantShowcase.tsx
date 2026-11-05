import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Container } from '@/components/ui/Container'
import { CheckCircle, Microphone, Pause } from '@/components/ui/icons'
import { Reveal } from '@/components/ui/Reveal'
import { cn } from '@/lib/cn'

type Message = { from: 'user' | 'bot'; text: string }

export function AssistantShowcase() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const chat = t('assistant.chat', { returnObjects: true }) as Message[]

  return (
    <section id="assistant" className="bg-brand-deep py-20 text-on-brand md:py-28">
      <Container className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal className="flex flex-col items-start gap-6">
          <p className="eyebrow text-apricot">{t('assistant.eyebrow')}</p>
          <h2 className="text-4xl leading-tight font-semibold text-balance md:text-5xl">{t('assistant.title')}</h2>
          <p className="max-w-[48ch] text-lg leading-relaxed text-on-brand-muted">{t('assistant.body')}</p>
          <div className="mt-2 flex items-center gap-4">
            <span className="relative grid size-14 place-items-center rounded-full bg-primary text-on-primary shadow-md">
              <Microphone size={24} />
              <span className="mic-pulse absolute -inset-1.5 rounded-full border-2 border-apricot" />
            </span>
            <span className="font-semibold">{t('assistant.listening')}</span>
          </div>
        </Reveal>

        {/* Live chat rendered with real UI rather than a screenshot */}
        <ul
          className="space-y-3 rounded-[28px] border border-on-brand/15 bg-on-brand/5 p-4 sm:p-7"
          aria-label={t('assistant.name')}
        >
          {chat.map((m, i) => (
            <motion.li
              key={i}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.45, delay: i * 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={cn('flex', m.from === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[88%] rounded-[22px] px-4 py-3 text-[15px] leading-relaxed',
                  m.from === 'user' ? 'rounded-ee-md bg-primary text-on-primary' : 'rounded-es-md bg-surface text-ink',
                )}
              >
                <p>{m.text}</p>
                {i === 1 && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface-sunken p-2">
                    <img src="/img/chorba-frik.webp" alt="" className="size-12 rounded-lg object-cover" />
                    <div>
                      <p className="font-semibold">{t('hero.card.recipe')}</p>
                      <p className="text-sm text-ink-muted">{t('hero.card.meta')}</p>
                    </div>
                  </div>
                )}
                {i === 3 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex h-9 items-center gap-2 rounded-full border border-apricot-ink bg-apricot-soft px-3 text-sm font-semibold text-apricot-ink tabular-nums">
                      <Pause size={16} />
                      4:12
                    </span>
                    <span className="inline-flex h-9 items-center gap-2 rounded-full bg-moss-soft px-3 text-sm font-semibold text-moss-ink">
                      <CheckCircle size={16} />
                      {t('assistant.step')}
                    </span>
                  </div>
                )}
              </div>
            </motion.li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
