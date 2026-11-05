import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import type { RecipeSummary } from '@/api/types'
import { Heart } from '@/components/ui/icons'
import { useMe } from '@/features/auth/queries'
import { useFavorites, useToggleFavorite } from '@/features/recipes/queries'
import { cn } from '@/lib/cn'

/** Heart button for recipe cards. Visitors are sent to the login page and brought back. */
export function FavoriteHeart({ recipe, className }: { recipe: RecipeSummary; className?: string }) {
  const { t } = useTranslation()
  const { data: user } = useMe()
  const favorites = useFavorites(Boolean(user))
  const toggle = useToggleFavorite(recipe.slug, recipe)
  const navigate = useNavigate()
  const location = useLocation()
  const active = Boolean(favorites.data?.some((r) => r.slug === recipe.slug))
  const label = active ? t('recipe.unfavorite') : t('recipe.favorite')

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={user ? label : t('recipe.favoriteLogin')}
      onClick={() => {
        if (!user) {
          navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`)
          return
        }
        toggle.mutate(!active)
      }}
      className={cn(
        'grid size-11 place-items-center rounded-full bg-surface-raised text-copper shadow-md transition-transform active:scale-90',
        className,
      )}
    >
      <Heart size={22} weight={active ? 'fill' : 'regular'} />
    </button>
  )
}
