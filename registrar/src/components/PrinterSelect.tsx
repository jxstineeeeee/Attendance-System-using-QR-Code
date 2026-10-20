import { AlertTriangle, Printer as PrinterIcon } from 'lucide-react'
import { usePrinter } from '../lib/printer'
import { Field, Select } from './ui'

/**
 * Picks the printer ID cards are sent to. The options are the printers
 * installed on the machine running the API — in this setup, the registrar's
 * own PC — and the choice is remembered in this browser.
 */
export function PrinterSelect({ id = 'printer' }: { id?: string }) {
  const { printers, selected, select, loading, note, host } = usePrinter()

  const current = printers.find((p) => p.name === selected)

  const hint = loading
    ? 'Looking for printers…'
    : printers.length === 0
      ? note || 'No printers are installed on this machine.'
      : current?.offline
        ? 'Windows reports this printer as offline.'
        : current?.virtual
          ? 'This one saves to a file rather than printing a card.'
          : current
            ? `Connected on ${current.port}${host ? ` · ${host}` : ''}`
            : 'Choose where ID cards should come out.'

  const warn = !loading && (printers.length === 0 || !!current?.offline)

  return (
    <Field
      label="Printer"
      htmlFor={id}
      hint={
        <p
          className={
            warn
              ? 'flex items-center gap-1.5 text-[13px] text-danger-fg'
              : 'flex items-center gap-1.5 text-[13px] text-muted'
          }
        >
          {warn ? (
            <AlertTriangle size={14} strokeWidth={2.2} className="shrink-0" />
          ) : (
            <PrinterIcon size={14} strokeWidth={2} className="shrink-0" />
          )}
          {hint}
        </p>
      }
    >
      <Select
        id={id}
        value={selected}
        onChange={(e) => select(e.target.value)}
        disabled={loading || printers.length === 0}
      >
        {printers.length === 0 && (
          <option value="">{loading ? 'Loading…' : 'No printer found'}</option>
        )}
        {printers.map((p) => (
          <option key={p.name} value={p.name}>
            {p.name}
            {p.isDefault ? ' (default)' : ''}
            {p.offline ? ' — offline' : ''}
          </option>
        ))}
      </Select>
    </Field>
  )
}
