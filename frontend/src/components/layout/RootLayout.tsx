import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { COOK_PATHS } from '@/lib/sections'
import { BottomNav } from './BottomNav'
import { CookTabs } from './CookTabs'
import { Footer } from './Footer'
import { Navbar } from './Navbar'

export function RootLayout() {
  const { pathname } = useLocation()
  // The chat page has its own input at the bottom, so it hides the phone tab bar.
  const withTabBar = pathname !== '/assistant'
  return (
    <div className={cn('flex min-h-[100dvh] flex-col', withTabBar && 'pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0')}>
      <Navbar />
      {COOK_PATHS.includes(pathname) && <CookTabs />}
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {withTabBar && <BottomNav />}
      <ScrollRestoration />
    </div>
  )
}
