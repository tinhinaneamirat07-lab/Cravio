import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { RecipeSummary } from '@/api/types'
import { RecipeImage } from '@/components/RecipeImage'
import { Badge } from '@/components/ui/Badge'
import { ChefHat, Clock, Flag, Leaf } from '@/components/ui/icons'
import { FavoriteHeart } from '@/features/recipes/FavoriteHeart'
import { useLang } from '@/hooks/useLocalized'
import { cn } from '@/lib/cn'
import { formatMinutes, langOf, pick } from '@/lib/localize'

/** One label on the photo: where the dish comes from, else a plant-based diet. */
export function RecipeTag({ recipe }: { recipe: RecipeSummary }) {
  const { t } = useTranslation()
  if (recipe.origin) {
    return (
      <Badge tone="apricot">
        <Flag size={14} />
        {t(`origins.${recipe.origin}`, { defaultValue: recipe.origin })}
      </Badge>
    )
  }
  if (recipe.cuisine === 'maghrebi') {
    return (
      <Badge tone="apricot">
        <Flag size={14} />
        {t('cuisines.maghrebi')}
      </Badge>
    )
  }
  const diet = ['vegan', 'vegetarian'].find((d) => recipe.diets.includes(d))
  if (diet) {
    return (
      <Badge tone="moss">
        <Leaf size={14} />
        {t(`diets.${diet}`)}
      </Badge>
    )
  }
  return null
}

export function RecipeCard({ recipe, className }: { recipe: RecipeSummary; className?: string }) {
  const { t } = useTranslation()
  const lang = useLang()
  // The heart sits next to the link (not inside it): a button inside a link is invalid HTML.
  return (
    <div className={cn('relative', className)}>
      <Link to={`/recipes/${recipe.slug}`} className="group block">
        <div className="relative overflow-hidden rounded-2xl bg-surface-sunken">
          <RecipeImage
            src={recipe.image_url}
            className="aspect-[4/5] w-full transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
          <div className="absolute start-3 top-3">
            <RecipeTag recipe={recipe} />
          </div>
        </div>
        <h3 lang={langOf(recipe.title, lang)} className="mt-3 line-clamp-2 text-lg leading-snug font-semibold group-hover:text-link">
          {pick(recipe.title, lang)}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-sm text-ink-muted">
          {recipe.total_minutes != null && (
            <span className="inline-flex items-center gap-1.5">
              <Clock size={18} />
              {formatMinutes(recipe.total_minutes, lang)}
            </span>
          )}
          {recipe.difficulty && (
            <span className="inline-flex items-center gap-1.5">
              <ChefHat size={18} />
              {t(`recipes.difficulty.${recipe.difficulty}`)}
            </span>
          )}
        </div>
      </Link>
      <FavoriteHeart recipe={recipe} className="absolute end-3 top-3" />
    </div>
  )
}

export function RecipeCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="aspect-[4/5] w-full animate-pulse rounded-2xl bg-surface-sunken" />
      <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-surface-sunken" />
      <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-surface-sunken" />
    </div>
  )
}
