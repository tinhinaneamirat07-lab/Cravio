import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '@/api/client'
import type { Lang } from '@/api/types'
import { ServerDown } from '@/components/ServerDown'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Field } from '@/components/ui/Field'
import { CheckCircle, Trash, Warning } from '@/components/ui/icons'
import { useChangePassword, useDeleteAccount, useUpdateProfile } from '@/features/account/queries'
import { useMe } from '@/features/auth/queries'
import { useLang } from '@/hooks/useLocalized'
import { LANGUAGES } from '@/i18n'
import { cn } from '@/lib/cn'
import { formatDay } from '@/lib/dates'

function Card({ title, children, danger = false }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section
      className={cn('rounded-[28px] border bg-surface p-6 shadow-sm md:p-8', danger ? 'border-danger/40' : 'border-line')}
    >
      <h2 className={cn('text-2xl font-semibold', danger && 'text-danger')}>{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Notice({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p
      role={ok ? 'status' : 'alert'}
      className={cn('flex items-center gap-2 text-sm font-medium', ok ? 'text-moss-ink' : 'text-danger')}
    >
      {ok ? <CheckCircle size={18} /> : <Warning size={18} />}
      {children}
    </p>
  )
}

export default function Account() {
  const { t, i18n } = useTranslation()
  const lang = useLang()
  const me = useMe()
  const navigate = useNavigate()
  const update = useUpdateProfile()
  const password = useChangePassword()
  const remove = useDeleteAccount()
  const [name, setName] = useState<string | null>(null)
  const [locale, setLocale] = useState<Lang | null>(null)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')

  if (me.isError) return <ServerDown onRetry={() => me.refetch()} />
  if (me.isSuccess && !me.data) return <Navigate to="/login?next=%2Faccount" replace />
  if (!me.data) return <Container className="py-14" aria-busy="true" />

  const user = me.data
  const nameValue = name ?? user.name
  const localeValue = locale ?? user.locale
  const dirty = nameValue.trim() !== user.name || localeValue !== user.locale

  return (
    <Container className="max-w-3xl space-y-6 py-10 md:py-14">
      <div className="flex items-center gap-4">
        <span className="grid size-16 place-items-center rounded-full bg-brand-deep text-2xl font-semibold text-on-brand">
          {user.name.trim().charAt(0).toUpperCase()}
        </span>
        <div>
          <h1 className="text-3xl font-semibold md:text-4xl">{t('accountPage.title')}</h1>
          <p className="text-ink-muted">
            {t('accountPage.memberSince', {
              date: formatDay(new Date(user.created_at), lang, { day: 'numeric', month: 'long', year: 'numeric' }),
            })}
          </p>
        </div>
      </div>

      <Card title={t('accountPage.profile')}>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            update.mutate(
              { name: nameValue.trim(), locale: localeValue },
              {
                onSuccess: (u) => {
                  setName(null)
                  setLocale(null)
                  i18n.changeLanguage(u.locale)
                },
              },
            )
          }}
        >
          <Field label={t('accountPage.name')} value={nameValue} onChange={(e) => setName(e.target.value)} maxLength={120} required />
          <Field label={t('accountPage.email')} value={user.email} readOnly disabled />
          <fieldset>
            <legend className="mb-2 text-[15px] font-medium">{t('accountPage.language')}</legend>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  lang={l.code}
                  aria-pressed={localeValue === l.code}
                  onClick={() => setLocale(l.code)}
                  className={cn(
                    'h-11 rounded-full border px-5 text-[15px] font-medium',
                    localeValue === l.code ? 'border-primary bg-primary text-on-primary' : 'border-line-strong bg-surface hover:bg-surface-sunken',
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" disabled={!dirty || !nameValue.trim() || update.isPending}>
              {t('accountPage.save')}
            </Button>
            {update.isSuccess && !dirty && <Notice ok>{t('accountPage.saved')}</Notice>}
            {update.isError && <Notice ok={false}>{t('accountPage.error')}</Notice>}
          </div>
        </form>
      </Card>

      <Card title={t('accountPage.password')}>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            password.mutate(
              { current_password: current, new_password: next },
              {
                onSuccess: () => {
                  setCurrent('')
                  setNext('')
                },
              },
            )
          }}
        >
          <Field
            label={t('accountPage.current')}
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
          <Field
            label={t('accountPage.new')}
            type="password"
            autoComplete="new-password"
            hint={t('auth.passwordHint')}
            minLength={8}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" disabled={!current || next.length < 8 || password.isPending}>
              {t('accountPage.change')}
            </Button>
            {password.isSuccess && <Notice ok>{t('accountPage.changed')}</Notice>}
            {password.isError && (
              <Notice ok={false}>
                {password.error instanceof ApiError && password.error.status === 400
                  ? t('accountPage.wrong')
                  : password.error instanceof ApiError && password.error.status === 429
                    ? t('auth.errors.tooMany')
                    : t('accountPage.error')}
              </Notice>
            )}
          </div>
        </form>
      </Card>

      <Card title={t('accountPage.danger')} danger>
        <p className="text-ink-muted">{t('accountPage.dangerBody')}</p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            remove.mutate(undefined, { onSuccess: () => navigate('/', { replace: true }) })
          }}
        >
          <Field label={t('accountPage.confirmLabel')} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          <Button
            type="submit"
            className="bg-danger text-on-primary hover:bg-danger/90"
            disabled={confirm.trim() !== t('accountPage.confirmWord') || remove.isPending}
          >
            <Trash size={18} />
            {t('accountPage.delete')}
          </Button>
          {remove.isError && <Notice ok={false}>{t('accountPage.error')}</Notice>}
        </form>
      </Card>
    </Container>
  )
}
