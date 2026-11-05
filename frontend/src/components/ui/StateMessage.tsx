import { cn } from '@/lib/cn'

const tones = {
  apricot: 'bg-apricot-soft text-apricot-ink',
  danger: 'bg-danger-soft text-danger',
  moss: 'bg-moss-soft text-moss-ink',
}

export function StateMessage({
  icon,
  title,
  body,
  action,
  tone = 'apricot',
  className,
}: {
  icon: React.ReactNode
  title: string
  body?: string
  action?: React.ReactNode
  tone?: keyof typeof tones
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center md:py-14',
        className,
      )}
      role="status"
    >
      <span className={cn('grid size-16 place-items-center rounded-full [&_svg]:size-7', tones[tone])}>{icon}</span>
      <h2 className="text-[22px] leading-7 font-semibold">{title}</h2>
      {body && <p className="max-w-md text-ink-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
