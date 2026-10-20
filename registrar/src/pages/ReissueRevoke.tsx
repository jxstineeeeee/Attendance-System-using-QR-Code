import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Search } from 'lucide-react'
import {
  REISSUE_REASONS,
  REVOKE_REASONS,
  fullName,
  gradeAndSection,
  type Student,
} from '../lib/types'
import {
  issueCard,
  listStudents,
  reissueCard,
  revokeActiveCard,
} from '../lib/db'
import { Badge, Button, Card, CardTitle, Field, Input, Select } from '../components/ui'
import { ErrorBlock, FormError, LoadingBlock } from '../components/states'
import { PrinterSelect } from '../components/PrinterSelect'
import { usePrinter } from '../lib/printer'

const PAGE_SIZE = 6

/** Which row is mid-action, and what it is about to do. */
type Pending = { studentId: string; kind: 'revoke' | 'reissue' } | null

/**
 * Reissue / Revoke — the screen for a learner who turned up without a usable
 * ID. It works student-first rather than card-first: the API resolves which
 * card is active, so nothing here has to carry a card id around.
 *
 * Two lists, because they are two different jobs:
 *   - learners whose cards have all been revoked and are waiting for a new one
 *   - learners holding a card that may need replacing or killing
 */
export function ReissueRevoke() {
  // Bumped after any successful action, to refetch both lists at once.
  const [version, setVersion] = useState(0)
  const done = useCallback(() => setVersion((v) => v + 1), [])

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="display-title text-[40px] leading-none text-ink">
          Reissue / Revoke
        </h1>
        <p className="text-base text-muted">
          Replace a lost or damaged ID, or cancel one without printing a
          replacement. Every action is recorded against the learner's card
          history with its reason.
        </p>
      </header>

      <Card className="flex flex-wrap items-start justify-between gap-6 p-6">
        <div className="flex flex-col gap-1">
          <CardTitle>Where cards come out</CardTitle>
          <p className="max-w-lg text-[14px] text-muted">
            Every ID issued from this screen is recorded against this printer.
            The choice is remembered on this computer.
          </p>
        </div>
        <div className="w-full max-w-sm">
          <PrinterSelect id="printer-reissue" />
        </div>
      </Card>

      <NeedsReissue version={version} onDone={done} />
      <IssuedIds version={version} onDone={done} />
    </div>
  )
}

/** Learners whose cards have all been revoked — id_status 'reissue-needed'. */
function NeedsReissue({
  version,
  onDone,
}: {
  version: number
  onDone: () => void
}) {
  const { rows, total, loading, error, reload } = useStudentList(
    { status: 'reissue-needed' },
    0,
    50,
    version,
  )

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <CardTitle>Waiting for a replacement</CardTitle>
        {total > 0 && <Badge tone="danger">{total}</Badge>}
      </div>
      <p className="mt-1.5 text-[14px] text-muted">
        Every card these learners had has been revoked, so they cannot scan in
        at the gate.
      </p>

      {error ? (
        <div className="mt-5">
          <ErrorBlock message={error} onRetry={reload} />
        </div>
      ) : loading ? (
        <LoadingBlock label="Loading…" />
      ) : rows.length === 0 ? (
        <p className="mt-5 rounded-lg bg-brand-soft px-4 py-6 text-center text-[15px] text-brand-ink">
          Nobody is waiting for a replacement ID.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col">
          {rows.map((student) => (
            <IssueRow key={student.id} student={student} onDone={onDone} />
          ))}
        </ul>
      )}
    </Card>
  )
}

