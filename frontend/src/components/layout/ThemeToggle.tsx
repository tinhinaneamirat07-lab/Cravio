import { Moon, Sun } from '@/components/ui/icons'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/hooks/useTheme'

export function ThemeToggle() {
  const { t } = useTranslation()
  const { theme, toggle } = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t('nav.theme')}
      className="grid size-11 place-items-center rounded-full text-ink transition-colors hover:bg-surface-sunken"
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}
