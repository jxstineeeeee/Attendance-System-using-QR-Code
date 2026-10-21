import { useState, type FormEvent, type ReactNode } from 'react'
import {
  CloudOff,
  MapPin,
  Plus,
  Smartphone,
  UserRound,
  X,
} from 'lucide-react'
import {
  listDeviceScans,
  listDevices,
  pairDevice,
  updateDevice,
} from '../lib/db'
import { errorMessage, useAsync } from '../lib/useAsync'
import {
  DEVICE_STATUS_LABEL,
  formatDateTime,
  formatTime,
  type Device,
  type DeviceStatus,
  type ScanEvent,
} from '../lib/types'
import { ErrorBlock, FormError, LoadingBlock } from '../components/states'
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Field,
  IconButton,
  Input,
  PageHeader,
  cx,
  type Tone,
} from '../components/ui'

const STATUS_TONE: Record<DeviceStatus, Tone> = {
  online: 'success',
  syncing: 'info',
  offline: 'neutral',
}

export function Devices() {
  const { data, loading, error, reload } = useAsync(listDevices, [])
  const [pairing, setPairing] = useState(false)
  const [editing, setEditing] = useState<Device | null>(null)
  const [viewing, setViewing] = useState<Device | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)

  async function setActive(device: Device, isActive: boolean) {
    setRowError(null)
    try {
      await updateDevice(device.id, { isActive })
      reload()
    } catch (err) {
      setRowError(errorMessage(err))
    }
  }

  if (loading && !data) return <LoadingBlock label="Loading gate devices…" />
  if (error && !data) return <ErrorBlock message={error} onRetry={reload} />

  const devices = data?.devices ?? []
  const active = devices.filter((d) => d.isActive)
  const totalScans = devices.reduce((sum, d) => sum + d.scansToday, 0)
  const pending = devices.reduce((sum, d) => sum + d.pendingSync, 0)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Gate Devices"
        description="Tablets and phones running the scanner app at each gate."
      >
        <Button variant="primary" onClick={() => setPairing(true)}>
          <Plus size={18} strokeWidth={2.4} />
          Pair device
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Summary
          label="Devices paired"
          value={String(active.length)}
          note={`${active.filter((d) => d.status === 'online').length} online right now`}
        />
        <Summary
          label="Scans today"
          value={totalScans.toLocaleString()}
          note="Across all gates"
        />
        <Summary
          label="Waiting to sync"
          value={String(pending)}
          note={
            pending === 0
              ? 'Everything is up to date'
              : 'Queued on devices that lost signal'
          }
          warn={pending > 0}
        />
      </div>

      {rowError && <FormError message={rowError} />}

      {devices.length === 0 ? (
        <Card className="px-6 py-14 text-center text-muted">
          No devices are paired yet. Pair one and its code is what the scanner
          app signs in against.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {devices.map((d) => (
            <DeviceCard
              key={d.id}
              device={d}
              onRename={() => setEditing(d)}
              onViewScans={() => setViewing(d)}
              onSetActive={(isActive) => setActive(d, isActive)}
            />
          ))}
        </div>
      )}

      <Card className="flex items-start gap-3.5 p-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cream text-muted">
          <CloudOff size={17} strokeWidth={2} />
        </span>
        <p className="text-[14px] leading-relaxed text-muted">
          <span className="font-semibold text-ink">
            Offline scanning is not built yet.
          </span>{' '}
          A scan currently needs the API to be reachable;{' '}
          <span className="font-semibold text-ink">Waiting to sync</span> reads{' '}
          <code className="text-[13px]">devices.pending_sync</code>, which the
          schema carries for when scans are buffered on the device. Until then
          it stays at zero.
        </p>
      </Card>

      {pairing && (
        <PairDialog
          onClose={() => setPairing(false)}
          onSaved={() => {
            setPairing(false)
            reload()
          }}
        />
      )}

      {editing && (
        <RenameDialog
          device={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}

      {viewing && (
        <ScansDialog device={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}

function Summary({
  label,
  value,
  note,
  warn,
}: {
  label: string
  value: string
  note: string
  warn?: boolean
}) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <span className="text-[13px] font-semibold tracking-wide text-muted uppercase">
        {label}
      </span>
      <span
        className={cx(
          'display-title text-[40px] leading-none',
          warn ? 'text-warn-fg' : 'text-ink',
        )}
      >
        {value}
      </span>
      <span className="text-[13px] text-muted">{note}</span>
    </Card>
  )
}

function DeviceCard({
  device,
  onRename,
  onViewScans,
  onSetActive,
}: {
  device: Device
  onRename: () => void
  onViewScans: () => void
  onSetActive: (isActive: boolean) => void
}) {
  const retired = !device.isActive

  return (
    <Card className={cx('flex flex-col gap-5 p-6', retired && 'opacity-75')}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <span
            className={cx(
              'flex size-11 shrink-0 items-center justify-center rounded-lg',
              retired ? 'bg-line-soft text-subtle' : 'bg-brand-soft text-brand',
            )}
          >
            <Smartphone size={21} strokeWidth={1.9} />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <CardTitle>{device.name}</CardTitle>
            <span className="text-[13px] text-muted tabular-nums">
              {device.code}
            </span>
          </div>
        </div>
        <Badge tone={retired ? 'neutral' : STATUS_TONE[device.status]}>
          {retired ? 'Retired' : DEVICE_STATUS_LABEL[device.status]}
        </Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        <Detail icon={MapPin} text={device.location ?? 'No location set'} />
        <Detail
          icon={UserRound}
          text={
            device.operator
              ? `Last used by ${device.operator}`
              : 'No operator has signed in'
          }
        />
      </div>

      <div className="grid grid-cols-3 gap-4 rounded-lg bg-cream px-4 py-3.5">
        <Stat label="Scans today" value={device.scansToday.toLocaleString()} />
        <Stat label="Pending sync" value={String(device.pendingSync)} />
        <Stat
          label="Last seen"
          value={device.lastSeen ? formatDateTime(device.lastSeen) : 'Never'}
        />
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Button size="sm" onClick={onRename}>
          Rename
        </Button>
        <Button
          size="sm"
          onClick={onViewScans}
          disabled={device.scansToday === 0}
        >
          View scans
        </Button>
        <Button
          size="sm"
          variant={retired ? 'secondary' : 'danger'}
          onClick={() => onSetActive(retired)}
        >
          {retired ? 'Return to service' : 'Retire'}
        </Button>
      </div>
    </Card>
  )
}

function Detail({ icon: Icon, text }: { icon: typeof MapPin; text: string }) {
  return (
    <span className="flex items-center gap-2 text-[14px] text-muted">
      <Icon size={15} strokeWidth={1.9} className="shrink-0 text-subtle" />
      {text}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[12px] text-muted">{label}</span>
      <span className="truncate text-[15px] font-semibold text-ink tabular-nums">
        {value}
      </span>
    </div>
  )
}

/* --------------------------------------------------------------- Dialogs */

function Shell({
  title,
  description,
  onClose,
  children,
  footer,
  width = 'w-[520px]',
}: {
  title: string
  description: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'flex max-h-[85vh] max-w-full flex-col gap-5 rounded-2xl border border-line bg-white p-7',
          width,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="display-title text-[28px] leading-none text-ink">
              {title}
            </h2>
            <p className="text-sm text-muted">{description}</p>
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={17} strokeWidth={2.2} />
          </IconButton>
        </div>
        {children}
        {footer}
      </div>
    </div>
  )
}

function PairDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await pairDevice({ code: code.toUpperCase(), name, location })
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4">
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-label="Pair device"
        className="flex w-[520px] max-w-full flex-col gap-5 rounded-2xl border border-line bg-white p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="display-title text-[28px] leading-none text-ink">
              Pair device
            </h2>
            <p className="text-sm text-muted">
              The code is what the scanner app picks from when a tablet says
              which gate it is.
            </p>
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={17} strokeWidth={2.2} />
          </IconButton>
        </div>

        <Field
          label="Device code"
          htmlFor="device-code"
          required
          hint={
            <p className="text-[13px] leading-snug text-muted">
              Capitals, digits and hyphens, e.g. LNHS-GATE-01.
            </p>
          }
        >
          <Input
            id="device-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="LNHS-GATE-04"
            required
          />
        </Field>

        <Field label="Name" htmlFor="device-name" required>
          <Input
            id="device-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Main Gate — Scanner 3"
            required
          />
        </Field>

        <Field label="Location" htmlFor="device-location">
          <Input
            id="device-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Main gate, east post"
          />
        </Field>

        {error && <FormError message={error} />}

        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Pairing…' : 'Pair device'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function RenameDialog({
  device,
  onClose,
  onSaved,
}: {
  device: Device
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(device.name)
  const [location, setLocation] = useState(device.location ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await updateDevice(device.id, { name, location })
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4">
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-label="Rename device"
        className="flex w-[520px] max-w-full flex-col gap-5 rounded-2xl border border-line bg-white p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="display-title text-[28px] leading-none text-ink">
              Rename device
            </h2>
            <p className="text-sm text-muted">
              {device.code} — the code itself cannot change; a tablet signs in
              against it.
            </p>
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={17} strokeWidth={2.2} />
          </IconButton>
        </div>

        <Field label="Name" htmlFor="rename-name" required>
          <Input
            id="rename-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>

        <Field label="Location" htmlFor="rename-location">
          <Input
            id="rename-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </Field>

        {error && <FormError message={error} />}

        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function ScansDialog({
  device,
  onClose,
}: {
  device: Device
  onClose: () => void
}) {
  const { data, loading, error, reload } = useAsync(
    () => listDeviceScans(device.id),
    [device.id],
  )

  return (
    <Shell
      title="Scans today"
      description={`${device.name} · ${device.code}`}
      onClose={onClose}
      width="w-[640px]"
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && !data ? (
          <LoadingBlock label="Loading scans…" />
        ) : error ? (
          <ErrorBlock message={error} onRetry={reload} />
        ) : data?.scans.length === 0 ? (
          <p className="py-10 text-center text-muted">
            No scans on this device today.
          </p>
        ) : (
          <ul className="flex flex-col">
            {data?.scans.map((s) => (
              <ScanLine key={s.id} scan={s} />
            ))}
          </ul>
        )}
      </div>
    </Shell>
  )
}

function ScanLine({ scan }: { scan: ScanEvent }) {
  const invalid = scan.outcome === 'invalid'

  return (
    <li className="flex items-center gap-3 border-b border-line-soft py-2.5 last:border-b-0">
      <div className="flex min-w-0 flex-col">
        <span
          className={cx(
            'truncate text-[15px] font-semibold',
            invalid ? 'text-danger-fg' : 'text-ink',
          )}
        >
          {scan.name ?? 'Unrecognised card'}
        </span>
        <span className="truncate text-[13px] text-muted">
          {scan.lrn ?? scan.reason ?? '—'}
        </span>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2.5">
        <Badge tone={invalid ? 'danger' : scan.outcome === 'late' ? 'warn' : 'neutral'}>
          {invalid ? 'Refused' : scan.direction === 'in' ? 'Time in' : 'Time out'}
        </Badge>
        <span className="text-[13px] text-muted tabular-nums">
          {formatTime(scan.at) ?? '—'}
        </span>
      </div>
    </li>
  )
}
