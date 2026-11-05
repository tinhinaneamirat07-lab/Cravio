import { createElement } from 'react'
import { iconOf } from '@/features/places/categories'

/** The icon of a place category (café cup, fork and knife, waves…). */
export function CategoryIcon({ category, size = 24 }: { category: string; size?: number }) {
  return createElement(iconOf(category), { size, 'aria-hidden': true })
}
