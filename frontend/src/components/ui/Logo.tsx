import { Link } from 'react-router-dom'

import { cn } from '@/lib/cn'

/** Rounded square in `logo` (beetroot, fig in dark), a C in the page color, a blueberry dot. */
export function LogoMark({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" className={onDark ? 'fill-copper' : 'fill-logo'} />
      <path
        d="M21.5 10.6A7.5 7.5 0 1 0 21.5 21.4"
        fill="none"
        className={onDark ? 'stroke-on-brand' : 'stroke-bg'}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24.5" cy="7.5" r="2.5" className="fill-apricot" />
    </svg>
  )
}

export function Logo({ onDark = false }: { onDark?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Cravio">
      <LogoMark onDark={onDark} />
      <span className="font-display text-2xl font-semibold tracking-tight" dir="ltr">
        Cravio
      </span>
    </Link>
  )
}
