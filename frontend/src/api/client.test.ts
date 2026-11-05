import { afterEach, describe, expect, it } from 'vitest'
import { mockApi, setSessionHint } from '@/test/utils'
import { ApiError, api } from './client'

afterEach(() => setSessionHint(false))

describe('api client', () => {
  it('sends JSON and returns the parsed body', async () => {
    const calls = mockApi({ 'POST /api/v1/shopping-list': () => ({ id: 1 }) })
    await expect(api('/shopping-list', { method: 'POST', body: { name: 'Pain' } })).resolves.toEqual({ id: 1 })
    expect(calls[0].body).toEqual({ name: 'Pain' })
  })

  it('throws ApiError with the server detail', async () => {
    mockApi({})
    const error = (await api('/recipes/nope').catch((e: unknown) => e)) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(404)
    expect(error.message).toBe('Not found')
  })

  it('refreshes the session once on 401, then retries', async () => {
    setSessionHint(true)
    let first = true
    const calls = mockApi({
      'GET /api/v1/planner': () => {
        if (first) {
          first = false
          return new Response(JSON.stringify({ detail: 'Not authenticated' }), { status: 401 })
        }
        return []
      },
      'POST /api/v1/auth/refresh': () => ({ ok: true }),
    })
    await expect(api('/planner')).resolves.toEqual([])
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'GET /api/v1/planner',
      'POST /api/v1/auth/refresh',
      'GET /api/v1/planner',
    ])
  })

  it('does not try to refresh for visitors without a session', async () => {
    const calls = mockApi({
      'GET /api/v1/planner': () => new Response(JSON.stringify({ detail: 'Not authenticated' }), { status: 401 }),
    })
    await expect(api('/planner')).rejects.toMatchObject({ status: 401 })
    expect(calls).toHaveLength(1)
  })
})
