import { useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import {
  attendanceCsvUrl,
  getAcademic,
  listAttendance,
  type AttendanceFilters,
} from '../lib/db'
import { useAsync } from '../lib/useAsync'
import {
  ATTENDANCE_STATUS_LABEL,
  SESSION_LABEL,
  formatTime,
  type AttendanceRow,
  type AttendanceStatus,
  type SessionKey,
  type SessionRecord,
} from '../lib/types'
import { ErrorBlock, LoadingBlock } from '../components/states'
import {
  Badge,
  Button,
  ButtonAnchor,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  type Tone,
} from '../components/ui'

const STATUS_TONE: Record<AttendanceStatus, Tone> = {
  present: 'success',
  late: 'warn',
  absent: 'danger',
  excused: 'info',
}

const PAGE_SIZE = 25

/** The server's today, so the date box does not start on the browser's. */
const todayIso = () => new Date().toISOString().slice(0, 10)

export function Attendance() {
  const [date, setDate] = useState(todayIso)
  const [session, setSession] = useState<SessionKey>('am')
  const [query, setQuery] = useState('')
  const [grade, setGrade] = useState('')
  const [section, setSection] = useState('')
  const [status, setStatus] = useState<AttendanceStatus | ''>('')
  const [page, setPage] = useState(0)

  const filters: AttendanceFilters = useMemo(
    () => ({ date, session, query, grade, section, status, page, pageSize: PAGE_SIZE }),
    [date, session, query, grade, section, status, page],
  )

  const roster = useAsync(getAcademic, [])
  const { data, loading, error, reload } = useAsync(
    () => listAttendance(filters),
    [filters],
  )

  /** Any filter change puts you back on the first page. */
  function change<T>(set: (v: T) => void) {
    return (value: T) => {
      set(value)
      setPage(0)
    }
  }

  const grades = roster.data?.grades ?? []
  const sections = roster.data?.sections ?? []
  const shown = data?.rows.length ?? 0
  const total = data?.total ?? 0

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Attendance"
        description="Time-in and time-out recorded at the gate, by day."
      >
        <ButtonAnchor href={attendanceCsvUrl(filters)} download>
          <Download size={17} strokeWidth={2.2} />
          Export CSV
        </ButtonAnchor>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[170px_150px_minmax(0,1fr)_160px_160px_150px]">
        <Field label="Date" htmlFor="date">
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => change(setDate)(e.target.value)}
          />
        </Field>

        <Field label="Session" htmlFor="session">
          <Select
            id="session"
            value={session}
            onChange={(e) => change(setSession)(e.target.value as SessionKey)}
          >
            {(Object.keys(SESSION_LABEL) as SessionKey[]).map((s) => (
              <option key={s} value={s}>
                {SESSION_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Search" htmlFor="search">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-subtle"
            />
            <Input
              id="search"
              value={query}
              onChange={(e) => change(setQuery)(e.target.value)}
              placeholder="Search by name or LRN"
              className="pl-11"
            />
          </div>
        </Field>

        <Field label="Grade level" htmlFor="grade">
          <Select
            id="grade"
            value={grade}
            onChange={(e) => change(setGrade)(e.target.value)}
          >
            <option value="">All grades</option>
            {grades.map((g) => (
              <option key={g.id} value={g.name}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Section" htmlFor="section">
          <Select
            id="section"
            value={section}
            onChange={(e) => change(setSection)(e.target.value)}
          >
            <option value="">All sections</option>
            {[...new Set(sections.map((s) => s.name))].sort().map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Status" htmlFor="status">
          <Select
            id="status"
            value={status}
            onChange={(e) =>
              change(setStatus)(e.target.value as AttendanceStatus | '')
            }
          >
            <option value="">All</option>
            {(['present', 'late', 'absent'] as AttendanceStatus[]).map((s) => (
              <option key={s} value={s}>
                {ATTENDANCE_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {/* The badges describe the whole day, not the filtered rows. */}
      {data && (
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge tone="success">{data.totals.present} present</Badge>
          <Badge tone="warn">{data.totals.late} late</Badge>
          <Badge tone="danger">{data.totals.absent} absent</Badge>
          <span className="text-sm text-muted">
            of {data.totals.enrolled.toLocaleString()} enrolled, this{' '}
            {SESSION_LABEL[session].toLowerCase()}
          </span>
        </div>
      )}

      {error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : (
        <Card className="overflow-hidden">
          {loading && !data ? (
            <LoadingBlock label="Loading attendance…" />
          ) : (
            <>
              <table className="w-full table-fixed border-collapse text-left">
                <colgroup>
                  <col />
                  <col className="w-[160px]" />
                  <col className="w-[180px]" />
                  <col className="w-[110px]" />
                  <col className="w-[110px]" />
                  <col className="w-[120px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-line-soft text-[13px] font-semibold tracking-wide text-muted uppercase">
                    <th scope="col" className="py-3 pl-5">
                      Student
                    </th>
                    <th scope="col" className="py-3">
                      LRN
                    </th>
                    <th scope="col" className="py-3">
                      Grade &amp; Section
                    </th>
                    <th scope="col" className="py-3">
                      Time in
                    </th>
                    <th scope="col" className="py-3">
                      Time out
                    </th>
                    <th scope="col" className="py-3 pr-5">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.rows.map((r) => (
                    <AttendanceTableRow
                      key={r.studentId}
                      record={r}
                      session={session}
                    />
                  ))}
                  {shown === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-14 text-center text-muted"
                      >
                        No learners match those filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-5 py-3.5">
                <span className="text-sm text-muted">
                  {total === 0
                    ? 'No records'
                    : `Showing ${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + shown} of ${total.toLocaleString()}`}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    disabled={(page + 1) * PAGE_SIZE >= total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  )
}

function AttendanceTableRow({
  record,
  session,
}: {
  record: AttendanceRow
  session: SessionKey
}) {
  const row: SessionRecord | null = record[session]
  const timeIn = formatTime(row?.timeIn)
  const timeOut = formatTime(row?.timeOut)
  // No row for this session means no scan, which is what absent is.
  const status: AttendanceStatus = row?.status ?? 'absent'

  return (
    <tr className="border-b border-line-soft last:border-b-0 hover:bg-cream/60">
      <td className="py-3 pr-4 pl-5">
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold text-ink">
            {record.name}
          </span>
          {/* Absent learners never touched a gate — don't leave a stray dash. */}
          {row?.gate && (
            <span className="text-[13px] text-subtle">{row.gate}</span>
          )}
        </div>
      </td>
      <td className="py-3 pr-4 text-[15px] text-muted tabular-nums">
        {record.lrn}
      </td>
      <td className="py-3 pr-4 text-[15px] text-muted">
        {[record.gradeLevel, record.section].filter(Boolean).join(' - ') || '—'}
      </td>
      <td className="py-3 pr-4 text-[15px] text-ink tabular-nums">
        {timeIn ?? <span className="text-subtle">—</span>}
      </td>
      <td className="py-3 pr-4 text-[15px] text-ink tabular-nums">
        {timeOut ?? <span className="text-subtle">—</span>}
      </td>
      <td className="py-3 pr-5">
        <Badge tone={STATUS_TONE[status]}>
          {ATTENDANCE_STATUS_LABEL[status]}
        </Badge>
      </td>
    </tr>
  )
}
