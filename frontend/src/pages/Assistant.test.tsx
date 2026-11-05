import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { RecipeSummary } from '@/api/types'
import { plainText } from '@/features/assistant/text'
import { mockApi, renderPage, setSessionHint } from '@/test/utils'
import Assistant from './Assistant'

const me = { id: 1, name: 'Tina', email: 'tina@example.com', role: 'user', locale: 'fr', created_at: '2026-09-01T00:00:00Z' }
const chorba: RecipeSummary = {
  slug: 'chorba-frik',
  title: { fr: 'Chorba frik', en: 'Chorba frik', ar: 'شوربة فريك' },
  image_url: '/img/chorba-frik.webp',
  total_minutes: 35,
  servings: 4,
  difficulty: 'easy',
  cuisine: 'maghrebi',
  category: 'soup',
  origin: null,
  diets: [],
}

beforeEach(() => {
  try {
    sessionStorage.clear()
  } catch {
    /* ignore */
  }
})
afterEach(() => setSessionHint(false))

describe('plainText', () => {
  it('replaces recipe markers with names and drops list dashes', () => {
    expect(plainText('Essaie [[chorba-frik]].\n- vite', [chorba], 'fr')).toBe('Essaie Chorba frik.\nvite')
  })
})

describe('Assistant page', () => {
  it('asks visitors to log in', async () => {
    mockApi({ 'GET /api/v1/assistant/status': () => ({ available: true }) })
    await renderPage(<Assistant />, { path: '/assistant' })
    expect(await screen.findByText('Connecte-toi pour parler à Cravio')).toBeInTheDocument()
  })

  it('sends a suggestion and shows the reply with recipe links and actions', async () => {
    setSessionHint(true)
    const calls = mockApi({
      'GET /api/v1/auth/me': () => me,
      'GET /api/v1/assistant/status': () => ({ available: true }),
      'POST /api/v1/assistant/chat': () => ({
        reply: 'Je te propose [[chorba-frik]].\n- Prête en 35 min',
        recipes: [chorba],
        actions: [{ type: 'planner_add', slug: 'chorba-frik', day: '2026-11-02', slot: 'dinner', servings: 4 }],
      }),
    })
    const user = userEvent.setup()
    await renderPage(<Assistant />, { path: '/assistant' })

    await user.click(await screen.findByRole('button', { name: 'Une soupe végétarienne ?' }))

    expect(await screen.findByText('Prête en 35 min')).toBeInTheDocument()
    const links = screen.getAllByRole('link', { name: /Chorba frik/ })
    expect(links[0]).toHaveAttribute('href', '/recipes/chorba-frik')
    expect(screen.getByRole('link', { name: /Ajouté au planner : Chorba frik/ })).toHaveAttribute('href', '/planner')

    const sent = calls.find((c) => c.method === 'POST')!.body as { messages: unknown[]; lang: string }
    expect(sent.messages).toEqual([{ role: 'user', content: 'Une soupe végétarienne ?' }])
    expect(sent.lang).toBe('fr')
  })

  it('explains when the assistant is not configured', async () => {
    setSessionHint(true)
    mockApi({ 'GET /api/v1/auth/me': () => me, 'GET /api/v1/assistant/status': () => ({ available: false }) })
    await renderPage(<Assistant />, { path: '/assistant' })
    expect(await screen.findByText('L’assistant n’est pas encore configuré sur ce serveur.')).toBeInTheDocument()
    expect(screen.getByLabelText('Message pour Cravio')).toBeDisabled()
  })

  it('shows a busy message and retries without repeating the question', async () => {
    setSessionHint(true)
    let fail = true
    const calls = mockApi({
      'GET /api/v1/auth/me': () => me,
      'GET /api/v1/assistant/status': () => ({ available: true }),
      'POST /api/v1/assistant/chat': () => {
        if (fail) {
          fail = false
          return new Response(JSON.stringify({ detail: 'assistant_busy' }), { status: 503 })
        }
        return { reply: 'Voilà !', recipes: [], actions: [] }
      },
    })
    const user = userEvent.setup()
    await renderPage(<Assistant />, { path: '/assistant' })
    await user.type(await screen.findByLabelText('Message pour Cravio'), 'Salut{Enter}')
    expect(await screen.findByText('L’assistant est très demandé. Réessaie dans un instant.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(await screen.findByText('Voilà !')).toBeInTheDocument()
    await waitFor(() => {
      const last = calls.filter((c) => c.method === 'POST').at(-1)!.body as { messages: unknown[] }
      expect(last.messages).toEqual([{ role: 'user', content: 'Salut' }])
    })
  })
})
