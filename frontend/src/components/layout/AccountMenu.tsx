import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { ButtonLink } from '@/components/ui/Button'
import { Heart, SignOut, UserCircle } from '@/components/ui/icons'
import { useLogout, useMe } from '@/features/auth/queries'

/** Login / sign-up buttons for visitors, an account menu for signed-in users. */
export function AccountMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  const { data: user, isPending } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  if (isPending) return <div className="h-9 w-40" aria-hidden="true" />

  if (!user) {
    return (
      <div className="flex gap-2">
        <ButtonLink to="/login" variant="ghost" size="sm" onClick={onNavigate}>
          {t('nav.login')}
        </ButtonLink>
        <ButtonLink to="/register" size="sm" onClick={onNavigate}>
          {t('nav.start')}
        </ButtonLink>
      </div>
    )
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || '?'
  const itemClass = 'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] hover:bg-surface-sunken'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('account.menu')}
        className="flex items-center gap-2 rounded-full py-1 ps-1 pe-3 hover:bg-surface-sunken"
      >
        <span className="grid size-9 place-items-center rounded-full bg-brand-deep text-sm font-semibold text-on-brand">
          {initial}
        </span>
        <span className="max-w-32 truncate text-sm font-medium">{user.name}</span>
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-full z-50 mt-2 w-60 rounded-2xl border border-line bg-surface-raised p-2 shadow-md">
          <p className="truncate px-3 py-2 text-sm text-ink-muted">{user.email}</p>
          <Link
            role="menuitem"
            to="/account"
            onClick={() => {
              setOpen(false)
              onNavigate?.()
            }}
            className={itemClass}
          >
            <UserCircle size={18} />
            {t('account.menu')}
          </Link>
          <Link
            role="menuitem"
            to="/favorites"
            onClick={() => {
              setOpen(false)
              onNavigate?.()
            }}
            className={itemClass}
          >
            <Heart size={18} />
            {t('account.favorites')}
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() =>
              logout.mutate(undefined, {
                onSettled: () => {
                  setOpen(false)
                  onNavigate?.()
                  navigate('/')
                },
              })
            }
            className={itemClass}
          >
            <SignOut size={18} className="rtl:-scale-x-100" />
            {t('account.logout')}
          </button>
        </div>
      )}
    </div>
  )
}
