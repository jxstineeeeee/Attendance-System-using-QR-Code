import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useSchool } from '../lib/school'
import { ROLE_LABEL, type Role } from '../lib/types'
import { FormError } from '../components/states'
import { Button, Field, Input, Label } from '../components/ui'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading, otherRole, signIn } = useAuth()
  const school = useSchool()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // A session already in the cookie skips the form.
  useEffect(() => {
    if (!loading && user) {
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/dashboard', { replace: true })
    }
  }, [loading, user, location.state, navigate])

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    try {
      await signIn(email, password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/dashboard', { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Something went wrong signing in. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-stretch bg-cream">
      {/* Only split once there is room for the 620px panel AND the 440px form —
          at the lg breakpoint the two together overflow the viewport. */}
      <div className="hidden w-[620px] shrink-0 flex-col justify-between bg-brand p-16 xl:flex">
        <div className="flex items-center gap-4">
          <div className="display-title flex size-16 shrink-0 items-center justify-center rounded-full bg-white text-base text-brand">
            LOGO
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="display-title text-[28px] text-white">
              {school.name}
            </span>
            <span className="text-base text-brand-tint">{school.address}</span>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <span className="display-title w-fit rounded-md bg-gold px-3 py-1 text-[15px] tracking-wide text-ink uppercase">
            Admin Console
          </span>
          <h1 className="display-title text-[72px] leading-[0.95] text-white">
            QR Attendance
            <br />
            System
          </h1>
          <p className="w-[420px] text-xl leading-[1.45] text-brand-pale">
            Staff accounts, gate devices, attendance records, and the academic
            calendar.
          </p>
        </div>

        <div className="h-1.5 w-30 bg-gold" />
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center px-6 py-12">
        <form
          onSubmit={handleSubmit}
          className="flex w-[440px] max-w-full flex-col gap-[22px] rounded-2xl border border-line bg-white p-11"
        >
          <div className="flex flex-col gap-1.5">
            <h2 className="display-title text-[40px] leading-none text-ink">
              Administrator sign in
            </h2>
            <p className="text-base text-muted">
              This console manages the whole system. Sign in with your
              administrator account.
            </p>
          </div>

          {/*
            All three apps share one cookie on localhost, because a browser
            ignores the port. Say so, rather than looking signed out for no
            reason.
          */}
          {otherRole && !error && (
            <p className="rounded-lg bg-warn-bg px-3.5 py-2.5 text-[14px] leading-snug text-warn-fg">
              This browser is signed in to the{' '}
              {ROLE_LABEL[otherRole as Role] ?? otherRole} app. Signing in here
              will sign that session out.
            </p>
          )}

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
            <Label htmlFor="password">Password</Label>
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

          <Button type="submit" variant="primary" size="lg" block disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>

          <p className="flex items-start gap-2.5 rounded-lg bg-cream px-3.5 py-3 text-[13px] leading-snug text-muted">
            <ShieldCheck
              size={16}
              strokeWidth={2}
              className="mt-px shrink-0 text-brand"
            />
            Every action in this console is recorded in the audit log against
            your account.
          </p>
        </form>
      </div>
    </div>
  )
}
