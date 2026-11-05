import { useTranslation } from 'react-i18next'
import type { Lang } from '@/api/types'

export function useLang(): Lang {
  const { i18n } = useTranslation()
  return (['fr', 'en', 'ar'].includes(i18n.language) ? i18n.language : 'fr') as Lang
}
