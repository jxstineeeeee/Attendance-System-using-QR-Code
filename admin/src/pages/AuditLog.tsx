import { useMemo, useState } from 'react'
import {
  Download,
  IdCard,
  Search,
  Settings as SettingsIcon,
  ShieldAlert,
  Smartphone,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  AUDIT,
  AUDIT_KIND_LABEL,
  type AuditEntry,
  type AuditKind,
} from '../lib/mock'
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  cx,
  type Tone,
} from '../components/ui'

const KIND_ICON: Record<AuditKind, LucideIcon> = {
  account: UserRound,
  student: IdCard,
  device: Smartphone,
  settings: SettingsIcon,
  security: ShieldAlert,
}

const KIND_TONE: Record<AuditKind, Tone> = {
  account: 'info',
  student: 'success',
  device: 'neutral',
  settings: 'warn',
  security: 'danger',
}

export function AuditLog() {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return AUDIT.filter((e) => {
      if (kind && e.kind !== kind) return false
      if (!q) return true
      return (
        e.actor.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.detail.toLowerCase().includes(q)
      )
    })
  }, [query, kind])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Audit Log"
        description="Every change made in the system, and who made it."
      >
        <Button variant="secondary">
          <Download size={17} strokeWidth={2.2} />
          Export log
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_190px]">
        <Field label="Search" htmlFor="search">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-subtle"
            />
            <Input
              id="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by person, action or detail"
              className="pl-11"
            />
          </div>
        </Field>

        <Field label="Category" htmlFor="kind">
          <Select
            id="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="">All categories</option>
            {(Object.keys(AUDIT_KIND_LABEL) as AuditKind[]).map((k) => (
              <option key={k} value={k}>
                {AUDIT_KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Card className="p-6">
        {rows.length === 0 ? (
          <p className="py-12 text-center text-muted">
            No log entries match those filters.
          </p>
        ) : (
          <ol className="flex flex-col">
            {rows.map((entry, i) => (
              <AuditRow
                key={entry.id}
                entry={entry}
                last={i === rows.length - 1}
              />
            ))}
          </ol>
        )}
      </Card>

      <p className="text-[13px] text-muted">
        Entries are kept for the whole school year and cannot be edited or
        deleted from this console.
      </p>
    </div>
  )
}

function AuditRow({ entry, last }: { entry: AuditEntry; last: boolean }) {
  const Icon = KIND_ICON[entry.kind]
  const security = entry.kind === 'security'

  return (
    <li className="flex gap-4">
      {/* Timeline rail: marker on the line, line stops at the last entry. */}
      <div className="flex shrink-0 flex-col items-center">
        <span
          className={cx(
            'flex size-9 items-center justify-center rounded-full',
            security ? 'bg-danger-bg text-danger-fg' : 'bg-cream text-muted',
          )}
        >
          <Icon size={16} strokeWidth={2} />
        </span>
        {!last && <span className="w-px flex-1 bg-line-soft" />}
      </div>

      <div className={cx('flex min-w-0 flex-col gap-1', last ? 'pb-0' : 'pb-6')}>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[15px] font-semibold text-ink">
            {entry.action}
          </span>
          <Badge tone={KIND_TONE[entry.kind]}>
            {AUDIT_KIND_LABEL[entry.kind]}
          </Badge>
        </div>
        <p className="text-[14px] leading-snug text-muted">{entry.detail}</p>
        <p className="text-[13px] text-subtle">
          {entry.actor} · {entry.at}
        </p>
      </div>
    </li>
  )
}
