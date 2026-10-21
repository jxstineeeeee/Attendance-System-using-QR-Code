import { clockTime, type ScanResult, type SessionTimes } from '../lib/gate'

/**
 * The full-bleed verdict. A guard reads this from arm's length while the next
 * learner steps up, so it is colour first, three words second, detail last.
 *
 * Underneath the verdict sits the learner's whole day — morning in and out,
 * afternoon in and out — because the question at the gate is usually "has
 * this one already been through?" rather than "what just happened?".
 */

const LOOK = {
  ok: { bg: 'bg-ok', heading: 'Welcome' },
  late: { bg: 'bg-late', heading: 'Late' },
  invalid: { bg: 'bg-bad', heading: 'Not accepted' },
} as const

const SESSION_LABEL = { am: 'MORNING', pm: 'AFTERNOON' } as const

function DayCell({
  label,
  session,
  which,
  highlight,
}: {
  label: string
  session: SessionTimes | null
  which: 'timeIn' | 'timeOut'
  /** True for the half this scan just wrote. */
  highlight: boolean
}) {
  return (
    <div
      className={`flex flex-col gap-0.5 rounded-xl px-3 py-2.5 ${
        highlight ? 'bg-white/30' : 'bg-white/12'
      }`}
    >
      <span className="text-[12px] font-semibold tracking-wide text-white/70 uppercase">
        {label}
      </span>
      <span className="text-[19px] font-semibold tabular-nums">
        {clockTime(session?.[which] ?? null)}
      </span>
    </div>
  )
}

export function ScanResultPanel({
  result,
  stale = false,
}: {
  result: ScanResult
  /** True once the verdict is old enough that the next learner may be up. */
  stale?: boolean
}) {
  const look = LOOK[result.outcome]
  const accepted = result.outcome !== 'invalid'
  const what = `${SESSION_LABEL[result.session]} ${
    result.direction === 'in' ? 'TIME IN' : 'TIME OUT'
  }`

  return (
    <div
      role="status"
      className={`flex flex-col gap-5 rounded-2xl p-7 text-white transition-opacity ${look.bg} ${
        stale ? 'opacity-45' : 'opacity-100'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="display-title text-[44px] leading-none">
            {look.heading}
          </span>
          <span className="text-[17px] font-semibold text-white/80">
            {accepted ? what : (result.reason ?? 'Refused')}
            {' · '}
            {clockTime(result.at)}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {result.duplicate && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-[13px] font-semibold">
              Already recorded
            </span>
          )}
          {stale && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-[13px] font-semibold">
              Previous scan
            </span>
          )}
        </div>
      </div>

      {result.student ? (
        <div className="flex flex-col gap-1 rounded-xl bg-white/15 p-5">
          <span className="display-title text-[30px] leading-tight">
            {result.student.name}
          </span>
          <span className="text-[17px] text-white/85 tabular-nums">
            LRN {result.student.lrn}
          </span>
          <span className="text-[17px] text-white/85">
            {result.student.gradeSection || 'Not enrolled this year'}
          </span>
        </div>
      ) : (
        <p className="rounded-xl bg-white/15 p-5 text-[17px] leading-snug">
          That code does not belong to any ID card in the system.
        </p>
      )}

      {result.student && (
        <div className="grid grid-cols-4 gap-2">
          <DayCell
            label="AM in"
            session={result.day.am}
            which="timeIn"
            highlight={result.session === 'am' && result.direction === 'in'}
          />
          <DayCell
            label="AM out"
            session={result.day.am}
            which="timeOut"
            highlight={result.session === 'am' && result.direction === 'out'}
          />
          <DayCell
            label="PM in"
            session={result.day.pm}
            which="timeIn"
            highlight={result.session === 'pm' && result.direction === 'in'}
          />
          <DayCell
            label="PM out"
            session={result.day.pm}
            which="timeOut"
            highlight={result.session === 'pm' && result.direction === 'out'}
          />
        </div>
      )}
    </div>
  )
}
