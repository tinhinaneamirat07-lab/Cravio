import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { ShoppingItem } from '@/api/types'
import { mockApi, renderPage, setSessionHint } from '@/test/utils'
import Shopping from './Shopping'

const me = { id: 1, name: 'Tina', email: 'tina@example.com', role: 'user', preferred_lang: 'fr' }

function item(id: number, name: string, aisle: ShoppingItem['aisle'], extra: Partial<ShoppingItem> = {}): ShoppingItem {
  return { id, name: { fr: name, en: name }, quantity: null, unit: null, aisle, checked: false, source: 'plan', ...extra }
}

afterEach(() => setSessionHint(false))

describe('Shopping page', () => {
  it('sends visitors to the login page', async () => {
    mockApi({})
    await renderPage(<Shopping />, { path: '/shopping' })
    expect(await screen.findByText('login page')).toBeInTheDocument()
  })

  it('groups items by aisle and counts what is left to buy', async () => {
    setSessionHint(true)
    mockApi({
      'GET /api/v1/auth/me': () => me,
      'GET /api/v1/shopping-list': () => [
        item(1, 'Oignon', 'produce', { quantity: 2, unit: 'piece' }),
        item(2, 'Blanc de poulet', 'meat', { quantity: 600, unit: 'g' }),
        item(3, 'Tomates', 'produce', { checked: true }),
      ],
    })
    await renderPage(<Shopping />, { path: '/shopping' })

    const produce = (await screen.findByRole('heading', { name: /Fruits et légumes/ })).closest('section')!
    expect(within(produce).getAllByRole('checkbox')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: /Viandes et poissons/ })).toBeInTheDocument()
    expect(screen.getByText('600 g')).toBeInTheDocument()
    expect(screen.getByText('2 articles à acheter')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retirer les articles cochés' })).toBeInTheDocument()
  })

  it('checks an item and adds a manual one', async () => {
    setSessionHint(true)
    const calls = mockApi({
      'GET /api/v1/auth/me': () => me,
      'GET /api/v1/shopping-list': () => [item(1, 'Oignon', 'produce')],
      'PATCH /api/v1/shopping-list/1': () => item(1, 'Oignon', 'produce', { checked: true }),
      'POST /api/v1/shopping-list': () => ({ ...item(2, '', 'bakery', { source: 'manual' }), name: { custom: 'Pain' } }),
    })
    const user = userEvent.setup()
    await renderPage(<Shopping />, { path: '/shopping' })

    await user.click(await screen.findByRole('checkbox', { name: /Oignon/ }))
    await waitFor(() => expect(calls).toContainEqual(expect.objectContaining({ method: 'PATCH', body: { checked: true } })))

    await user.type(screen.getByLabelText('Ajouter un article'), 'Pain')
    await user.click(screen.getByRole('button', { name: 'Ajouter' }))
    await waitFor(() =>
      expect(calls).toContainEqual(expect.objectContaining({ method: 'POST', body: { name: 'Pain' } })),
    )
    await waitFor(() => expect(screen.getByLabelText('Ajouter un article')).toHaveValue(''))
  })

  it('shows the empty state with a link to the planner', async () => {
    setSessionHint(true)
    mockApi({ 'GET /api/v1/auth/me': () => me, 'GET /api/v1/shopping-list': () => [] })
    await renderPage(<Shopping />, { path: '/shopping' })
    expect(await screen.findByText('Ta liste est vide.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Aller au planner' })).toHaveAttribute('href', '/planner')
  })
})
