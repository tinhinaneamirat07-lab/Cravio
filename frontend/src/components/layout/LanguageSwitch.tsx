import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '@/i18n'
import { cn } from '@/lib/cn'

export function LanguageSwitch({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  const { t, i18n } = useTranslation()
  return (
    <div
      role="group"
      aria-label={t('nav.language')}
      className={cn('flex w-fit items-center rounded-full border p-0.5', onDark ? 'border-on-brand-muted' : 'border-line bg-surface-sunken', className)}
    >
      {LANGUAGES.map((l) => {
        const active = i18n.language === l.code
        return (
          <button
            key={l.code}
            type="button"
            lang={l.code}
            aria-pressed={active}
            title={l.label}
            onClick={() => i18n.changeLanguage(l.code)}
            className={cn(
              'h-10 min-w-11 rounded-full px-2 text-sm font-semibold transition-colors',
              onDark
                ? active
                  ? 'bg-on-brand text-brand-deep'
                  : 'text-on-brand hover:bg-on-brand/10'
                : active
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink',
            )}
          >
            {l.short}
          </button>
        )
      })}
    </div>
  )
}
