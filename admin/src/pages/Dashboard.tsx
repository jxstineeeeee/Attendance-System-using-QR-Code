import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CircleAlert,
  Clock,
  LogIn,
  LogOut,
  Smartphone,
  UserCheck,
  UserX,
  Users as UsersIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getOverview } from '../lib/db'
import { useAsync } from '../lib/useAsync'
import {
  DEVICE_STATUS_LABEL,
  formatClock,
  formatDate,
  formatTime,
  pct,
  type Device,
  type DeviceStatus,
  type ScanEvent,
} from '../lib/types'
import { ErrorBlock, LoadingBlock } from '../components/states'
import {
  Badge,
  Card,
  CardTitle,
  PageHeader,
  cx,
  type Tone,
} from '../components/ui'
import { AttendanceChart } from '../components/AttendanceChart'

const DEVICE_TONE: Record<DeviceStatus, Tone> = {
  online: 'success',
  syncing: 'info',
  offline: 'neutral',
}

export function Dashboard() {
  const { data, loading, error, reload } = useAsync(getOverview, [])

  if (loading && !data) {
    return <LoadingBlock label="Loading the dashboard…" />
  }
  if (error && !data) {
    return <ErrorBlock message={error} onRetry={reload} />
  }
  if (!data) return null

  const { todayTotals: today, enrolled, week } = data
  // Absence is derived from the roster, not counted from rows — nothing
  // writes `absent` rows yet, so a learner who never scanned has none.
  const scanned = today.present + today.late

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Dashboard"
        description={`${formatDate(data.today)} · school year ${data.schoolYear ?? '—'} · morning session`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={UserCheck}
          label="Present today"
          value={today.present.toLocaleString()}
          note={`${pct(today.present, enrolled)}% of enrolment`}
        />
        <StatTile
          icon={Clock}
          label="Late today"
          value={today.late.toLocaleString()}
          note={`${pct(today.late, enrolled)}% · after the ${formatClock(data.amLateCutoffAt)} cut-off`}
        />
        <StatTile
          icon={UserX}
          label="Absent today"
          value={today.absent.toLocaleString()}
          note={`${pct(today.absent, enrolled)}% · no scan recorded`}
        />
        <StatTile
          icon={UsersIcon}
          label="Enrolled"
          value={enrolled.toLocaleString()}
          note={`Across ${data.gradeLevels} grade levels`}
        />
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Attendance this week</CardTitle>
            <p className="text-sm text-muted">
              Share of the {enrolled.toLocaleString()} enrolled learners,
              Monday to Friday, morning session.
            </p>
          </div>
          <Link
            to="/attendance"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
          >
            View records
            <ArrowRight size={15} strokeWidth={2.2} />
          </Link>
        </div>

        <div className="mt-6">
          <AttendanceChart week={week} enrolled={enrolled} />
        </div>

        {/* The table view the chart's sub-3:1 fills oblige — and easier to scan. */}
        <table className="mt-7 w-full border-collapse text-left">
          <caption className="sr-only">
            Attendance totals for each day this week
          </caption>
          <thead>
            <tr className="border-b border-line-soft text-[13px] font-semibold tracking-wide text-muted uppercase">
              <th scope="col" className="pb-2.5">
                Day
              </th>
              <th scope="col" className="pb-2.5 text-right">
                Present
              </th>
              <th scope="col" className="pb-2.5 text-right">
                Late
              </th>
              <th scope="col" className="pb-2.5 text-right">
                Absent
              </th>
              <th scope="col" className="pb-2.5 text-right">
                Attendance rate
              </th>
            </tr>
          </thead>
          <tbody>
            {week.map((d) => (
              <tr
                key={d.date}
                className="border-b border-line-soft last:border-b-0"
              >
                <th
                  scope="row"
                  className="py-2.5 text-left text-[15px] font-medium text-ink"
                >
                  {d.day}{' '}
                  <span className="font-normal text-subtle">
                    {formatDate(d.date).replace(/, \d{4}$/, '')}
                  </span>
                </th>
                <td className="py-2.5 text-right text-[15px] text-muted tabular-nums">
                  {d.present.toLocaleString()}
                </td>
                <td className="py-2.5 text-right text-[15px] text-muted tabular-nums">
                  {d.late.toLocaleString()}
                </td>
                <td className="py-2.5 text-right text-[15px] text-muted tabular-nums">
                  {d.absent.toLocaleString()}
                </td>
                <td className="py-2.5 text-right text-[15px] font-semibold text-ink tabular-nums">
                  {pct(d.present + d.late, enrolled)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {scanned === 0 && (
          <p className="mt-5 rounded-lg bg-cream px-4 py-3 text-[14px] leading-snug text-muted">
            No scans have been recorded today yet, so everyone shows as absent.
            Absence is the absence of a scan — nothing writes absent rows ahead
            of time.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <RecentActivity scans={data.recentScans} />
        <DeviceStatusCard devices={data.devices} />
      </div>
    </div>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: LucideIcon
  label: string
  value: string
  note: string
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Icon size={17} strokeWidth={2} />
        </span>
        <span className="text-[13px] font-semibold tracking-wide text-muted uppercase">
          {label}
        </span>
      </div>
      <span className="display-title text-[44px] leading-none text-ink">
        {value}
      </span>
      <span className="text-[13px] text-muted">{note}</span>
    </Card>
  )
}

function RecentActivity({ scans }: { scans: ScanEvent[] }) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <CardTitle>Recent gate activity</CardTitle>
        {scans.length > 0 && (
          <span className="flex items-center gap-2 text-[13px] text-muted">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-present opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-present" />
            </span>
            Live
          </span>
        )}
      </div>

      {scans.length === 0 ? (
        <p className="py-10 text-center text-muted">
          No scans recorded yet.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col">
          {scans.map((e) => (
            <ScanRow key={e.id} event={e} />
          ))}
        </ul>
      )}
    </Card>
  )
}

function ScanRow({ event }: { event: ScanEvent }) {
  const invalid = event.outcome === 'invalid'
  const Icon = invalid ? CircleAlert : event.direction === 'in' ? LogIn : LogOut

  return (
    <li className="flex items-center gap-3.5 border-b border-line-soft py-3 last:border-b-0">
      <span
        className={cx(
          'flex size-9 shrink-0 items-center justify-center rounded-lg',
          invalid ? 'bg-danger-bg text-danger-fg' : 'bg-cream text-muted',
        )}
      >
        <Icon size={17} strokeWidth={2} />
      </span>

      <div className="flex min-w-0 flex-col">
        <span
          className={cx(
            'truncate text-[15px] font-semibold',
            invalid ? 'text-danger-fg' : 'text-ink',
          )}
        >
          {/* A refused scan may match no learner; say so rather than blank. */}
          {event.name ?? 'Unrecognised card'}
        </span>
        <span className="truncate text-[13px] text-muted tabular-nums">
          {event.lrn ?? event.reason ?? '—'} · {event.gate}
        </span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        {event.outcome === 'late' && <Badge tone="warn">Late</Badge>}
        {invalid && <Badge tone="danger">Invalid ID</Badge>}
        <span className="text-[13px] text-muted tabular-nums">
          {formatTime(event.at) ?? '—'}
        </span>
      </div>
    </li>
  )
}

function DeviceStatusCard({ devices }: { devices: Device[] }) {
  const paired = devices.filter((d) => d.isActive)

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <CardTitle>Gate devices</CardTitle>
        <Link
          to="/devices"
          className="text-sm font-semibold text-brand hover:underline"
        >
          Manage
        </Link>
      </div>

      {paired.length === 0 ? (
        <p className="py-10 text-center text-muted">No devices paired yet.</p>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {paired.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-3 rounded-lg border border-line-soft px-3.5 py-3"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cream text-muted">
                <Smartphone size={17} strokeWidth={2} />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[15px] font-semibold text-ink">
                  {d.name}
                </span>
                <span className="text-[13px] text-muted tabular-nums">
                  {d.scansToday.toLocaleString()} scans ·{' '}
                  {d.lastSeen ? formatTime(d.lastSeen) : 'never seen'}
                </span>
              </div>
              <Badge tone={DEVICE_TONE[d.status]} className="ml-auto shrink-0">
                {DEVICE_STATUS_LABEL[d.status]}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
