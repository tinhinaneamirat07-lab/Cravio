import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeSlash, Warning } from '@/components/ui/icons'
import { cn } from '@/lib/cn'

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
}

export function Field({ label, hint, error, className, type = 'text', ...input }: FieldProps) {
  const { t } = useTranslation()
  const id = useId()
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-[15px] font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-12 w-full rounded-xl border bg-surface px-4 text-base text-ink placeholder:text-ink-muted transition-colors',
            'focus:border-focus',
            error ? 'border-2 border-danger' : 'border-line-strong',
            isPassword && 'pe-12',
          )}
          {...input}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? t('auth.hide') : t('auth.show')}
            className="absolute inset-y-0 end-0 grid w-12 place-items-center text-ink-muted hover:text-ink"
          >
            {visible ? <EyeSlash size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-sm font-medium text-danger">
          <Warning size={18} weight="bold" className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
