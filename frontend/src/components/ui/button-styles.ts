import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'inverse' | 'onDark'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,color,transform,box-shadow] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:border-line disabled:bg-surface-sunken disabled:text-ink-muted disabled:shadow-none'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary shadow-sm hover:bg-primary-hover hover:shadow-md',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-surface-sunken',
  ghost: 'text-ink hover:bg-surface-sunken',
  soft: 'bg-primary-soft text-link hover:bg-primary-soft/70',
  inverse: 'bg-on-brand text-brand-deep hover:opacity-90',
  onDark: 'border border-on-brand-muted text-on-brand hover:bg-on-brand/10',
}

const sizes: Record<Size, string> = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-13 px-7 text-base',
}

export type Common = { variant?: Variant; size?: Size; className?: string }

export function buttonClass({ variant = 'primary', size = 'md', className }: Common = {}) {
  return cn(base, variants[variant], sizes[size], className)
}

