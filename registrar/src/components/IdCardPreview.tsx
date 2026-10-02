import { User } from 'lucide-react'
import { SCHOOL } from '../lib/types'

export interface IdCardData {
  lastName: string
  firstName: string
  middleInitial: string
  lrn: string
  gradeLevel: string
  section: string
  guardianName: string
  contactNumber: string
}

/** Stand-in for the real QR: the three finder patterns plus an alignment block. */
function QrPlaceholder() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="size-full"
      role="img"
      aria-label="QR code placeholder"
    >
      <rect width="100" height="100" fill="#ffffff" />
      {[
        [6, 6],
        [66, 6],
        [6, 66],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="28" height="28" fill="#1a1a17" />
          <rect x={x + 6} y={y + 6} width="16" height="16" fill="#ffffff" />
          <rect x={x + 10} y={y + 10} width="8" height="8" fill="#1a1a17" />
        </g>
      ))}
      <rect x="44" y="44" width="18" height="18" fill="#1a1a17" />
      <rect x="48" y="48" width="10" height="10" fill="#ffffff" />
    </svg>
  )
}

function CardFront({ data }: { data: IdCardData }) {
  return (
    <div className="flex h-[270px] w-[170px] flex-col overflow-hidden rounded-md border border-brand bg-white">
      <div className="flex h-[50px] shrink-0 items-center gap-2 bg-brand px-2.5">
        <div className="size-7 shrink-0 rounded-full bg-white" />
        <span className="display-title truncate text-[11px] leading-tight text-white">
          {SCHOOL.name}
        </span>
      </div>
      <div className="h-0.5 shrink-0 bg-gold" />

      <div className="flex flex-1 flex-col items-center px-2 pt-2.5">
        <div className="flex h-23 w-20 items-center justify-center rounded-sm border border-line-strong bg-placeholder-bg text-subtle">
          <User size={26} strokeWidth={1.6} />
        </div>
        <p className="display-title mt-2 max-w-full truncate text-[15px] text-ink">
          {data.lastName || '[LAST NAME]'}
        </p>
        <p className="max-w-full truncate text-[10px] text-muted">
          {data.firstName || '[First Name]'}
          {data.middleInitial ? ` ${data.middleInitial}.` : ''}
        </p>
        <p className="mt-0.5 text-[10px] font-semibold text-brand tabular-nums">
          LRN {data.lrn || '[000000000000]'}
        </p>
        <p className="text-[9px] text-muted">
          {data.gradeLevel || '[Grade]'} – {data.section || '[Section]'}
        </p>
      </div>

      <div className="flex h-[22px] shrink-0 items-center justify-center bg-brand">
        <span className="text-[9px] font-bold tracking-[0.18em] text-white">
          STUDENT
        </span>
      </div>
    </div>
  )
}

function CardBack({ data }: { data: IdCardData }) {
  return (
    <div className="flex h-[270px] w-[170px] flex-col overflow-hidden rounded-md border border-brand bg-white">
      <div className="h-2 shrink-0 bg-gold" />

      <div className="flex flex-1 flex-col items-center px-3 pt-2.5">
        <span className="text-[9px] font-bold tracking-[0.12em] text-muted">
          SCAN AT ENTRANCE
        </span>
        <div className="mt-2 size-25 border border-line-soft">
          <QrPlaceholder />
        </div>

        <div className="mt-3 w-full rounded-sm bg-brand-soft px-2 py-1.5">
          <p className="text-[8px] font-bold tracking-[0.1em] text-brand">
            EMERGENCY CONTACT
          </p>
          <p className="truncate text-[9px] text-ink">
            {data.guardianName || '[Guardian Name]'}
          </p>
          <p className="text-[9px] text-ink tabular-nums">
            {data.contactNumber || '[09XX XXX XXXX]'}
          </p>
        </div>

        <div className="mt-3 flex w-full items-end justify-between gap-3">
          {['Student', 'Registrar'].map((role) => (
            <div key={role} className="flex-1 border-t border-line-strong pt-0.5">
              <p className="text-center text-[8px] text-muted">{role}</p>
            </div>
          ))}
        </div>

        <p className="mt-2 text-[9px] text-muted">
          Valid S.Y. {SCHOOL.schoolYear}
        </p>
      </div>

      <div className="h-2 shrink-0 bg-gold" />
    </div>
  )
}

export function IdCardPreview({ data }: { data: IdCardData }) {
  return (
    <div className="flex justify-center gap-6">
      {[
        { label: 'FRONT', node: <CardFront data={data} /> },
        { label: 'BACK', node: <CardBack data={data} /> },
      ].map(({ label, node }) => (
        <div key={label} className="flex flex-col items-center gap-2">
          <span className="text-[11px] font-bold tracking-[0.14em] text-muted">
            {label}
          </span>
          {node}
        </div>
      ))}
    </div>
  )
}
