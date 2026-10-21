import { useEffect, useState } from 'react'
import { listDevices, type Device } from '../lib/gate'
import { Button, Card } from '../components/ui'

/**
 * Which gate this tablet is. Scans are logged against the device, so the
 * admin console can tell the east post from the west one — and the choice is
 * remembered, because a tablet does not wander between gates mid-shift.
 */
export function PickDevice({
  current,
  onPick,
  onSignOut,
}: {
  current: string | null
  onPick: (device: Device) => void
  onSignOut: () => void
}) {
  const [devices, setDevices] = useState<Device[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    listDevices()
      .then((rows) => {
        if (cancelled) return
        setDevices(rows)
        // A remembered code that still exists needs no second confirmation.
        const remembered = rows.find((d) => d.code === current)
        if (remembered) onPick(remembered)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load scanners.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // Runs once: re-running on every parent render would fight the picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink p-6">
      <Card className="flex w-[520px] max-w-full flex-col gap-6 p-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="display-title text-[34px] leading-none text-ink">
            Which scanner is this?
          </h1>
          <p className="text-[15px] text-muted">
            Every scan is recorded against the gate it came from.
          </p>
        </div>

        {loading && <p className="text-[15px] text-muted">Loading scanners…</p>}

        {error && (
          <div className="flex flex-col gap-3">
            <p
              role="alert"
              className="rounded-xl bg-bad-soft px-4 py-3 text-[15px] leading-snug text-bad"
            >
              {error}
            </p>
            <Button onClick={onSignOut}>Sign in as someone else</Button>
          </div>
        )}

        {!loading && !error && devices.length === 0 && (
          <p className="rounded-xl bg-cream px-4 py-6 text-center text-[15px] text-muted">
            No active scanners are registered. Add one in the admin console.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {devices.map((device) => (
            <Button
              key={device.code}
              block
              className="justify-between"
              onClick={() => onPick(device)}
            >
              <span className="flex min-w-0 flex-col items-start">
                <span className="truncate font-semibold">{device.name}</span>
                <span className="text-[14px] font-normal text-muted">
                  {device.location ?? device.code}
                </span>
              </span>
              <span className="shrink-0 text-[14px] font-normal text-subtle tabular-nums">
                {device.code}
              </span>
            </Button>
          ))}
        </div>
      </Card>
    </div>
  )
}
