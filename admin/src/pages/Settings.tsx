import { useEffect, useState, type ReactNode } from 'react'
import { getSettings, saveSettings } from '../lib/db'
import { errorMessage, useAsync } from '../lib/useAsync'
import { formatClock, toTimeInput, type Settings as SettingsData } from '../lib/types'
import { ErrorBlock, FormError, LoadingBlock } from '../components/states'
import {
  Button,
  Card,
  CardTitle,
  Field,
  Input,
  PageHeader,
  Toggle,
} from '../components/ui'

/** The form's own copy of the row, with the times cut to "HH:MM" for inputs. */
type Draft = SettingsData

const toDraft = (s: SettingsData): Draft => ({
  ...s,
  gateOpensAt: toTimeInput(s.gateOpensAt),
  amLateCutoffAt: toTimeInput(s.amLateCutoffAt),
  amOutOpensAt: toTimeInput(s.amOutOpensAt),
  amOutClosesAt: toTimeInput(s.amOutClosesAt),
  pmInOpensAt: toTimeInput(s.pmInOpensAt),
  pmLateCutoffAt: toTimeInput(s.pmLateCutoffAt),
  pmOutOpensAt: toTimeInput(s.pmOutOpensAt),
  gateClosesAt: toTimeInput(s.gateClosesAt),
})

