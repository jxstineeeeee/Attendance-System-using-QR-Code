import { useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import {
  ATTENDANCE,
  ATTENDANCE_STATUS_LABEL,
  GRADE_LEVELS,
  SECTIONS,
  type AttendanceRecord,
  type AttendanceStatus,
} from '../lib/mock'
import {
  Badge,
  Button,
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
}

export function Attendance() {
  const [date, setDate] = useState('2026-09-30')
  const [query, setQuery] = useState('')
  const [grade, setGrade] = useState('')
  const [section, setSection] = useState('')
  const [status, setStatus] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ATTENDANCE.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !r.lrn.includes(q)) {
        return false
      }
      if (grade && r.gradeLevel !== grade) return false
      if (section && r.section !== section) return false
      if (status && r.status !== status) return false
      return true
    })
  }, [query, grade, section, status])

  const counts = useMemo(
    () => ({
      present: rows.filter((r) => r.status === 'present').length,
      late: rows.filter((r) => r.status === 'late').length,
      absent: rows.filter((r) => r.status === 'absent').length,
    }),
    [rows],
  )

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Attendance"
        description="Time-in and time-out recorded at the gate, by day."
      >
        <Button variant="secondary">
          <Download size={17} strokeWidth={2.2} />
          Export CSV
        </Button>
      </PageHeader>

      {/* Filters sit in one row above the records, date first. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[170px_minmax(0,1fr)_160px_160px_150px]">
        <Field label="Date" htmlFor="date">
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
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
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or LRN"
              className="pl-11"
            />
          </div>
        </Field>

        <Field label="Grade level" htmlFor="grade">
          <Select
            id="grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          >
            <option value="">All grades</option>
            {GRADE_LEVELS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Section" htmlFor="section">
          <Select
            id="section"
            value={section}
            onChange={(e) => setSection(e.target.value)}
          >
            <option value="">All sections</option>
            {SECTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Status" htmlFor="status">
          <Select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            {(
              Object.keys(ATTENDANCE_STATUS_LABEL) as AttendanceStatus[]
            ).map((s) => (
              <option key={s} value={s}>
                {ATTENDANCE_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Badge tone="success">{counts.present} present</Badge>
        <Badge tone="warn">{counts.late} late</Badge>
        <Badge tone="danger">{counts.absent} absent</Badge>
        <span className="text-sm text-muted">in the current filter</span>
      </div>

      <Card className="overflow-hidden">
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
            {rows.map((r) => (
              <AttendanceRow key={r.id} record={r} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center text-muted">
                  No attendance records match those filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="border-t border-line-soft px-5 py-3.5 text-sm text-muted">
          Showing {rows.length} of {ATTENDANCE.length} records for this day.
        </div>
      </Card>
    </div>
  )
}

function AttendanceRow({ record }: { record: AttendanceRecord }) {
  return (
    <tr className="border-b border-line-soft last:border-b-0 hover:bg-cream/60">
      <td className="py-3 pr-4 pl-5">
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold text-ink">
            {record.name}
          </span>
          {/* Absent learners never touched a gate — don't leave a stray dash. */}
          {record.timeIn && (
            <span className="text-[13px] text-subtle">{record.gate}</span>
          )}
        </div>
      </td>
      <td className="py-3 pr-4 text-[15px] text-muted tabular-nums">
        {record.lrn}
      </td>
      <td className="py-3 pr-4 text-[15px] text-muted">
        {record.gradeLevel} - {record.section}
      </td>
      <td className="py-3 pr-4 text-[15px] text-ink tabular-nums">
        {record.timeIn ?? <span className="text-subtle">—</span>}
      </td>
      <td className="py-3 pr-4 text-[15px] text-ink tabular-nums">
        {record.timeOut ?? <span className="text-subtle">—</span>}
      </td>
      <td className="py-3 pr-5">
        <Badge tone={STATUS_TONE[record.status]}>
          {ATTENDANCE_STATUS_LABEL[record.status]}
        </Badge>
      </td>
    </tr>
  )
}
