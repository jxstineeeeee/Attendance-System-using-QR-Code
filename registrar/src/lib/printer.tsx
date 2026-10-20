import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { listPrinters, type Printer } from './db'

/**
 * Which printer the registrar is sending ID cards to.
 *
 * The list comes from the machine running the API — a browser has no way to
 * enumerate printers — and the choice is remembered in this browser, because
 * it belongs to the desk the person is sitting at, not to their account.
 */
const STORAGE_KEY = 'qr-registrar.printer'

interface PrinterValue {
  printers: Printer[]
  /** The selected printer's name, or '' when none is chosen or available. */
  selected: string
  select: (name: string) => void
  loading: boolean
  /** Why no printer can be offered, when that is the case. */
  note: string
  /** The machine the printers are attached to. */
  host: string
}

const PrinterContext = createContext<PrinterValue | null>(null)

function remembered(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    // Private mode or blocked storage: fall back to the OS default below.
    return ''
  }
}

export function PrinterProvider({ children }: { children: ReactNode }) {
  const [printers, setPrinters] = useState<Printer[]>([])
  const [selected, setSelected] = useState(remembered)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [host, setHost] = useState('')

  useEffect(() => {
    let cancelled = false

    listPrinters()
      .then((res) => {
        if (cancelled) return
        setPrinters(res.printers)
        setHost(res.host)
        setNote(res.note ?? '')

        // Keep the remembered choice only while that printer still exists —
        // otherwise fall back to whatever Windows calls the default.
        setSelected((current) => {
          if (current && res.printers.some((p) => p.name === current)) {
            return current
          }
          return res.printers.find((p) => p.isDefault)?.name ?? ''
        })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setNote(
          err instanceof Error ? err.message : 'Could not reach the printer list.',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const select = useCallback((name: string) => {
    setSelected(name)
    try {
      localStorage.setItem(STORAGE_KEY, name)
    } catch {
      // Not being able to remember it is not worth failing a print over.
    }
  }, [])

  const value = useMemo(
    () => ({ printers, selected, select, loading, note, host }),
    [printers, selected, select, loading, note, host],
  )

  return (
    <PrinterContext.Provider value={value}>{children}</PrinterContext.Provider>
  )
}

export function usePrinter() {
  const ctx = useContext(PrinterContext)
  if (!ctx) throw new Error('usePrinter must be used inside <PrinterProvider>')
  return ctx
}
