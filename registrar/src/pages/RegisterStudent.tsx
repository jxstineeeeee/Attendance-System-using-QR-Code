import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  Printer,
  Upload,
  User,
} from 'lucide-react'
import { RELATIONSHIPS } from '../lib/types'
import { isLrnTaken, registerStudent } from '../lib/db'
import { sectionsFor, useRoster } from '../lib/roster'
import { usePrinter } from '../lib/printer'
import { PrinterSelect } from '../components/PrinterSelect'
import {
  Button,
  Card,
  CardTitle,
  Field,
  Input,
  Select,
} from '../components/ui'
import { FormError } from '../components/states'
import { IdCardPreview } from '../components/IdCardPreview'

const EMPTY = {
  lrn: '',
  lastName: '',
  firstName: '',
  middleName: '',
  suffix: '',
  sex: '',
  gradeLevel: '',
  section: '',
  guardianName: '',
  relationship: '',
  contactNumber: '',
}

const LRN_PATTERN = /^\d{12}$/

export function RegisterStudent() {
  const navigate = useNavigate()
  const { roster, error: rosterError } = useRoster()
  const { selected: printer } = usePrinter()
  const [form, setForm] = useState(EMPTY)
  const [lrnTaken, setLrnTaken] = useState(false)
  const [checkingLrn, setCheckingLrn] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const lrnComplete = LRN_PATTERN.test(form.lrn)
  const lrnValid = lrnComplete && !lrnTaken

  const sections = sectionsFor(roster, form.gradeLevel)
  // The section a learner is enrolled in is what carries the strand, so it is
  // shown rather than chosen — picking Grade 11 Kamagong is picking STEM.
  const strand =
    roster.sections.find(
      (s) => s.gradeLevel === form.gradeLevel && s.name === form.section,
    )?.strand ?? ''

  // The uniqueness check is a round trip, so only ask once the LRN is complete
  // and the user has paused. The unique index is still the real guard.
  useEffect(() => {
    if (!lrnComplete) {
      setLrnTaken(false)
      setCheckingLrn(false)
      return
    }

    let cancelled = false
    setCheckingLrn(true)
    const t = setTimeout(() => {
      isLrnTaken(form.lrn)
        .then((taken) => {
          if (!cancelled) setLrnTaken(taken)
        })
        .catch(() => {
          // A failed lookup shouldn't block the form; the insert will catch it.
          if (!cancelled) setLrnTaken(false)
        })
        .finally(() => {
          if (!cancelled) setCheckingLrn(false)
        })
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [form.lrn, lrnComplete])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!lrnValid) {
      setError('Enter a valid 12-digit LRN that is not already registered.')
      return
    }

    setSubmitting(true)
    try {
      const id = await registerStudent(form, printer)
      navigate(`/students/${id}`)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save this student.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Link
          to="/students"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand hover:underline"
        >
          <ArrowLeft size={15} strokeWidth={2.2} />
          Back to students
        </Link>
        <h1 className="display-title text-[40px] leading-none text-ink">
          Register Student
        </h1>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-5">
          <Card className="p-6">
            <CardTitle>Learner information</CardTitle>

            <div className="mt-5 flex flex-col gap-5">
              <Field
                label="LRN (Learner Reference Number)"
                htmlFor="lrn"
                required
                hint={
                  <p
                    className={
                      form.lrn && !lrnValid && !checkingLrn
                        ? 'flex items-center gap-1.5 text-[13px] text-danger-fg'
                        : 'flex items-center gap-1.5 text-[13px] text-brand-ink'
                    }
                  >
                    {checkingLrn ? (
                      <Loader2
                        size={14}
                        strokeWidth={2.4}
                        className="shrink-0 animate-spin"
                      />
                    ) : (
                      <Check size={14} strokeWidth={2.4} className="shrink-0" />
                    )}
                    {checkingLrn
                      ? 'Checking whether this LRN is already registered…'
                      : lrnTaken
                        ? 'This LRN is already registered.'
                        : 'Must be exactly 12 digits and not already registered. The QR code is generated from this.'}
                  </p>
                }
              >
                <Input
                  id="lrn"
                  value={form.lrn}
                  onChange={(e) =>
                    set('lrn')(e.target.value.replace(/\D/g, '').slice(0, 12))
                  }
                  placeholder="12-digit LRN"
                  inputMode="numeric"
                  required
                  className="h-12 text-lg tracking-[0.12em] tabular-nums"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label="Last name" htmlFor="lastName" required>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => set('lastName')(e.target.value)}
                    required
                  />
                </Field>
                <Field label="First name" htmlFor="firstName" required>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => set('firstName')(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Middle name" htmlFor="middleName">
                  <Input
                    id="middleName"
                    value={form.middleName}
                    onChange={(e) => set('middleName')(e.target.value)}
                  />
                </Field>
                <Field label="Suffix" htmlFor="suffix">
                  <Input
                    id="suffix"
                    value={form.suffix}
                    onChange={(e) => set('suffix')(e.target.value)}
                    placeholder="Jr., III"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label="Sex" htmlFor="sex">
                  <Select
                    id="sex"
                    value={form.sex}
                    onChange={(e) => set('sex')(e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </Select>
                </Field>
                <Field label="Grade level" htmlFor="gradeLevel" required>
                  <Select
                    id="gradeLevel"
                    value={form.gradeLevel}
                    onChange={(e) => {
                      // Sections belong to one grade, so the old pick cannot
                      // carry over.
                      setForm((f) => ({
                        ...f,
                        gradeLevel: e.target.value,
                        section: '',
                      }))
                    }}
                    required
                  >
                    <option value="">Select grade</option>
                    {roster.grades.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Section" htmlFor="section" required>
                  <Select
                    id="section"
                    value={form.section}
                    onChange={(e) => set('section')(e.target.value)}
                    disabled={!form.gradeLevel}
                    required
                  >
                    <option value="">
                      {form.gradeLevel ? 'Select section' : 'Pick a grade first'}
                    </option>
                    {sections.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Strand (SHS only)"
                  htmlFor="strand"
                  hint={
                    <p className="text-[13px] text-muted">
                      Set by the section.
                    </p>
                  }
                >
                  <Input id="strand" value={strand || 'None'} readOnly disabled />
                </Field>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Card className="p-6">
              <div className="flex gap-5">
                <div className="flex h-[150px] w-30 shrink-0 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line-strong bg-cream text-subtle">
                  <User size={40} strokeWidth={1.4} />
                  <span className="text-[13px]">No photo yet</span>
                </div>
                <div className="flex min-w-0 flex-col gap-2.5">
                  <CardTitle>
                    Photo <span className="text-danger-fg">*</span>
                  </CardTitle>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="w-full"
                  >
                    <Camera size={16} strokeWidth={2} />
                    Use webcam
                  </Button>
                  <Button type="button" size="sm" className="w-full">
                    <Upload size={16} strokeWidth={2} />
                    Upload file
                  </Button>
                  <p className="text-[13px] leading-snug text-muted">
                    JPG or PNG. Plain background, face centered.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <CardTitle>Emergency contact</CardTitle>
              <div className="mt-5 flex flex-col gap-4">
                <Field
                  label="Parent / guardian name"
                  htmlFor="guardianName"
                  required
                >
                  <Input
                    id="guardianName"
                    value={form.guardianName}
                    onChange={(e) => set('guardianName')(e.target.value)}
                    required
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Relationship" htmlFor="relationship">
                    <Select
                      id="relationship"
                      value={form.relationship}
                      onChange={(e) => set('relationship')(e.target.value)}
                    >
                      <option value="">Select</option>
                      {RELATIONSHIPS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Contact number" htmlFor="contactNumber" required>
                    <Input
                      id="contactNumber"
                      value={form.contactNumber}
                      onChange={(e) => set('contactNumber')(e.target.value)}
                      placeholder="09XX XXX XXXX"
                      inputMode="tel"
                      required
                    />
                  </Field>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Card className="flex flex-col gap-6 p-6 xl:sticky xl:top-8">
          <CardTitle>ID preview</CardTitle>

          <IdCardPreview
            data={{
              lastName: form.lastName.toUpperCase(),
              firstName: form.firstName,
              middleInitial: form.middleName.charAt(0).toUpperCase(),
              lrn: form.lrn,
              gradeLevel: form.gradeLevel,
              section: form.section,
              guardianName: form.guardianName,
              contactNumber: form.contactNumber,
            }}
          />

          <div className="flex items-center justify-between gap-4 rounded-lg bg-cream px-3.5 py-3">
            <span className="text-[13px] font-bold tracking-[0.1em] text-muted">
              QR CONTENT
            </span>
            <span className="truncate text-[15px] font-semibold text-ink tabular-nums">
              {form.lrn || '[LRN]'}-[CARD CODE]
            </span>
          </div>

          <PrinterSelect />

          <div className="flex flex-col gap-2">
            {(error || rosterError) && (
              <FormError message={error || rosterError} />
            )}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 size={22} strokeWidth={1.9} className="animate-spin" />
              ) : (
                <Printer size={22} strokeWidth={1.9} />
              )}
              {submitting ? 'Saving…' : 'Register & Print ID'}
            </Button>
            <p className="text-center text-[13px] text-muted">
              Saves the student and issues their first ID card.
            </p>
            <Link
              to="/students"
              className="text-center text-[15px] font-semibold text-muted hover:text-ink hover:underline"
            >
              Cancel
            </Link>
          </div>
        </Card>
      </div>
    </form>
  )
}
