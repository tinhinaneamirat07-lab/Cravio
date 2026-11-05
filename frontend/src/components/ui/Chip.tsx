import { cn } from '@/lib/cn'

export function Chip({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-[18px] text-[15px] font-medium whitespace-nowrap transition-colors active:scale-[0.98]',
        active
          ? 'border-primary bg-primary text-on-primary'
          : 'border-line-strong bg-surface text-ink hover:bg-surface-sunken',
        className,
      )}
      {...props}
    />
  )
}
