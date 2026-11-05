import type { TFunction } from 'i18next'
import { formatQuantity } from '@/lib/localize'

// Unit codes written by Cravio's own recipes; imported recipes carry free-text units instead.
export const UNIT_CODES = new Set(['g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'clove', 'bunch', 'pinch', 'piece'])

export function formatAmount(
  quantity: number | null,
  unit: string | null,
  t: TFunction,
  locale: string,
  translateUnit = true,
): string {
  if (quantity == null) return ''
  const unitLabel = unit
    ? translateUnit && UNIT_CODES.has(unit)
      ? t(`units.${unit}`, { count: Math.ceil(quantity) })
      : unit
    : ''
  return [formatQuantity(quantity, locale), unitLabel].filter(Boolean).join(' ')
}
