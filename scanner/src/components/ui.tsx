import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(' ')

/** Gate controls are thumb-sized: this runs on a tablet held one-handed. */
export function Button({
  variant = 'secondary',
  block,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  block?: boolean
}) {
  const styles = {
    primary: 'bg-brand text-white hover:bg-brand-hover',
    secondary: 'bg-white text-ink border border-line hover:bg-cream',
    ghost: 'bg-transparent text-white/80 hover:text-white',
  }[variant]

  return (
    <button
      className={cx(
        'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2',
        'rounded-xl px-5 text-[17px] font-semibold transition',
        'disabled:cursor-not-allowed disabled:opacity-50',
        block && 'w-full',
        styles,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[13px] font-semibold tracking-wide text-muted uppercase"
      >
        {label}
      </label>
      {children}
      {hint}
    </div>
  )
}

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        'h-12 rounded-xl border border-line bg-white px-4 text-[17px]',
        'outline-none focus:border-brand focus:ring-2 focus:ring-brand/20',
        className,
      )}
      {...rest}
    />
  )
}

export function Card({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cx('rounded-2xl border border-line bg-white', className)}>
      {children}
    </div>
  )
}
