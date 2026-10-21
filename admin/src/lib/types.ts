/**
 * The shapes the admin console reads from the API, and the labels it renders
 * them with.
 *
 * Columns that are nullable in MySQL arrive as null rather than missing, so
 * they are typed that way instead of optional.
 */

/** The signed-in staff account, from the `users` table. */
export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'admin'
}

/* ------------------------------------------------------------------- Staff */

export type Role = 'admin' | 'registrar' | 'scanner'
export type AccountStatus = 'active' | 'disabled' | 'invited'

export interface StaffUser {
  id: string
  name: string
  email: string
  role: Role
  status: AccountStatus
  /** ISO timestamps, or null for an account that has never signed in. */
  lastActive: string | null
  createdOn: string | null
  /** False for the account you are signed in as — you cannot lock yourself out. */
  canDisable: boolean
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrator',
  registrar: 'Registrar',
  scanner: 'Scanner operator',
}

export const ROLE_BLURB: Record<Role, string> = {
  admin: 'Full access, including staff accounts and system settings.',
  registrar: 'Registers students, manages learner records, prints QR IDs.',
  scanner: 'Signs in to a gate device and records time-in / time-out only.',
}

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  active: 'Active',
  disabled: 'Disabled',
  invited: 'Invited',
}

/* ----------------------------------------------------------------- Devices */

export type DeviceStatus = 'online' | 'offline' | 'syncing'

export interface Device {
  id: number
  name: string
  location: string | null
  code: string
  status: DeviceStatus
  lastSeen: string | null
  scansToday: number
  pendingSync: number
  /** Whoever last scanned on this device, or null if nobody has. */
  operator: string | null
  isActive: boolean
}

export const DEVICE_STATUS_LABEL: Record<DeviceStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  syncing: 'Syncing',
}

/* -------------------------------------------------------------- Attendance */

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused'

/** One session of one learner's day. */
export interface SessionRecord {
  timeIn: string | null
  timeOut: string | null
  status: AttendanceStatus
  gate: string | null
}

/**
 * One learner on one day, both sessions pivoted out — the shape an attendance
 * sheet is printed in, and what `v_attendance_sheet` returns.
 */
export interface AttendanceRow {
  studentId: string
  lrn: string
  name: string
  gradeLevel: string | null
  section: string | null
  am: SessionRecord | null
  pm: SessionRecord | null
}

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  excused: 'Excused',
}

export type SessionKey = 'am' | 'pm'

export const SESSION_LABEL: Record<SessionKey, string> = {
  am: 'Morning',
  pm: 'Afternoon',
}

/* --------------------------------------------------------------- Dashboard */

export interface DayTotals {
  /** ISO date, e.g. "2026-09-30". */
  date: string
  /** "Mon", for the chart's axis. */
  day: string
  present: number
  late: number
  absent: number
}

export interface ScanEvent {
  id: number
  name: string | null
  lrn: string | null
  direction: 'in' | 'out'
  session: SessionKey | null
  at: string
  gate: string
  outcome: 'ok' | 'late' | 'invalid'
  reason: string | null
}

export interface Overview {
  schoolYear: string | null
  /** Server date, so the heading never disagrees with the numbers. */
  today: string
  enrolled: number
  gradeLevels: number
  /** The morning cut-off, for the Late tile's note. */
  amLateCutoffAt: string
  /** Mon–Fri of the current week, morning session. */
  week: DayTotals[]
  todayTotals: DayTotals
  devices: Device[]
  recentScans: ScanEvent[]
}

/* ----------------------------------------------------------------- Academic */

export interface SectionRow {
  id: number
  name: string
  gradeLevel: string
  gradeLevelId: number
  strand: string | null
  strandId: number | null
  adviser: string | null
  enrolled: number
}

export interface GradeLevel {
  id: number
  name: string
  seniorHigh: boolean
}

export interface Strand {
  id: number
  code: string
  name: string | null
}

export interface SchoolYear {
  id: number
  label: string
  isActive: boolean
}

export interface Academic {
  years: SchoolYear[]
  activeYear: SchoolYear | null
  grades: GradeLevel[]
  strands: Strand[]
  sections: SectionRow[]
}

/* -------------------------------------------------------------- Audit log */

/** Exactly the `audit_log.kind` enum — academic changes are logged as settings. */
export type AuditKind =
  | 'account'
  | 'student'
  | 'device'
  | 'settings'
  | 'security'

export interface AuditEntry {
  id: number
  at: string
  actor: string | null
  kind: AuditKind
  action: string
  detail: string | null
}

export const AUDIT_KIND_LABEL: Record<AuditKind, string> = {
  account: 'Account',
  student: 'Student',
  device: 'Device',
  settings: 'Settings',
  security: 'Security',
}

/* --------------------------------------------------------------- Settings */

/** The one `school_settings` row, as the console edits it. */
export interface Settings {
  schoolName: string
  schoolId: string | null
  address: string | null
  gateOpensAt: string
  amLateCutoffAt: string
  amOutOpensAt: string
  amOutClosesAt: string
  pmInOpensAt: string
  pmLateCutoffAt: string
  pmOutOpensAt: string
  gateClosesAt: string
  rejectRevokedCards: boolean
  requireTimeOut: boolean
  smsOnTimeIn: boolean
  smsOnAbsent: boolean
}

/* ---------------------------------------------------------------- Helpers */

export const pct = (part: number, whole: number) =>
  whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10

/** Initials for a sidebar avatar, e.g. "Elena Marquez" -> "EM". */
export const nameInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

/** Timestamps arrive as ISO strings; most screens show "Sep 30, 2026". */
export const formatDate = (iso?: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** "7:12 AM" from an ISO timestamp, for a time-in column. */
export const formatTime = (iso?: string | null) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** "Sep 30, 2026 · 7:12 AM", for the audit timeline. */
export const formatDateTime = (iso?: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${formatDate(iso)} · ${formatTime(iso)}`
}

/** "07:20:00" from MySQL rendered as "7:20 AM". */
export const formatClock = (time?: string | null) => {
  if (!time) return '—'
  const [h, m] = time.split(':')
  const hour = Number(h)
  if (Number.isNaN(hour)) return '—'
  const suffix = hour < 12 ? 'AM' : 'PM'
  const display = hour % 12 === 0 ? 12 : hour % 12
  return `${display}:${m} ${suffix}`
}

/** MySQL gives "07:20:00"; <input type="time"> wants "07:20". */
export const toTimeInput = (time?: string | null) =>
  (time ?? '').slice(0, 5)

/** "Never signed in" reads better than a dash in the staff table. */
export const lastActiveLabel = (iso: string | null) =>
  iso === null ? 'Never signed in' : formatDateTime(iso)
