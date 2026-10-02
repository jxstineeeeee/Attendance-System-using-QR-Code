import { useMemo, useState, type FormEvent } from 'react'
import { KeyRound, Plus, Search, X } from 'lucide-react'
import {
  ACCOUNT_STATUS_LABEL,
  ROLE_BLURB,
  ROLE_LABEL,
  STAFF,
  type AccountStatus,
  type Role,
  type StaffUser,
} from '../lib/mock'
import {
  Badge,
  Button,
  Card,
  Field,
  IconButton,
  Input,
  PageHeader,
  Select,
  type Tone,
} from '../components/ui'

const ROLE_TONE: Record<Role, Tone> = {
  admin: 'info',
  registrar: 'success',
  scanner: 'neutral',
}

const STATUS_TONE: Record<AccountStatus, Tone> = {
  active: 'success',
  invited: 'warn',
  disabled: 'neutral',
}

export function Users() {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [inviting, setInviting] = useState(false)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return STAFF.filter((u) => {
      if (q && !u.name.toLowerCase().includes(q) && !u.email.includes(q)) {
        return false
      }
      if (role && u.role !== role) return false
      if (status && u.status !== status) return false
      return true
    })
  }, [query, role, status])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Staff Accounts"
        description="Who can sign in, and what each of them is allowed to do."
      >
        <Button variant="primary" onClick={() => setInviting(true)}>
          <Plus size={18} strokeWidth={2.4} />
          Add staff account
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_190px_170px]">
        <Field label="Search" htmlFor="search">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-subtle"
            />
            <Input
              id="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              className="pl-11"
            />
          </div>
        </Field>

        <Field label="Role" htmlFor="role">
          <Select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">All roles</option>
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Status" htmlFor="status">
          <Select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            {(Object.keys(ACCOUNT_STATUS_LABEL) as AccountStatus[]).map((s) => (
              <option key={s} value={s}>
                {ACCOUNT_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col />
            <col className="w-[180px]" />
            <col className="w-[130px]" />
            <col className="w-[170px]" />
            <col className="w-[190px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-line-soft text-[13px] font-semibold tracking-wide text-muted uppercase">
              <th scope="col" className="py-3 pl-5">
                Name
              </th>
              <th scope="col" className="py-3">
                Role
              </th>
              <th scope="col" className="py-3">
                Status
              </th>
              <th scope="col" className="py-3">
                Last active
              </th>
              <th scope="col" className="py-3 pr-5 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <StaffRow key={u.id} user={u} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-14 text-center text-muted">
                  No staff accounts match those filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <RoleGuide />

      {inviting && <InviteDialog onClose={() => setInviting(false)} />}
    </div>
  )
}

function StaffRow({ user }: { user: StaffUser }) {
  const disabled = user.status === 'disabled'

  return (
    <tr className="border-b border-line-soft last:border-b-0 hover:bg-cream/60">
      <td className="py-3 pr-4 pl-5">
        <div className="flex items-center gap-3">
          <span
            className={
              disabled
                ? 'flex size-9 shrink-0 items-center justify-center rounded-full bg-line-soft text-[13px] font-bold text-subtle'
                : 'flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-bold text-brand'
            }
          >
            {user.initials}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-semibold text-ink">
              {user.name}
            </span>
            <span className="truncate text-[13px] text-muted">
              {user.email}
            </span>
          </div>
        </div>
      </td>
      <td className="py-3 pr-4">
        <Badge tone={ROLE_TONE[user.role]}>{ROLE_LABEL[user.role]}</Badge>
      </td>
      <td className="py-3 pr-4">
        <Badge tone={STATUS_TONE[user.status]}>
          {ACCOUNT_STATUS_LABEL[user.status]}
        </Badge>
      </td>
      <td className="py-3 pr-4 text-[15px] text-muted">{user.lastActive}</td>
      <td className="py-3 pr-5">
        <div className="flex items-center justify-end gap-2">
          <Button size="sm">Edit</Button>
          <IconButton label={`Reset password for ${user.name}`}>
            <KeyRound size={16} strokeWidth={1.9} />
          </IconButton>
          <Button size="sm" variant={disabled ? 'secondary' : 'danger'}>
            {disabled ? 'Enable' : 'Disable'}
          </Button>
        </div>
      </td>
    </tr>
  )
}

/** Spells out each role so the choice in the dialog is not a guess. */
function RoleGuide() {
  return (
    <Card className="p-6">
      <h2 className="display-title text-xl text-ink">What each role can do</h2>
      <dl className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <div key={r} className="flex flex-col gap-2">
            <dt>
              <Badge tone={ROLE_TONE[r]}>{ROLE_LABEL[r]}</Badge>
            </dt>
            <dd className="text-[14px] leading-relaxed text-muted">
              {ROLE_BLURB[r]}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

function InviteDialog({ onClose }: { onClose: () => void }) {
  const [role, setRole] = useState<Role>('registrar')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // No persistence yet — a real save would send the invitation email.
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4">
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
        className="flex w-[520px] max-w-full flex-col gap-5 rounded-2xl border border-line bg-white p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="invite-title" className="display-title text-[28px] leading-none text-ink">
              Add staff account
            </h2>
            <p className="text-sm text-muted">
              They will get an email invitation to set their own password.
            </p>
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={17} strokeWidth={2.2} />
          </IconButton>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="invite-name" required>
            <Input id="invite-name" required />
          </Field>
          <Field label="Email address" htmlFor="invite-email" required>
            <Input id="invite-email" type="email" required />
          </Field>
        </div>

        <Field
          label="Role"
          htmlFor="invite-role"
          required
          hint={
            <p className="text-[13px] leading-snug text-muted">
              {ROLE_BLURB[role]}
            </p>
          }
        >
          <Select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            Send invitation
          </Button>
        </div>
      </form>
    </div>
  )
}
