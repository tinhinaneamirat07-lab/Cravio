import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Warning } from '@/components/ui/icons'
import { useRegister } from '@/features/auth/queries'
import { useLang } from '@/hooks/useLocalized'
import { AuthLayout } from './AuthLayout'
import { authErrorKey, EMAIL_RE, safeNext } from './authErrors'

type Errors = { name?: string; email?: string; password?: string }

export default function Register() {
  const { t } = useTranslation()
  const lang = useLang()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const register = useRegister()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<Errors>({})

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const found: Errors = {
      name: !form.name.trim() ? t('auth.errors.required') : undefined,
      email: !form.email.trim()
        ? t('auth.errors.required')
        : !EMAIL_RE.test(form.email.trim())
          ? t('auth.errors.email')
          : undefined,
      password: form.password.length < 8 ? t('auth.errors.passwordShort') : undefined,
    }
    setErrors(found)
    if (found.name || found.email || found.password) return
    register.mutate(
      { name: form.name.trim(), email: form.email.trim(), password: form.password, locale: lang },
      { onSuccess: () => navigate(next, { replace: true }) },
    )
  }

  return (
    <AuthLayout title={t('auth.registerTitle')} body={t('auth.registerBody')}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {register.isError && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft p-4 text-sm font-medium text-danger">
            <Warning size={18} weight="bold" className="mt-px shrink-0" />
            {t(authErrorKey(register.error))}
          </p>
        )}
        <Field label={t('auth.name')} autoComplete="given-name" value={form.name} onChange={set('name')} error={errors.name} />
        <Field
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
        />
        <Field
          label={t('auth.password')}
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          hint={t('auth.passwordHint')}
          error={errors.password}
        />
        <Button type="submit" size="lg" disabled={register.isPending} className="mt-2 w-full">
          {t('auth.submitRegister')}
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-muted">
        {t('auth.hasAccount')}{' '}
        <Link to={`/login${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-medium text-link hover:underline">
          {t('auth.toLogin')}
        </Link>
      </p>
    </AuthLayout>
  )
}
