import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import i18n from '@/i18n'

type Handler = (url: string, init?: RequestInit) => unknown

/** Replace fetch with a tiny router: each handler returns JSON, or a Response for full control. */
export function mockApi(routes: Record<string, Handler>) {
  const calls: { method: string; url: string; body?: unknown }[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : undefined })
    const key = Object.keys(routes).find((k) => {
      const [m, path] = k.split(' ')
      return m === method && url.split('?')[0].endsWith(path)
    })
    if (!key) return new Response(JSON.stringify({ detail: 'Not found' }), { status: 404 })
    const result = routes[key](url, init)
    if (result instanceof Response) return result
    return new Response(result === undefined ? null : JSON.stringify(result), { status: result === undefined ? 204 : 200 })
  }) as typeof fetch
  return calls
}

export function setSessionHint(on: boolean) {
  document.cookie = on ? 'cravio_logged_in=1; path=/' : 'cravio_logged_in=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
}

export async function renderPage(ui: React.ReactNode, { path = '/', lang = 'fr' } = {}) {
  await i18n.changeLanguage(lang)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="*" element={ui} />
          <Route path="/login" element={<p>login page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
