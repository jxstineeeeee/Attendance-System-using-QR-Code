import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Printer, Search, User } from 'lucide-react'
import {
  GRADE_LEVELS,
  ID_STATUS_LABEL,
  SECTIONS,
  fullName,
  gradeAndSection,
  type IdStatus,
  type Student,
} from '../lib/types'
import { listStudents } from '../lib/db'
import {
  Badge,
  Button,
  ButtonLink,
  Field,
  IconButton,
  Input,
  Select,
  type Tone,
} from '../components/ui'
import { ErrorBlock, LoadingBlock } from '../components/states'

const STATUS_TONE: Record<IdStatus, Tone> = {
  printed: 'success',
  'not-printed': 'warn',
  'reissue-needed': 'danger',
}

const PAGE_SIZE = 8

export function Students() {
  const [query, setQuery] = useState('')
  const [grade, setGrade] = useState('')
  const [section, setSection] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)

  const [rows, setRows] = useState<Student[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  // Bumped to force a refetch after a failed load.
  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  // Typing in the search box shouldn't fire a query per keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    listStudents({ query: debouncedQuery, grade, section, status }, page, PAGE_SIZE)
      .then((res) => {
        if (cancelled) return
        setRows(res.rows)
        setTotal(res.total)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setRows([])
        setTotal(0)
        setError(err instanceof Error ? err.message : 'Could not load students.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, grade, section, status, page, reloadKey])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // A filter change can strand the user past the end of the new result set.
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1)
  }, [page, pageCount])

  const visibleIds = rows.map((s) => s.id)
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id))

  const toggleRow = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )

  const toggleAll = () =>
    setSelected((prev) =>
      allVisibleSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : [...new Set([...prev, ...visibleIds])],
    )

  const resetPage = () => setPage(0)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="display-title text-[40px] leading-none text-ink">
            Students
          </h1>
          <p className="text-base text-muted">
            Register learners, manage their info, and print QR IDs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary">Import CSV</Button>
          <ButtonLink to="/register" variant="primary">
            <Plus size={18} strokeWidth={2.4} />
            Register student
          </ButtonLink>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_170px_170px_170px]">
        <Field label="Search" htmlFor="search">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-subtle"
            />
            <Input
              id="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                resetPage()
              }}
              placeholder="Search by name or LRN"
              className="pl-11"
            />
          </div>
        </Field>

        <Field label="Grade level" htmlFor="grade">
          <Select
            id="grade"
            value={grade}
            onChange={(e) => {
              setGrade(e.target.value)
              resetPage()
            }}
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
            onChange={(e) => {
              setSection(e.target.value)
              resetPage()
            }}
          >
            <option value="">All sections</option>
            {SECTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="ID status" htmlFor="status">
          <Select
            id="status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              resetPage()
            }}
          >
            <option value="">All</option>
            {(Object.keys(ID_STATUS_LABEL) as IdStatus[]).map((s) => (
              <option key={s} value={s}>
                {ID_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          {selected.length > 0 && (
            <div className="flex h-14 items-center justify-between gap-4 bg-brand-soft px-5">
              <span className="text-[15px] font-semibold text-brand">
                {selected.length} selected
              </span>
              <Button variant="primary" size="sm">
                Add to print queue
              </Button>
            </div>
          )}

          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[68px]" />
              <col className="w-16" />
              <col />
              <col className="w-[190px]" />
              <col className="w-[190px]" />
              <col className="w-[170px]" />
              <col className="w-[150px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-line-soft text-[13px] font-semibold tracking-wide text-muted uppercase">
                <th scope="col" className="py-3 pl-5">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    aria-label="Select all students on this page"
                    className="size-[18px] cursor-pointer accent-brand"
                  />
                </th>
                <th scope="col" className="sr-only">
                  Photo
                </th>
                <th scope="col" className="py-3">
                  Name
                </th>
                <th scope="col" className="py-3">
                  LRN
                </th>
                <th scope="col" className="py-3">
                  Grade &amp; Section
                </th>
                <th scope="col" className="py-3">
                  ID status
                </th>
                <th scope="col" className="py-3 pr-5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <StudentRow
                  key={s.id}
                  student={s}
                  checked={selected.includes(s.id)}
                  onToggle={() => toggleRow(s.id)}
                />
              ))}
              {loading && (
                <tr>
                  <td colSpan={7}>
                    <LoadingBlock label="Loading students…" />
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-muted">
                    No students match those filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between gap-4 border-t border-line-soft px-5 py-3.5">
            <span className="text-sm text-muted">
              {total === 0
                ? 'Showing 0 of 0'
                : `Showing ${page * PAGE_SIZE + 1}–${
                    page * PAGE_SIZE + rows.length
                  } of ${total}`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                disabled={page >= pageCount - 1 || loading}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StudentRow({
  student,
  checked,
  onToggle,
}: {
  student: Student
  checked: boolean
  onToggle: () => void
}) {
  return (
    <tr className="border-b border-line-soft last:border-b-0 hover:bg-cream/60">
      <td className="py-3 pl-5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={`Select ${fullName(student)}`}
          className="size-[18px] cursor-pointer accent-brand"
        />
      </td>
      <td className="py-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-placeholder-bg text-subtle">
          <User size={20} strokeWidth={1.8} />
        </div>
      </td>
      <td className="py-3 pr-4">
        <Link
          to={`/students/${student.id}`}
          className="text-[15px] font-semibold text-ink hover:text-brand hover:underline"
        >
          {fullName(student)}
        </Link>
      </td>
      <td className="py-3 pr-4 text-[15px] text-muted tabular-nums">
        {student.lrn}
      </td>
      <td className="py-3 pr-4 text-[15px] text-muted">
        {gradeAndSection(student)}
      </td>
      <td className="py-3 pr-4">
        <Badge tone={STATUS_TONE[student.idStatus]}>
          {ID_STATUS_LABEL[student.idStatus]}
        </Badge>
      </td>
      <td className="py-3 pr-5">
        <div className="flex items-center justify-end gap-2">
          <ButtonLink to={`/students/${student.id}`} size="sm">
            View
          </ButtonLink>
          <IconButton label={`Print ID for ${fullName(student)}`}>
            <Printer size={17} strokeWidth={1.9} />
          </IconButton>
        </div>
      </td>
    </tr>
  )
}
