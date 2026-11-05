import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { RootLayout } from '@/components/layout/RootLayout'
import Landing from '@/pages/Landing'
import NotFound from '@/pages/NotFound'

// Pages other than the landing are loaded on demand to keep the first load light.
const page = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({ Component: (await load()).default })

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/go', lazy: page(() => import('@/pages/Go')) },
      { path: '/explore', lazy: page(() => import('@/pages/Explore')) },
      { path: '/recipes/:slug', lazy: page(() => import('@/pages/RecipeDetail')) },
      { path: '/favorites', lazy: page(() => import('@/pages/Favorites')) },
      { path: '/planner', lazy: page(() => import('@/pages/Planner')) },
      { path: '/shopping', lazy: page(() => import('@/pages/Shopping')) },
      { path: '/assistant', lazy: page(() => import('@/pages/Assistant')) },
      { path: '/fridge', lazy: page(() => import('@/pages/Fridge')) },
      { path: '/account', lazy: page(() => import('@/pages/Account')) },
      { path: '/about', lazy: async () => ({ Component: (await import('@/pages/Legal')).About }) },
      { path: '/privacy', lazy: async () => ({ Component: (await import('@/pages/Legal')).Privacy }) },
      { path: '/terms', lazy: async () => ({ Component: (await import('@/pages/Legal')).Terms }) },
      { path: '/login', lazy: page(() => import('@/pages/auth/Login')) },
      { path: '/register', lazy: page(() => import('@/pages/auth/Register')) },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
