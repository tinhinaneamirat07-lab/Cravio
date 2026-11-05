import type { Icon } from '@phosphor-icons/react'
import type { PlaceCategory } from '@/api/types'
import {
  Bank,
  Bed,
  Car,
  Coffee,
  FilmSlate,
  ForkKnife,
  ShoppingBag,
  Ticket,
  Tree,
  Waves,
} from '@/components/ui/icons'

/** The chips shown on the Sortir page, in this order (parking stays on the map only). */
export const CATEGORIES: PlaceCategory[] = [
  'cafe', 'restaurant', 'beach', 'park', 'attraction', 'activity', 'cinema', 'shopping', 'hotel',
]

export const CATEGORY_ICON: Record<PlaceCategory, Icon> = {
  cafe: Coffee,
  restaurant: ForkKnife,
  cinema: FilmSlate,
  shopping: ShoppingBag,
  park: Tree,
  activity: Ticket,
  hotel: Bed,
  beach: Waves,
  attraction: Bank,
  parking: Car,
}

/** Eating and drinking take the cooking color (rust); everything else the going-out color (sage). */
export function isFood(category: string) {
  return category === 'cafe' || category === 'restaurant'
}

export function iconOf(category: string): Icon {
  return CATEGORY_ICON[category as PlaceCategory] ?? Ticket
}
