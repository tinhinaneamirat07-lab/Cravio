import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from '@/components/ui/icons'
import { cn } from '@/lib/cn'

/** Native <dialog>: focus trap, Escape to close and an accessible modal role for free. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className={cn(
        'm-auto w-[calc(100%-2rem)] max-w-lg rounded-[28px] bg-surface p-0 text-ink shadow-lg backdrop:bg-overlay',
        className,
      )}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-2">
            <h2 className="text-2xl font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('planner.close')}
              className="grid size-11 place-items-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
          <div className="overflow-y-auto px-6 pt-2 pb-6">{children}</div>
        </div>
      )}
    </dialog>
  )
}