export function Settings() {
  const { data, loading, error, reload } = useAsync(getSettings, [])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saved, setSaved] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    if (data) {
      const next = toDraft(data.settings)
      setDraft(next)
      setSaved(next)
    }
  }, [data])

  if (loading && !draft) return <LoadingBlock label="Loading settings…" />
  if (error && !draft) return <ErrorBlock message={error} onRetry={reload} />
  if (!draft || !saved) return null

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d))
    setJustSaved(false)
  }

  async function handleSave() {
    if (!draft) return
    setBusy(true)
    setSaveError(null)
    try {
      const res = await saveSettings(draft)
      const next = toDraft(res.settings)
      setDraft(next)
      setSaved(next)
      setJustSaved(true)
    } catch (err) {
      setSaveError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Settings"
        description="School details and the rules the scanner applies at the gate."
      >
        <Button onClick={() => setDraft(saved)} disabled={!dirty || busy}>
          Discard
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!dirty || busy}
        >
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
      </PageHeader>

      {saveError && <FormError message={saveError} />}
      {justSaved && !dirty && (
        <p className="rounded-lg bg-brand-soft px-4 py-3 text-[14px] text-brand-ink">
          Saved. The gate reads these on every scan, so the change is already
          in force — there is no sync step.
        </p>
      )}

      <Card className="p-6">
        <CardTitle>School profile</CardTitle>
        <p className="mt-1 text-sm text-muted">
          Printed on ID cards and shown on every sign-in screen.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="School name" htmlFor="school-name">
            <Input
              id="school-name"
              value={draft.schoolName}
              onChange={(e) => set('schoolName', e.target.value)}
            />
          </Field>
          <Field label="School ID" htmlFor="school-id">
            <Input
              id="school-id"
              value={draft.schoolId ?? ''}
              onChange={(e) => set('schoolId', e.target.value)}
            />
          </Field>
          <Field
            label="Address"
            htmlFor="school-address"
            className="md:col-span-2"
          >
            <Input
              id="school-address"
              value={draft.address ?? ''}
              onChange={(e) => set('address', e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card className="p-6">
        <CardTitle>Gate hours and cut-offs</CardTitle>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
          The clock alone decides what a scan means — nobody presses a mode
          button at the gate. The day runs in this order, and the database
          refuses to save it out of order: gate opens, morning cut-off, morning
          dismissal opens and closes, afternoon arrival opens, afternoon
          cut-off, afternoon dismissal opens, gate closes.
        </p>

        <div className="mt-6 flex flex-col gap-6">
          <TimeGroup title="Morning">
            <TimeField
              label="Gate opens"
              id="gate-opens"
              value={draft.gateOpensAt}
              onChange={(v) => set('gateOpensAt', v)}
              hint="Scans before this are refused."
            />
            <TimeField
              label="Late cut-off"
              id="am-cutoff"
              value={draft.amLateCutoffAt}
              onChange={(v) => set('amLateCutoffAt', v)}
              hint={`Arrive after ${formatClock(draft.amLateCutoffAt)} and it is Late.`}
            />
            <TimeField
              label="Dismissal opens"
              id="am-out-opens"
              value={draft.amOutOpensAt}
              onChange={(v) => set('amOutOpensAt', v)}
              hint="From here a scan is a time-out."
            />
            <TimeField
              label="Dismissal closes"
              id="am-out-closes"
              value={draft.amOutClosesAt}
              onChange={(v) => set('amOutClosesAt', v)}
              hint="Then the gate shuts for lunch."
            />
          </TimeGroup>

          <TimeGroup title="Afternoon">
            <TimeField
              label="Arrival opens"
              id="pm-in-opens"
              value={draft.pmInOpensAt}
              onChange={(v) => set('pmInOpensAt', v)}
              hint="Lunch ends; scans count as time-in again."
            />
            <TimeField
              label="Late cut-off"
              id="pm-cutoff"
              value={draft.pmLateCutoffAt}
              onChange={(v) => set('pmLateCutoffAt', v)}
              hint={`Arrive after ${formatClock(draft.pmLateCutoffAt)} and it is Late.`}
            />
            <TimeField
              label="Dismissal opens"
              id="pm-out-opens"
              value={draft.pmOutOpensAt}
              onChange={(v) => set('pmOutOpensAt', v)}
              hint="From here a scan is a time-out."
            />
            <TimeField
              label="Gate closes"
              id="gate-closes"
              value={draft.gateClosesAt}
              onChange={(v) => set('gateClosesAt', v)}
              hint="Scans after this are refused."
            />
          </TimeGroup>
        </div>
      </Card>

      <Card className="p-6">
        <CardTitle>Scanner rules</CardTitle>
        <p className="mt-1 text-sm text-muted">
          Read from the database on every scan, so these take effect
          immediately.
        </p>

        <div className="mt-5 flex flex-col">
          <Rule
            label="Reject revoked ID cards"
            description="A card reported lost shows “Invalid ID” at the gate even if the learner is enrolled."
            checked={draft.rejectRevokedCards}
            onChange={(v) => set('rejectRevokedCards', v)}
          />
          <Rule
            label="Require a time-out scan"
            description="Learners with a time-in but no time-out are flagged on the attendance sheet for the adviser to check."
            checked={draft.requireTimeOut}
            onChange={(v) => set('requireTimeOut', v)}
          />
          <Rule
            label="Text the guardian on time-in"
            description="Sends an SMS to the contact number on the learner’s record when they scan in."
            checked={draft.smsOnTimeIn}
            onChange={(v) => set('smsOnTimeIn', v)}
            notBuilt
          />
          <Rule
            label="Text the guardian when absent"
            description="Sends a single SMS after the late cut-off if no scan was recorded for the day."
            checked={draft.smsOnAbsent}
            onChange={(v) => set('smsOnAbsent', v)}
            notBuilt
          />
        </div>

        <p className="mt-5 rounded-lg bg-cream px-4 py-3 text-[13px] leading-snug text-muted">
          The two SMS rules are stored but not acted on yet — nothing queues a
          message. The <code>guardian_notifications</code> table is in the
          schema for when it is built.
        </p>
      </Card>

      <Card className="border-danger-line p-6">
        <CardTitle className="text-danger-fg">End of school year</CardTitle>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          Closing a year would archive its attendance, revoke every issued ID
          card and empty the section rosters ready for the next intake, keeping
          the learner records. It is not built: it rewrites four tables at once
          and cannot be undone, so it wants its own design rather than a button
          added alongside everything else.
        </p>
        <Button variant="danger" size="sm" className="mt-5" disabled>
          Close school year — not built
        </Button>
      </Card>
    </div>
  )
}

function TimeGroup({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[13px] font-semibold tracking-wide text-muted uppercase">
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {children}
      </div>
    </div>
  )
}

function TimeField({
  label,
  id,
  value,
  onChange,
  hint,
}: {
  label: string
  id: string
  value: string
  onChange: (v: string) => void
  hint: string
}) {
  return (
    <Field
      label={label}
      htmlFor={id}
      hint={<p className="text-[13px] text-muted">{hint}</p>}
    >
      <Input
        id={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

function Rule({
  label,
  description,
  checked,
  onChange,
  notBuilt,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (next: boolean) => void
  notBuilt?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-line-soft py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex max-w-2xl flex-col gap-1">
        <span className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          {label}
          {notBuilt && (
            <span className="rounded bg-warn-bg px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-warn-fg uppercase">
              Not built
            </span>
          )}
        </span>
        <span className="text-[14px] leading-snug text-muted">
          {description}
        </span>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  )
}
