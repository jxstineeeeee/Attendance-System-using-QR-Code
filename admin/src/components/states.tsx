import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from './ui'

/** Shared async states, so every screen reports loading and failure the same way. */

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2.5 px-6 py-16 text-[15px] text-muted"
    >
      <Loader2 size={20} className="animate-spin" strokeWidth={2} />
      {label}
    </div>
  )
}

export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-danger-bg bg-danger-bg/40 px-6 py-12 text-center"
    >
      <AlertTriangle size={24} strokeWidth={2} className="text-danger-fg" />
      <p className="max-w-md text-[15px] leading-relaxed text-danger-fg">
        {message}
      </p>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

/** Inline form-level error, shown above a submit button. */
export function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg bg-danger-bg px-3.5 py-2.5 text-[14px] leading-snug text-danger-fg"
    >
      <AlertTriangle size={16} strokeWidth={2.2} className="mt-0.5 shrink-0" />
      {message}
    </p>
  )
}
