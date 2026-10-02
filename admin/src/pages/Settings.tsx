import { useState } from 'react'
import { SCHOOL } from '../lib/mock'
import {
  Button,
  Card,
  CardTitle,
  Field,
  Input,
  PageHeader,
  Toggle,
} from '../components/ui'

export function Settings() {
  const [notifyGuardians, setNotifyGuardians] = useState(true)
  const [notifyAbsent, setNotifyAbsent] = useState(false)
  const [requireTimeOut, setRequireTimeOut] = useState(true)
  const [blockRevoked, setBlockRevoked] = useState(true)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Settings"
        description="School details and the rules the scanner applies at the gate."
      >
        <Button variant="secondary">Discard</Button>
        <Button variant="primary">Save changes</Button>
      </PageHeader>

      <Card className="p-6">
        <CardTitle>School profile</CardTitle>
        <p className="mt-1 text-sm text-muted">
          Printed on ID cards and shown on every sign-in screen.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="School name" htmlFor="school-name">
            <Input id="school-name" defaultValue={SCHOOL.name} />
          </Field>
          <Field label="School ID" htmlFor="school-id">
            <Input id="school-id" defaultValue={SCHOOL.schoolId} />
          </Field>
          <Field label="Address" htmlFor="school-address" className="md:col-span-2">
            <Input id="school-address" defaultValue={SCHOOL.address} />
          </Field>
        </div>
      </Card>

      <Card className="p-6">
        <CardTitle>Gate hours and cut-offs</CardTitle>
        <p className="mt-1 text-sm text-muted">
          A scan before the late cut-off is recorded as Present. After it, the
          learner is marked Late. No scan at all means Absent.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Field
            label="Gate opens"
            htmlFor="gate-open"
            hint={<Hint>Scans before this time are rejected.</Hint>}
          >
            <Input id="gate-open" type="time" defaultValue="06:00" />
          </Field>
          <Field
            label="Late cut-off"
            htmlFor="late-cutoff"
            hint={<Hint>Currently 7:20 AM.</Hint>}
          >
            <Input id="late-cutoff" type="time" defaultValue="07:20" />
          </Field>
          <Field
            label="Time-out opens"
            htmlFor="timeout-open"
            hint={<Hint>Earliest a time-out scan counts.</Hint>}
          >
            <Input id="timeout-open" type="time" defaultValue="11:30" />
          </Field>
          <Field
            label="Gate closes"
            htmlFor="gate-close"
            hint={<Hint>The day is rolled up after this.</Hint>}
          >
            <Input id="gate-close" type="time" defaultValue="18:00" />
          </Field>
        </div>
      </Card>

      <Card className="p-6">
        <CardTitle>Scanner rules</CardTitle>
        <p className="mt-1 text-sm text-muted">
          These take effect on every gate device the next time it syncs.
        </p>

        <div className="mt-5 flex flex-col">
          <Rule
            label="Reject revoked ID cards"
            description="A card that was reported lost shows “Invalid ID” at the gate even if the learner is enrolled."
            checked={blockRevoked}
            onChange={setBlockRevoked}
          />
          <Rule
            label="Require a time-out scan"
            description="Learners with a time-in but no time-out are flagged on the attendance sheet for the adviser to check."
            checked={requireTimeOut}
            onChange={setRequireTimeOut}
          />
          <Rule
            label="Text the guardian on time-in"
            description="Sends an SMS to the contact number on the learner’s record when they scan in."
            checked={notifyGuardians}
            onChange={setNotifyGuardians}
          />
          <Rule
            label="Text the guardian when absent"
            description="Sends a single SMS after the late cut-off if no scan was recorded for the day."
            checked={notifyAbsent}
            onChange={setNotifyAbsent}
          />
        </div>
      </Card>

      <Card className="border-danger-line p-6">
        <CardTitle className="text-danger-fg">End of school year</CardTitle>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          Closing {SCHOOL.schoolYear} archives this year’s attendance, revokes
          every issued ID card, and empties the section rosters ready for the
          next intake. Learner records are kept. This cannot be undone.
        </p>
        <Button variant="danger" size="sm" className="mt-5">
          Close school year
        </Button>
      </Card>
    </div>
  )
}

function Hint({ children }: { children: string }) {
  return <p className="text-[13px] text-muted">{children}</p>
}

function Rule({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-line-soft py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex max-w-2xl flex-col gap-1">
        <span className="text-[15px] font-semibold text-ink">{label}</span>
        <span className="text-[14px] leading-snug text-muted">
          {description}
        </span>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  )
}
