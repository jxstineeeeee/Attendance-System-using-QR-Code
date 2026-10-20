import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, User } from 'lucide-react'
import {
  REISSUE_REASONS,
  formatDate,
  fullName,
  gradeAndSection,
  type Student,
} from '../lib/types'
import {
  getStudent,
  issueCard,
  reissueCard,
  setStudentActive,
} from '../lib/db'
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardTitle,
  DataPoint,
  Select,
} from '../components/ui'
import { ErrorBlock, FormError, LoadingBlock } from '../components/states'
import { IdQrCode } from '../components/IdQrCode'
import { PrinterSelect } from '../components/PrinterSelect'
import { usePrinter } from '../lib/printer'

export function StudentProfile() {
  const { id } = useParams()

  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const found = await getStudent(id)
      if (!found) {
        setNotFound(true)
        setStudent(null)
      } else {
        setNotFound(false)
        setStudent(found)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this student.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !student) return <LoadingBlock label="Loading student…" />

  if (error && !student) {
    return <ErrorBlock message={error} onRetry={() => void load()} />
  }

  if (notFound || !student) {
    return (
      <div className="flex flex-col items-start gap-4 py-16">
        <h1 className="display-title text-3xl text-ink">Student not found</h1>
        <p className="text-muted">
          That record may have been removed or the link is out of date.
        </p>
        <ButtonLink to="/students" variant="primary">
          Back to students
        </ButtonLink>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/students"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand hover:underline"
      >
        <ArrowLeft size={15} strokeWidth={2.2} />
        Back to students
      </Link>

      <ProfileHeader student={student} onChanged={load} />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <CardTitle>Learner details</CardTitle>
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              <DataPoint label="Sex" value={student.sex ?? '—'} />
              <DataPoint label="Grade level" value={student.gradeLevel} />
              <DataPoint label="Section" value={student.section} />
              <DataPoint label="Strand" value={student.strand ?? '—'} />
              <DataPoint
                label="Registered"
                value={
                  student.registeredByName
                    ? `${formatDate(student.registeredOn)} by ${student.registeredByName}`
                    : formatDate(student.registeredOn)
                }
              />
              <DataPoint
                label="Last updated"
                value={formatDate(student.lastUpdated)}
              />
            </div>
          </Card>

          <Card className="p-6">
            <CardTitle>Emergency contact</CardTitle>
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              <DataPoint
                label="Parent / guardian"
                value={student.guardianName}
              />
              <DataPoint
                label="Relationship"
                value={student.relationship ?? '—'}
              />
              <DataPoint label="Contact number" value={student.contactNumber} />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <ActiveIdQr student={student} />
          <IdCardHistory student={student} />
        </div>
      </div>
    </div>
  )
}

function ProfileHeader({
  student,
  onChanged,
}: {
  student: Student
  onChanged: () => Promise<void>
}) {
  const { selected: printer } = usePrinter()
  const [busy, setBusy] = useState<'print' | 'reissue' | 'active' | null>(null)
  const [error, setError] = useState('')
  const [reissuing, setReissuing] = useState(false)
  const [reason, setReason] = useState(REISSUE_REASONS[0])

  const hasActiveCard = student.cards.some((c) => c.status === 'active')

  async function run(kind: 'print' | 'reissue' | 'active', task: () => Promise<void>) {
    setBusy(kind)
    setError('')
    try {
      await task()
      await onChanged()
      setReissuing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That action failed.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 items-start gap-5">
          <div className="flex h-[92px] w-20 shrink-0 items-center justify-center rounded-lg border-2 border-brand bg-placeholder-bg text-subtle">
            <User size={34} strokeWidth={1.5} />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="display-title text-4xl leading-none text-ink">
              {fullName(student)}
            </h1>
            <p className="text-lg font-semibold text-brand tabular-nums">
              LRN {student.lrn}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge tone={student.active ? 'success' : 'neutral'}>
                {student.active ? 'Active student' : 'Deactivated'}
              </Badge>
              {student.idStatus === 'printed' && (
                <Badge tone="success">ID printed</Badge>
              )}
              {student.idStatus === 'not-printed' && (
                <Badge tone="warn">Not printed</Badge>
              )}
              {student.idStatus === 'reissue-needed' && (
                <Badge tone="danger">Reissue needed</Badge>
              )}
              <span className="text-[15px] text-muted">
                {gradeAndSection(student)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button size="sm">Edit</Button>
          <Button
            size="sm"
            variant="primary"
            disabled={hasActiveCard || busy !== null}
            onClick={() =>
              void run('print', () => issueCard(student.id, printer))
            }
          >
            {busy === 'print' && (
              <Loader2 size={15} className="animate-spin" strokeWidth={2.2} />
            )}
            {hasActiveCard ? 'ID issued' : 'Print ID'}
          </Button>
          <Button
            size="sm"
            disabled={busy !== null}
            onClick={() => setReissuing((v) => !v)}
          >
            Reissue ID
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={busy !== null}
            onClick={() =>
              void run('active', () =>
                setStudentActive(student.id, !student.active),
              )
            }
          >
            {busy === 'active' && (
              <Loader2 size={15} className="animate-spin" strokeWidth={2.2} />
            )}
            {student.active ? 'Deactivate' : 'Reactivate'}
          </Button>
        </div>
      </div>

      {reissuing && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg bg-cream px-4 py-3.5">
          <div className="flex min-w-[200px] flex-col gap-1.5">
            <label
              htmlFor="reissue-reason"
              className="text-[13px] font-semibold text-muted"
            >
              Reason the current ID is being replaced
            </label>
            <Select
              id="reissue-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {REISSUE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <Button
            size="sm"
            variant="primary"
            disabled={busy !== null}
            onClick={() =>
              void run('reissue', () =>
                reissueCard(student.id, reason, printer),
              )
            }
          >
            {busy === 'reissue' && (
              <Loader2 size={15} className="animate-spin" strokeWidth={2.2} />
            )}
            Revoke &amp; issue new
          </Button>
          <Button size="sm" onClick={() => setReissuing(false)}>
            Cancel
          </Button>
        </div>
      )}

      {error && <FormError message={error} />}
    </Card>
  )
}

/**
 * The scannable code for the card the learner is carrying now. Revoked cards
 * deliberately get no QR here — showing one would invite printing a card the
 * gate is going to refuse.
 */
function ActiveIdQr({ student }: { student: Student }) {
  const active = student.cards.find((c) => c.status === 'active')

  return (
    <Card className="p-6">
      <CardTitle>QR code</CardTitle>

      {active ? (
        <div className="mt-5 flex flex-col items-center gap-3.5">
          <div className="rounded-lg border border-line bg-white p-3">
            <IdQrCode value={active.qrContent} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[17px] font-semibold text-ink tabular-nums">
              {active.qrContent}
            </span>
            <span className="text-center text-[13px] text-muted">
              LRN {student.lrn} + card code · issued{' '}
              {formatDate(active.issued)}
              {active.printer ? ` · ${active.printer}` : ''}
            </span>
          </div>

          <div className="mt-1 w-full border-t border-line-soft pt-4">
            <PrinterSelect id={`printer-${student.id}`} />
          </div>
        </div>
      ) : (
        <>
          <p className="mt-5 rounded-lg bg-cream px-4 py-6 text-center text-[15px] text-muted">
            {student.cards.length === 0
              ? 'No ID card has been issued yet, so there is no code to scan.'
              : 'Every card has been revoked. Reissue one to generate a new code.'}
          </p>
          <div className="mt-5 border-t border-line-soft pt-4">
            <PrinterSelect id={`printer-${student.id}`} />
          </div>
        </>
      )}
    </Card>
  )
}

function IdCardHistory({ student }: { student: Student }) {
  return (
    <Card className="p-6">
      <CardTitle>ID card history</CardTitle>

      {student.cards.length === 0 ? (
        <p className="mt-5 rounded-lg bg-cream px-4 py-6 text-center text-[15px] text-muted">
          No ID card has been issued yet.
        </p>
      ) : (
        <table className="mt-5 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line-soft text-[13px] font-semibold tracking-wide text-muted uppercase">
              <th scope="col" className="pb-2.5">
                QR content
              </th>
              <th scope="col" className="pb-2.5">
                Issued
              </th>
              <th scope="col" className="pb-2.5">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {student.cards.map((card) => (
              <tr
                key={card.id}
                className="border-b border-line-soft last:border-b-0"
              >
                <td className="py-3.5 pr-4 text-[15px] text-ink tabular-nums">
                  {card.qrContent}
                </td>
                <td className="py-3.5 pr-4 text-[15px] text-muted">
                  {formatDate(card.issued)}
                </td>
                <td className="py-3.5">
                  {card.status === 'active' ? (
                    <Badge tone="success">Active</Badge>
                  ) : (
                    <div className="flex flex-col items-start gap-1">
                      <Badge tone="danger">Revoked</Badge>
                      {card.reason && (
                        <span className="text-[13px] text-muted">
                          Reason: {card.reason}
                        </span>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-5 rounded-lg bg-cream px-4 py-3.5 text-[14px] leading-snug text-muted">
        Only the active card is accepted at the scanner. Revoked cards show
        “Invalid ID” at the gate.
      </p>
    </Card>
  )
}
