import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { RecipeCard, RecipeCardSkeleton } from '@/components/RecipeCard'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Heart, Warning } from '@/components/ui/icons'
import { StateMessage } from '@/components/ui/StateMessage'
import { ServerDown } from '@/components/ServerDown'
import { useMe } from '@/features/auth/queries'
import { useFavorites } from '@/features/recipes/queries'

export default function Favorites() {
  const { t } = useTranslation()
  const me = useMe()
  const favorites = useFavorites(Boolean(me.data))

  if (me.isSuccess && !me.data) return <Navigate to="/login?next=%2Ffavorites" replace />
  if (me.isError) return <ServerDown onRetry={() => me.refetch()} />

  return (
    <Container className="py-10 md:py-14">
      <h1 className="text-3xl font-semibold md:text-4xl">{t('favorites.title')}</h1>
      <div className="mt-8">
        {me.isPending || favorites.isPending ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {Array.from({ length: 4 }, (_, i) => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
        ) : favorites.isError ? (
          <StateMessage tone="danger" icon={<Warning size={24} />} title={t('explore.errorTitle')} body={t('explore.errorBody')} />
        ) : favorites.data.length === 0 ? (
          <StateMessage
            icon={<Heart size={24} />}
            title={t('favorites.emptyTitle')}
            body={t('favorites.emptyBody')}
            action={<ButtonLink to="/explore">{t('favorites.browse')}</ButtonLink>}
          />
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {favorites.data.map((r) => (
              <li key={r.slug}>
                <RecipeCard recipe={r} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  )
}
