import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Warning } from '@/components/ui/icons'
import { useLogin } from '@/features/auth/queries'
import { AuthLayout } from './AuthLayout'
import { authErrorKey, EMAIL_RE, safeNext } from './authErrors'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const found = {
      email: !email.trim() ? t('auth.errors.required') : !EMAIL_RE.test(email.trim()) ? t('auth.errors.email') : undefined,
      password: !password ? t('auth.errors.required') : undefined,
    }
    setErrors(found)
    if (found.email || found.password) return
    login.mutate({ email: email.trim(), password }, { onSuccess: () => navigate(next, { replace: true }) })
  }

  return (
    <AuthLayout title={t('auth.loginTitle')} body={t('auth.loginBody')}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {login.isError && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft p-4 text-sm font-medium text-danger">
            <Warning size={18} weight="bold" className="mt-px shrink-0" />
            {t(authErrorKey(login.error))}
          </p>
        )}
        <Field
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Field
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <Button type="submit" size="lg" disabled={login.isPending} className="mt-2 w-full">
          {t('auth.submitLogin')}
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-muted">
        {t('auth.noAccount')}{' '}
        <Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-medium text-link hover:underline">
          {t('auth.toRegister')}
        </Link>
      </p>
    </AuthLayout>
  )
}
