import { useCallback, useEffect, useRef, useState } from 'react'
import { beepAccepted, beepLate, beepRejected } from '../lib/beep'
import {
  clockTime,
  gateHours,
  sendScan,
  type CurrentWindow,
  type Device,
  type GateHours,
  type Operator,
  type ScanResult,
} from '../lib/gate'
import { useQrScanner } from '../lib/useQrScanner'
import { Button, Card, Field, Input } from '../components/ui'
import { ScanResultPanel } from '../components/ScanResult'

/**
 * How long a verdict holds the screen before it dims, and how long the same
 * code is ignored for. The verdict is never cleared outright: a guard who
 * looks away should still be able to see what the last learner got, and a
 * dimmed panel labelled "previous scan" cannot be mistaken for the one in
 * front of them.
 */
const HOLD_MS = 3200
const REPEAT_MS = 5000

export function Gate({
  operator,
  device,
  onChangeDevice,
  onSignOut,
}: {
  operator: Operator
  device: Device
  onChangeDevice: () => void
  onSignOut: () => void
}) {
  const [result, setResult] = useState<ScanResult | null>(null)
  const [stale, setStale] = useState(false)
  const [recent, setRecent] = useState<ScanResult[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [manual, setManual] = useState('')
  const [hours, setHours] = useState<GateHours | null>(null)
  const [current, setCurrent] = useState<CurrentWindow | null>(null)

  // A code sits in front of the lens for many frames; take it once.
  const lastRef = useRef<{ text: string; at: number }>({ text: '', at: 0 })
  const holdRef = useRef<number | null>(null)

  // The window moves through the day, so re-ask every minute rather than
  // leaving the header claiming the morning at four in the afternoon.
  useEffect(() => {
    let cancelled = false

    const load = () =>
      gateHours()
        .then((res) => {
          if (cancelled) return
          setHours(res.gate)
          setCurrent(res.current)
        })
        .catch(() => {
          if (!cancelled) setHours(null)
        })

    void load()
    const timer = window.setInterval(() => void load(), 60_000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  useEffect(
    () => () => {
      if (holdRef.current) window.clearTimeout(holdRef.current)
    },
    [],
  )

  const submit = useCallback(
    async (text: string) => {
      const now = Date.now()
      if (
        busy ||
        (text === lastRef.current.text && now - lastRef.current.at < REPEAT_MS)
      ) {
        return
      }
      lastRef.current = { text, at: now }

      setBusy(true)
      setError('')
      try {
        const res = await sendScan(text, device.code, crypto.randomUUID())
        setResult(res)
        setStale(false)
        setRecent((prev) => [res, ...prev].slice(0, 6))

        if (res.outcome === 'ok') beepAccepted()
        else if (res.outcome === 'late') beepLate()
        else beepRejected()

        if (holdRef.current) window.clearTimeout(holdRef.current)
        holdRef.current = window.setTimeout(() => setStale(true), HOLD_MS)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'That scan failed.')
        beepRejected()
      } finally {
        setBusy(false)
      }
    },
    [busy, device.code],
  )

  // Scanning resumes as soon as the verdict dims; a held result must not
  // stop the next learner from being read.
  const { videoRef, status, error: cameraError, start, stop, decodeFile } =
    useQrScanner({ onCode: submit, paused: (result !== null && !stale) || busy })

  async function onFile(file: File | undefined) {
    if (!file) return
    setError('')
    try {
      const text = await decodeFile(file)
      if (!text) {
        setError('No QR code could be read in that image.')
        return
      }
      // A deliberate upload should always go through, even twice in a row.
      lastRef.current = { text: '', at: 0 }
      await submit(text)
    } catch {
      setError('That file could not be read as an image.')
    }
  }

  return (
    <div className="min-h-screen bg-ink">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
        <div className="flex flex-col">
          <span className="display-title text-[22px] leading-tight text-white">
            {device.name}
          </span>
          <span className="text-[14px] text-white/60">
            {device.location ?? device.code} · {operator.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onChangeDevice}>
            Change scanner
          </Button>
          <Button variant="ghost" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1100px] gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              muted
              playsInline
              className="size-full object-cover"
            />

            {/* The aiming frame; purely a hint for the person holding the card. */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="size-56 rounded-2xl border-4 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>

            {status !== 'scanning' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink/90 p-8 text-center">
                <p className="max-w-sm text-[15px] leading-snug text-white/80">
                  {cameraError ||
                    'The camera is off. Start it to scan learner IDs, or read a saved image below.'}
                </p>
                <Button variant="primary" onClick={() => void start()}>
                  {status === 'starting' ? 'Starting…' : 'Start camera'}
                </Button>
              </div>
            )}

            {status === 'scanning' && (
              <button
                type="button"
                onClick={stop}
                className="absolute right-4 bottom-4 cursor-pointer rounded-xl bg-black/60 px-4 py-2 text-[15px] font-semibold text-white"
              >
                Stop camera
              </button>
            )}
          </div>

          <Card className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-semibold tracking-wide text-muted uppercase">
                Without the camera
              </span>
              <p className="text-[14px] leading-snug text-muted">
                Read a QR out of a photo or a saved image, or key a card code in
                by hand if a card will not scan.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <label className="inline-flex min-h-12 cursor-pointer items-center rounded-xl border border-line bg-white px-5 text-[17px] font-semibold hover:bg-cream">
                Scan an image
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    void onFile(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </label>

              <form
                className="flex flex-1 items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  const text = manual.trim()
                  if (!text) return
                  lastRef.current = { text: '', at: 0 }
                  void submit(text)
                  setManual('')
                }}
              >
                <div className="min-w-[200px] flex-1">
                  <Field label="Card code" htmlFor="manual">
                    <Input
                      id="manual"
                      value={manual}
                      onChange={(e) => setManual(e.target.value)}
                      placeholder="136743020001-A7F2"
                      className="tabular-nums"
                    />
                  </Field>
                </div>
                <Button type="submit" disabled={busy || !manual.trim()}>
                  Send
                </Button>
              </form>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {result ? (
            <ScanResultPanel result={result} stale={stale} />
          ) : (
            <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <span className="display-title text-[26px] text-ink">
                {busy ? 'Checking…' : 'Ready to scan'}
              </span>
              <p className="max-w-xs text-[15px] leading-snug text-muted">
                Hold a learner's ID up to the camera. The result shows here and
                clears itself.
              </p>
            </Card>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-bad-soft px-4 py-3 text-[15px] leading-snug text-bad"
            >
              {error}
            </p>
          )}

          {hours && (
            <Card className="flex flex-col gap-3 p-5">
              <span className="text-[13px] font-semibold tracking-wide text-muted uppercase">
                The day at this gate
              </span>

              <ul className="flex flex-col gap-1.5 text-[15px] text-ink">
                {(
                  [
                    [
                      'am',
                      'in',
                      'Morning in',
                      `${hours.opensAt.slice(0, 5)}–${hours.amOutOpensAt.slice(0, 5)}`,
                      `late after ${hours.amLateCutoffAt.slice(0, 5)}`,
                    ],
                    [
                      'am',
                      'out',
                      'Morning out',
                      `${hours.amOutOpensAt.slice(0, 5)}–${hours.amOutClosesAt.slice(0, 5)}`,
                      null,
                    ],
                    [
                      'pm',
                      'in',
                      'Afternoon in',
                      `${hours.pmInOpensAt.slice(0, 5)}–${hours.pmOutOpensAt.slice(0, 5)}`,
                      `late after ${hours.pmLateCutoffAt.slice(0, 5)}`,
                    ],
                    [
                      'pm',
                      'out',
                      'Afternoon out',
                      `${hours.pmOutOpensAt.slice(0, 5)}–${hours.closesAt.slice(0, 5)}`,
                      null,
                    ],
                  ] as const
                ).map(([session, direction, label, span, note]) => {
                  const now =
                    current?.session === session && current.direction === direction

                  return (
                    <li
                      key={label}
                      className={`flex items-baseline justify-between gap-3 rounded-lg px-2.5 py-1.5 ${
                        now ? 'bg-brand-soft font-semibold text-brand-ink' : ''
                      }`}
                    >
                      <span>
                        {label}
                        {note && (
                          <span className="ml-1.5 text-[13px] font-normal text-muted">
                            {note}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 tabular-nums">{span}</span>
                    </li>
                  )
                })}
              </ul>

              {!current && (
                <p className="rounded-lg bg-late-soft px-3 py-2 text-[14px] leading-snug text-late">
                  The gate is closed right now, so scans will be refused.
                </p>
              )}
            </Card>
          )}

          {recent.length > 0 && (
            <Card className="flex flex-col p-5">
              <span className="text-[13px] font-semibold tracking-wide text-muted uppercase">
                Last scans
              </span>
              <ul className="mt-3 flex flex-col">
                {recent.map((r, i) => (
                  <li
                    key={`${r.at}-${i}`}
                    className="flex items-center justify-between gap-3 border-b border-line-soft py-2.5 last:border-b-0"
                  >
                    <span className="min-w-0 truncate text-[15px] text-ink">
                      {r.student?.name ?? 'Unknown code'}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-[14px] text-muted tabular-nums">
                        {clockTime(r.at)}
                      </span>
                      <span
                        className={
                          r.outcome === 'ok'
                            ? 'rounded-full bg-ok-soft px-2.5 py-0.5 text-[13px] font-semibold text-ok'
                            : r.outcome === 'late'
                              ? 'rounded-full bg-late-soft px-2.5 py-0.5 text-[13px] font-semibold text-late'
                              : 'rounded-full bg-bad-soft px-2.5 py-0.5 text-[13px] font-semibold text-bad'
                        }
                      >
                        {r.outcome === 'invalid'
                          ? (r.reason ?? 'Refused')
                          : `${r.session.toUpperCase()} ${
                              r.direction === 'in' ? 'in' : 'out'
                            }`}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
