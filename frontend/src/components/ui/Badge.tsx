import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'apricot' | 'moss' | 'brand' | 'photo'

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-ink',
  apricot: 'bg-apricot-soft text-apricot-ink',
  moss: 'bg-moss-soft text-moss-ink',
  brand: 'bg-brand-deep text-on-brand',
  photo: 'bg-surface-raised text-ink shadow-sm',
}

export function Badge({ className, tone = 'neutral', ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center gap-1 rounded-full px-3 text-[13px] leading-4 font-semibold whitespace-nowrap',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
