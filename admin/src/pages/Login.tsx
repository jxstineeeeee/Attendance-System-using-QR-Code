import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { SCHOOL } from '../lib/mock'
import { Button, Field, Input, Label } from '../components/ui'

export function Login() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // No auth yet — the frontend hands off straight to the dashboard.
    navigate('/dashboard')
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
              {SCHOOL.name}
            </span>
            <span className="text-base text-brand-tint">{SCHOOL.address}</span>
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
            calendar for school year {SCHOOL.schoolYear}.
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

          <Field label="Username or email" htmlFor="username">
            <Input
              id="username"
              name="username"
              autoComplete="username"
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

          <Button type="submit" variant="primary" size="lg" block>
            Sign in
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

          <a
            href="#"
            className="text-center text-sm font-semibold text-brand hover:underline"
          >
            ← Back to the Registrar sign in
          </a>
        </form>
      </div>
    </div>
  )
}
