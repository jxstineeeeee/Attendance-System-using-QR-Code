import { useState, type FormEvent } from 'react'
import { signIn, type Operator } from '../lib/gate'
import { Button, Card, Field, Input } from '../components/ui'

/**
 * The operator signs the device in. Scans are stamped with whoever is holding
 * it, so this is not optional — but it happens once at the start of a shift.
 */
export function SignIn({
  onSignedIn,
  otherRole,
}: {
  onSignedIn: (op: Operator) => void
  /** A session for another app already in this browser, if there is one. */
  otherRole?: string | null
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      onSignedIn(await signIn(email, password))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink p-6">
      <Card className="flex w-[420px] max-w-full flex-col gap-6 p-8">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold tracking-[0.18em] text-brand uppercase">
            QR Attendance
          </span>
          <h1 className="display-title text-[38px] leading-none text-ink">
            Gate scanner
          </h1>
          <p className="text-[15px] text-muted">
            Sign in with the scanner account for this shift.
          </p>
        </div>

        {otherRole && (
          <p className="rounded-xl bg-late-soft px-4 py-3 text-[14px] leading-snug text-late">
            This browser is signed in as a <strong>{otherRole}</strong>. The two
            apps share one session on localhost, so signing in here will sign
            that account out.
          </p>
        )}

        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-bad-soft px-4 py-3 text-[15px] leading-snug text-bad"
            >
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" block disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
