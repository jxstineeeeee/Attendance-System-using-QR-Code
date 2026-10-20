import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { SCHOOL } from '../lib/types'
import { useAuth } from '../lib/auth'
import { Button, Field, Input, Label } from '../components/ui'
import { FormError } from '../components/states'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading, signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Where the user was headed before RequireAuth bounced them here.
  const from = (location.state as { from?: string } | null)?.from ?? '/students'

  if (!loading && user) return <Navigate to={from} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(
        err instanceof Error && err.message.toLowerCase().includes('credentials')
          ? 'That email and password do not match an account.'
          : err instanceof Error
            ? err.message
            : 'Sign in failed.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-stretch bg-cream">
      <div className="hidden w-[620px] shrink-0 flex-col justify-between bg-brand p-16 lg:flex">
        <div className="flex items-center gap-4">
          <div className="display-title flex size-16 shrink-0 items-center justify-center rounded-full bg-white text-base text-brand">
            LOGO
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="display-title text-[28px] text-white">
              {SCHOOL.name}
            </span>
            <span className="text-base text-brand-tint">{SCHOOL.address}</span>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <h1 className="display-title text-[72px] leading-[0.95] text-white">
            QR Attendance
            <br />
            System
          </h1>
          <p className="w-[420px] text-xl leading-[1.45] text-brand-pale">
            Student registration, ID printing, and gate time-in / time-out in
            one place.
          </p>
        </div>

        <div className="h-1.5 w-30 bg-gold" />
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <form
          onSubmit={handleSubmit}
          className="flex w-[440px] max-w-full flex-col gap-[22px] rounded-2xl border border-line bg-white p-11"
        >
          <div className="flex flex-col gap-1.5">
            <h2 className="display-title text-[40px] leading-none text-ink">
              Registrar sign in
            </h2>
            <p className="text-base text-muted">
              Use the account given by your administrator.
            </p>
          </div>

          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <a
                href="#"
                className="text-sm font-semibold text-brand hover:underline"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute top-1/2 right-3.5 -translate-y-1/2 cursor-pointer text-muted hover:text-ink"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && <FormError message={error} />}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            disabled={submitting}
          >
            {submitting && (
              <Loader2 size={20} className="animate-spin" strokeWidth={2.2} />
            )}
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>

          <a
            href="#"
            className="rounded-lg bg-cream px-3.5 py-3 text-center text-sm font-semibold text-brand hover:bg-brand-soft"
          >
            Administrator? Sign in to the Admin Console →
          </a>
        </form>
      </div>
    </div>
  )
}
