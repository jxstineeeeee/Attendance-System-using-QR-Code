import type { LucideIcon } from 'lucide-react'
import { Printer, RotateCcw } from 'lucide-react'
import { ButtonLink, Card } from '../components/ui'

/**
 * Print Queue and Reissue / Revoke appear in the sidebar but were not drawn in
 * the Figma file. These keep navigation from dead-ending until they are designed.
 */
function Placeholder({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="display-title text-[40px] leading-none text-ink">
        {title}
      </h1>
      <Card className="flex flex-col items-center gap-4 px-6 py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Icon size={26} strokeWidth={1.8} />
        </div>
        <p className="max-w-md text-[15px] leading-relaxed text-muted">
          {description}
        </p>
        <ButtonLink to="/students" variant="secondary" size="sm">
          Back to students
        </ButtonLink>
      </Card>
    </div>
  )
}

export function PrintQueue() {
  return (
    <Placeholder
      icon={Printer}
      title="Print Queue"
      description="Students queued for ID printing will be batched here, with per-card status and a reprint action. This screen has not been designed yet."
    />
  )
}

export function ReissueRevoke() {
  return (
    <Placeholder
      icon={RotateCcw}
      title="Reissue / Revoke"
      description="Lost or damaged IDs will be revoked and reissued here, with the reason recorded against the student's card history. This screen has not been designed yet."
    />
  )
}
