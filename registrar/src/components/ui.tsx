import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'
import { Link, type LinkProps } from 'react-router-dom'

export const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(' ')

/* ------------------------------------------------------------------ Button */

type Variant = 'primary' | 'secondary' | 'danger' | 'quiet'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-white border border-brand hover:bg-brand-hover active:bg-brand-hover',
  secondary:
    'bg-white text-ink border border-line-strong hover:bg-cream active:bg-line-soft',
  danger:
    'bg-white text-danger-fg border border-danger-line hover:bg-danger-bg active:bg-danger-bg',
  quiet:
    'bg-transparent text-brand border border-transparent hover:bg-brand-soft',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-[46px] px-[18px] text-[15px] gap-2',
  lg: 'h-[52px] px-[18px] text-[17px] gap-2.5',
}

const BUTTON_BASE =
  'inline-flex items-center justify-center rounded-lg font-semibold whitespace-nowrap ' +
  'transition-colors cursor-pointer select-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ' +
  'disabled:opacity-50 disabled:cursor-not-allowed'

const buttonClasses = (
  variant: Variant,
  size: Size,
  block?: boolean,
  className?: string,
) => cx(BUTTON_BASE, VARIANTS[variant], SIZES[size], block && 'w-full', className)

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  block?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  block,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={buttonClasses(variant, size, block, className)}
      {...rest}
    />
  )
}

/** Same surface as Button, but navigates — keeps anchors out of <button>. */
export function ButtonLink({
  variant = 'secondary',
  size = 'md',
  block,
  className,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size; block?: boolean }) {
  return (
    <Link className={buttonClasses(variant, size, block, className)} {...rest} />
  )
}

/** Square button that holds only an icon; keeps the 36px row-action footprint. */
export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-9 items-center justify-center rounded-lg',
        'border border-line-strong bg-white text-muted',
        'transition-colors cursor-pointer hover:bg-cream hover:text-ink',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------- Badge */

export type Tone = 'success' | 'warn' | 'danger' | 'neutral'

const TONES: Record<Tone, string> = {
  success: 'bg-brand-soft text-brand',
  warn: 'bg-warn-bg text-warn-fg',
  danger: 'bg-danger-bg text-danger-fg',
  neutral: 'bg-line-soft text-muted',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-md px-2.5 py-1 text-[13px] font-semibold leading-none',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/* -------------------------------------------------------------- Form field */

const CONTROL =
  'w-full rounded-lg border border-line-strong bg-white px-[15px] text-[15px] text-ink ' +
  'placeholder:text-subtle transition-shadow ' +
  'focus:outline-none focus:border-brand focus:ring-3 focus:ring-brand/18'

export function Label({
  children,
  required,
  htmlFor,
  className,
}: {
  children: ReactNode
  required?: boolean
  htmlFor?: string
  className?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cx('text-sm font-semibold text-ink', className)}
    >
      {children}
      {required && <span className="ml-1 text-danger-fg">*</span>}
    </label>
  )
}

export function Field({
  label,
  required,
  htmlFor,
  hint,
  children,
  className,
}: {
  label?: string
  required?: boolean
  htmlFor?: string
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {hint}
    </div>
  )
}

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(CONTROL, 'h-11', className)} {...rest} />
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cx(
          CONTROL,
          'h-11 cursor-pointer appearance-none pr-9',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs text-muted"
      >
        &#9662;
      </span>
    </div>
  )
}

/* -------------------------------------------------------------------- Card */

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cx(
        'rounded-xl border border-line bg-white',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function CardTitle({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <h2 className={cx('display-title text-xl text-ink', className)}>
      {children}
    </h2>
  )
}

/** Small stacked label/value pair used across the profile read-only views. */
export function DataPoint({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-[15px] font-medium text-ink">{value}</span>
    </div>
  )
}
