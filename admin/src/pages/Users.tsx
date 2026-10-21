import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { KeyRound, Plus, Search, X } from 'lucide-react'
import {
  createStaff,
  listStaff,
  setStaffPassword,
  updateStaff,
} from '../lib/db'
import { errorMessage, useAsync } from '../lib/useAsync'
import { useAuth } from '../lib/auth'
import {
  ACCOUNT_STATUS_LABEL,
  ROLE_BLURB,
  ROLE_LABEL,
  lastActiveLabel,
  nameInitials,
  type AccountStatus,
  type Role,
  type StaffUser,
} from '../lib/types'
import { ErrorBlock, FormError, LoadingBlock } from '../components/states'
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
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [inviting, setInviting] = useState(false)
  const [editing, setEditing] = useState<StaffUser | null>(null)
  const [passwordFor, setPasswordFor] = useState<StaffUser | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)

  const filters = useMemo(
    () => ({ query, role, status }),
    [query, role, status],
  )
  const { data, loading, error, reload } = useAsync(
    () => listStaff(filters),
    [filters],
  )

  async function toggleStatus(u: StaffUser) {
    setRowError(null)
    try {
      await updateStaff(u.id, {
        status: u.status === 'disabled' ? 'active' : 'disabled',
      })
      reload()
    } catch (err) {
      setRowError(errorMessage(err))
    }
  }

  const rows = data?.rows ?? []

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

      {rowError && <FormError message={rowError} />}

      {error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : (
        <Card className="overflow-hidden">
          {loading && !data ? (
            <LoadingBlock label="Loading staff accounts…" />
          ) : (
            <table className="w-full table-fixed border-collapse text-left">
              <colgroup>
                <col />
                <col className="w-[180px]" />
                <col className="w-[130px]" />
                <col className="w-[190px]" />
                <col className="w-[200px]" />
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
                  <StaffRow
                    key={u.id}
                    user={u}
                    isSelf={u.id === user?.id}
                    onEdit={() => setEditing(u)}
                    onPassword={() => setPasswordFor(u)}
                    onToggle={() => toggleStatus(u)}
                  />
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
          )}
        </Card>
      )}

      <RoleGuide />

      {inviting && (
        <InviteDialog
          onClose={() => setInviting(false)}
          onSaved={() => {
            setInviting(false)
            reload()
          }}
        />
      )}

      {editing && (
        <EditDialog
          user={editing}
          isSelf={editing.id === user?.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}

      {passwordFor && (
        <PasswordDialog
          user={passwordFor}
          onClose={() => setPasswordFor(null)}
          onSaved={() => {
            setPasswordFor(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

function StaffRow({
  user,
  isSelf,
  onEdit,
  onPassword,
  onToggle,
}: {
  user: StaffUser
  isSelf: boolean
  onEdit: () => void
  onPassword: () => void
  onToggle: () => void
}) {
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
            {nameInitials(user.name)}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-semibold text-ink">
              {user.name}
              {isSelf && (
                <span className="ml-2 font-normal text-subtle">(you)</span>
              )}
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
      <td className="py-3 pr-4 text-[15px] text-muted">
        {lastActiveLabel(user.lastActive)}
      </td>
      <td className="py-3 pr-5">
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" onClick={onEdit}>
            Edit
          </Button>
          <IconButton
            label={`Set password for ${user.name}`}
            onClick={onPassword}
          >
            <KeyRound size={16} strokeWidth={1.9} />
          </IconButton>
          {/* You cannot lock yourself out; the API refuses it too. */}
          <Button
            size="sm"
            variant={disabled ? 'secondary' : 'danger'}
            disabled={!user.canDisable}
            title={
              user.canDisable ? undefined : 'You cannot disable your own account'
            }
            onClick={onToggle}
          >
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

/* --------------------------------------------------------------- Dialogs */

function Dialog({
  title,
  description,
  onClose,
  onSubmit,
  submitLabel,
  busy,
  error,
  children,
}: {
  title: string
  description: string
  onClose: () => void
  onSubmit: (e: FormEvent) => void
  submitLabel: string
  busy: boolean
  error: string | null
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4">
      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex w-[520px] max-w-full flex-col gap-5 rounded-2xl border border-line bg-white p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="display-title text-[28px] leading-none text-ink">
              {title}
            </h2>
            <p className="text-sm text-muted">{description}</p>
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={17} strokeWidth={2.2} />
          </IconButton>
        </div>

        {children}

        {error && <FormError message={error} />}

        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  )
}

function InviteDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('registrar')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await createStaff({ name, email, role })
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      title="Add staff account"
      /*
       * There is no mailer. The account is created without a password and
       * cannot sign in until one is set here — say that, rather than promising
       * an invitation email that nothing sends.
       */
      description="The account starts with no password. Set one with the key button, and it becomes active."
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Create account"
      busy={busy}
      error={error}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="invite-name" required>
          <Input
            id="invite-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>
        <Field label="Email address" htmlFor="invite-email" required>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
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
    </Dialog>
  )
}

function EditDialog({
  user,
  isSelf,
  onClose,
  onSaved,
}: {
  user: StaffUser
  isSelf: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(user.name)
  const [role, setRole] = useState<Role>(user.role)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await updateStaff(user.id, { name, role })
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      title="Edit account"
      description={user.email}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Save changes"
      busy={busy}
      error={error}
    >
      <Field label="Full name" htmlFor="edit-name" required>
        <Input
          id="edit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </Field>

      <Field
        label="Role"
        htmlFor="edit-role"
        required
        hint={
          <p className="text-[13px] leading-snug text-muted">
            {isSelf
              ? 'You cannot change your own role — ask another administrator.'
              : ROLE_BLURB[role]}
          </p>
        }
      >
        <Select
          id="edit-role"
          value={role}
          disabled={isSelf}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </Select>
      </Field>
    </Dialog>
  )
}

function PasswordDialog({
  user,
  onClose,
  onSaved,
}: {
  user: StaffUser
  onClose: () => void
  onSaved: () => void
}) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await setStaffPassword(user.id, password)
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      title={user.status === 'invited' ? 'Set password' : 'Reset password'}
      description={`${user.name} · ${user.email}`}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Save password"
      busy={busy}
      error={error}
    >
      <Field
        label="New password"
        htmlFor="new-password"
        required
        hint={
          <p className="text-[13px] leading-snug text-muted">
            At least 8 characters. Tell it to them yourself — nothing is
            emailed.
            {user.status === 'invited' &&
              ' Setting it makes this account active.'}
            {user.status === 'disabled' &&
              ' This account is disabled and still will not be able to sign in.'}
          </p>
        }
      >
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
      </Field>
    </Dialog>
  )
}
