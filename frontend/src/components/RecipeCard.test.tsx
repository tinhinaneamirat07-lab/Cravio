import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { RecipeSummary } from '@/api/types'
import { renderPage } from '@/test/utils'
import { RecipeCard } from './RecipeCard'

const recipe: RecipeSummary = {
  slug: 'chorba-frik',
  title: { fr: 'Chorba frik', en: 'Chorba frik', ar: 'شوربة فريك' },
  image_url: '/img/chorba-frik.webp',
  total_minutes: 35,
  servings: 4,
  difficulty: 'easy',
  cuisine: 'maghrebi',
  category: 'soup',
  origin: null,
  diets: ['halal'],
}

describe('RecipeCard', () => {
  it('links to the recipe and shows time and difficulty', async () => {
    await renderPage(<RecipeCard recipe={recipe} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/recipes/chorba-frik')
    expect(screen.getByText('35 min')).toBeInTheDocument()
    expect(screen.getByText('Facile')).toBeInTheDocument()
  })

  it('shows the Arabic title in Arabic', async () => {
    await renderPage(<RecipeCard recipe={recipe} />, { lang: 'ar' })
    expect(screen.getByRole('heading', { name: 'شوربة فريك' })).toHaveAttribute('lang', 'ar')
  })

  it('marks an English fallback title with lang="en"', async () => {
    await renderPage(<RecipeCard recipe={{ ...recipe, title: { en: 'Beef stew' }, difficulty: null, origin: 'Irish' }} />, {
      lang: 'ar',
    })
    expect(screen.getByRole('heading', { name: 'Beef stew' })).toHaveAttribute('lang', 'en')
    expect(screen.getByText('إيرلندية')).toBeInTheDocument()
  })
})
