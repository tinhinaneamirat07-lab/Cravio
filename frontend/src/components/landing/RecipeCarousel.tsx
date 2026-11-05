import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { RecipeCard } from '@/components/RecipeCard'
import { Container } from '@/components/ui/Container'
import { CaretLeft, CaretRight } from '@/components/ui/icons'
import { Reveal } from '@/components/ui/Reveal'
import { fallbackRecipes } from '@/data/recipes'
import { useFeaturedRecipes } from '@/features/recipes/queries'

export function RecipeCarousel() {
  const { t, i18n } = useTranslation()
  const track = useRef<HTMLUListElement>(null)
  const rtl = i18n.dir() === 'rtl'
  const { data } = useFeaturedRecipes()
  // Landing page still works when the API is offline (e.g. a static preview).
  const recipes = data?.items.length ? data.items : fallbackRecipes

  const scroll = (direction: 1 | -1) => {
    const el = track.current
    if (!el) return
    el.scrollBy({ left: direction * (rtl ? -1 : 1) * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  const arrowBtn =
    'grid size-11 place-items-center rounded-full border border-line-strong bg-surface transition-colors hover:bg-surface-sunken active:scale-[0.97]'

  return (
    <section className="py-20 md:py-24">
      <Container>
        <Reveal className="flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow text-brand">{t('recipes.eyebrow')}</p>
            <h2 className="mt-2 text-4xl font-semibold md:text-[2.75rem]">{t('recipes.title')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/explore"
              className="me-3 hidden min-h-11 items-center text-[15px] font-medium text-link hover:underline sm:inline-flex"
            >
              {t('recipes.all')}
            </Link>
            <button type="button" aria-label={t('recipes.previous')} onClick={() => scroll(-1)} className={arrowBtn}>
              <CaretLeft size={20} className="rtl:-scale-x-100" />
            </button>
            <button type="button" aria-label={t('recipes.next')} onClick={() => scroll(1)} className={arrowBtn}>
              <CaretRight size={20} className="rtl:-scale-x-100" />
            </button>
          </div>
        </Reveal>
      </Container>

      <ul
        ref={track}
        className="no-scrollbar mx-auto mt-10 flex max-w-7xl snap-x snap-mandatory gap-6 overflow-x-auto scroll-px-4 px-4 pb-2 sm:scroll-px-6 sm:px-6 lg:scroll-px-12 lg:px-12"
      >
        {recipes.map((r) => (
          <li key={r.slug} className="w-64 shrink-0 snap-start sm:w-[16.5rem]">
            <RecipeCard recipe={r} />
          </li>
        ))}
      </ul>
    </section>
  )
}
