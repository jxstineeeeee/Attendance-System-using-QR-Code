import {
  CloudOff,
  MapPin,
  Plus,
  RefreshCw,
  Smartphone,
  UserRound,
} from 'lucide-react'
import {
  DEVICES,
  DEVICE_STATUS_LABEL,
  type Device,
  type DeviceStatus,
} from '../lib/mock'
import {
  Badge,
  Button,
  Card,
  CardTitle,
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
  const totalScans = DEVICES.reduce((sum, d) => sum + d.scansToday, 0)
  const pending = DEVICES.reduce((sum, d) => sum + d.pendingSync, 0)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Gate Devices"
        description="Tablets and phones running the scanner app at each gate."
      >
        <Button variant="secondary">
          <RefreshCw size={17} strokeWidth={2.2} />
          Force sync
        </Button>
        <Button variant="primary">
          <Plus size={18} strokeWidth={2.4} />
          Pair device
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Summary
          label="Devices paired"
          value={String(DEVICES.length)}
          note={`${DEVICES.filter((d) => d.status === 'online').length} online right now`}
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {DEVICES.map((d) => (
          <DeviceCard key={d.id} device={d} />
        ))}
      </div>

      <Card className="flex items-start gap-3.5 p-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cream text-muted">
          <CloudOff size={17} strokeWidth={2} />
        </span>
        <p className="text-[14px] leading-relaxed text-muted">
          Scanners keep working without internet. Scans are stored on the device
          and pushed up when the connection returns, so a gate never stops
          because the signal dropped. A device showing{' '}
          <span className="font-semibold text-ink">Syncing</span> still has
          scans it has not handed over yet.
        </p>
      </Card>
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

function DeviceCard({ device }: { device: Device }) {
  const offline = device.status === 'offline'

  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <span
            className={cx(
              'flex size-11 shrink-0 items-center justify-center rounded-lg',
              offline ? 'bg-line-soft text-subtle' : 'bg-brand-soft text-brand',
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
        <Badge tone={STATUS_TONE[device.status]}>
          {DEVICE_STATUS_LABEL[device.status]}
        </Badge>
      </div>

      <div className="flex flex-col gap-2.5">
        <Detail icon={MapPin} text={device.location} />
        <Detail
          icon={UserRound}
          text={
            offline
              ? 'No operator signed in'
              : `Signed in as ${device.operator}`
          }
        />
      </div>

      <div className="grid grid-cols-3 gap-4 rounded-lg bg-cream px-4 py-3.5">
        <Stat label="Scans today" value={device.scansToday.toLocaleString()} />
        <Stat label="Pending sync" value={String(device.pendingSync)} />
        <Stat label="Last seen" value={device.lastSeen} />
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Button size="sm">Rename</Button>
        <Button size="sm">View scans</Button>
        <Button size="sm" variant="danger">
          {offline ? 'Remove' : 'Unpair'}
        </Button>
      </div>
    </Card>
  )
}

function Detail({
  icon: Icon,
  text,
}: {
  icon: typeof MapPin
  text: string
}) {
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