/** Learners holding an active card: the reissue and revoke targets. */
function IssuedIds({
  version,
  onDone,
}: {
  version: number
  onDone: () => void
}) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const { rows, total, loading, error, reload } = useStudentList(
    { status: 'printed', query: debounced },
    page,
    PAGE_SIZE,
    version,
  )

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1)
  }, [page, pageCount])

  return (
    <Card className="p-6">
      <CardTitle>Issued IDs</CardTitle>
      <p className="mt-1.5 text-[14px] text-muted">
        Reissuing revokes the current card and prints a new code in one step.
        Revoking leaves the learner without a card until one is issued.
      </p>

      <div className="mt-5 max-w-md">
        <Field label="Find a learner" htmlFor="reissue-search">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-subtle"
            />
            <Input
              id="reissue-search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(0)
              }}
              placeholder="Search by name or LRN"
              className="pl-11"
            />
          </div>
        </Field>
      </div>

      {error ? (
        <div className="mt-5">
          <ErrorBlock message={error} onRetry={reload} />
        </div>
      ) : loading ? (
        <LoadingBlock label="Loading…" />
      ) : rows.length === 0 ? (
        <p className="mt-5 rounded-lg bg-cream px-4 py-6 text-center text-[15px] text-muted">
          {debounced
            ? 'No learner with an active ID matches that search.'
            : 'No IDs have been issued yet.'}
        </p>
      ) : (
        <>
          <ul className="mt-5 flex flex-col">
            {rows.map((student) => (
              <ActionRow key={student.id} student={student} onDone={onDone} />
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between gap-4 border-t border-line-soft pt-3.5">
            <span className="text-sm text-muted">
              {`Showing ${page * PAGE_SIZE + 1}–${
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
        </>
      )}
    </Card>
  )
}

/** Name, LRN and class, shared by both lists. */
function LearnerCell({ student }: { student: Student }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Link
        to={`/students/${student.id}`}
        className="truncate text-[15px] font-semibold text-ink hover:text-brand hover:underline"
      >
        {fullName(student)}
      </Link>
      <span className="text-[13px] text-muted">
        LRN <span className="tabular-nums">{student.lrn}</span> ·{' '}
        {gradeAndSection(student)}
      </span>
    </div>
  )
}

/** A learner with no card: one button, no reason needed to issue. */
function IssueRow({
  student,
  onDone,
}: {
  student: Student
  onDone: () => void
}) {
  const { selected: printer } = usePrinter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    setBusy(true)
    setError('')
    try {
      await issueCard(student.id, printer)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That action failed.')
      setBusy(false)
    }
  }

  return (
    <li className="flex flex-col gap-2 border-b border-line-soft py-3.5 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <LearnerCell student={student} />
        <Button size="sm" variant="primary" disabled={busy} onClick={() => void run()}>
          {busy && <Loader2 size={15} className="animate-spin" strokeWidth={2.2} />}
          Issue new ID
        </Button>
      </div>
      {error && <FormError message={error} />}
    </li>
  )
}

/** A learner holding a card: reissue or revoke, each with a recorded reason. */
function ActionRow({
  student,
  onDone,
}: {
  student: Student
  onDone: () => void
}) {
  const { selected: printer } = usePrinter()
  const [pending, setPending] = useState<Pending>(null)
  const [reason, setReason] = useState(REISSUE_REASONS[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const open = (kind: 'revoke' | 'reissue') => {
    setPending({ studentId: student.id, kind })
    setReason(kind === 'revoke' ? REVOKE_REASONS[0] : REISSUE_REASONS[0])
    setError('')
  }

  async function confirm() {
    if (!pending) return
    setBusy(true)
    setError('')
    try {
      if (pending.kind === 'revoke') {
        await revokeActiveCard(student.id, reason)
      } else {
        await reissueCard(student.id, reason, printer)
      }
      setPending(null)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That action failed.')
    } finally {
      setBusy(false)
    }
  }

  const reasons = pending?.kind === 'revoke' ? REVOKE_REASONS : REISSUE_REASONS

  return (
    <li className="flex flex-col gap-3 border-b border-line-soft py-3.5 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <LearnerCell student={student} />
        <div className="flex items-center gap-2.5">
          <Badge tone="success">ID active</Badge>
          <Button size="sm" disabled={busy} onClick={() => open('reissue')}>
            Reissue
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => open('revoke')}
          >
            Revoke
          </Button>
        </div>
      </div>

      {pending && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg bg-cream px-4 py-3.5">
          <div className="flex min-w-[220px] flex-col gap-1.5">
            <label
              htmlFor={`reason-${student.id}`}
              className="text-[13px] font-semibold text-muted"
            >
              {pending.kind === 'revoke'
                ? 'Reason this ID is being cancelled'
                : 'Reason this ID is being replaced'}
            </label>
            <Select
              id={`reason-${student.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <Button
            size="sm"
            variant={pending.kind === 'revoke' ? 'danger' : 'primary'}
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy && <Loader2 size={15} className="animate-spin" strokeWidth={2.2} />}
            {pending.kind === 'revoke' ? 'Revoke this ID' : 'Revoke & issue new'}
          </Button>
          <Button size="sm" disabled={busy} onClick={() => setPending(null)}>
            Cancel
          </Button>
        </div>
      )}

      {error && <FormError message={error} />}
    </li>
  )
}

/** One page of students for a fixed filter, refetched whenever `version` moves. */
function useStudentList(
  filters: { status: string; query?: string },
  page: number,
  pageSize: number,
  version: number,
) {
  const [rows, setRows] = useState<Student[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  const { status, query } = filters

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    listStudents({ status, query }, page, pageSize)
      .then((res) => {
        if (cancelled) return
        setRows(res.rows)
        setTotal(res.total)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setRows([])
        setTotal(0)
        setError(err instanceof Error ? err.message : 'Could not load learners.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [status, query, page, pageSize, version, retry])

  return {
    rows,
    total,
    loading,
    error,
    reload: () => setRetry((r) => r + 1),
  }
}
