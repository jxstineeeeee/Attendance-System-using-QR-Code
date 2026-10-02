/**
 * Frontend-only fixtures for the Admin Console.
 *
 * The registrar app owns student records; admin works one level up from them —
 * staff accounts, gate devices, the academic calendar, and the attendance those
 * devices produce. Shapes here mirror what the API is expected to return so the
 * screens can be wired up without being rewritten.
 */

export const SCHOOL = {
  name: 'Luna National High School',
  address: 'Luyao, Luna, Isabela',
  schoolId: '136743',
  schoolYear: '2026-2027',
}

export const ADMIN = {
  name: 'Elena Marquez',
  role: 'System Administrator',
  initials: 'EM',
}

/* ------------------------------------------------------------------- Staff */

export type Role = 'admin' | 'registrar' | 'scanner'
export type AccountStatus = 'active' | 'disabled' | 'invited'

export interface StaffUser {
  id: string
  name: string
  initials: string
  email: string
  role: Role
  status: AccountStatus
  lastActive: string
  createdOn: string
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

export const STAFF: StaffUser[] = [
  {
    id: 'u1',
    name: 'Elena Marquez',
    initials: 'EM',
    email: 'e.marquez@lunanhs.edu.ph',
    role: 'admin',
    status: 'active',
    lastActive: 'Today, 7:12 AM',
    createdOn: 'Jun 1, 2026',
  },
  {
    id: 'u2',
    name: 'Rosario Gundran',
    initials: 'RG',
    email: 'r.gundran@lunanhs.edu.ph',
    role: 'registrar',
    status: 'active',
    lastActive: 'Today, 6:58 AM',
    createdOn: 'Jun 1, 2026',
  },
  {
    id: 'u3',
    name: 'Danilo Ramos',
    initials: 'DR',
    email: 'd.ramos@lunanhs.edu.ph',
    role: 'scanner',
    status: 'active',
    lastActive: 'Today, 7:41 AM',
    createdOn: 'Jun 2, 2026',
  },
  {
    id: 'u4',
    name: 'Marites Valdez',
    initials: 'MV',
    email: 'm.valdez@lunanhs.edu.ph',
    role: 'scanner',
    status: 'active',
    lastActive: 'Today, 7:39 AM',
    createdOn: 'Jun 2, 2026',
  },
  {
    id: 'u5',
    name: 'Arnel Bautista',
    initials: 'AB',
    email: 'a.bautista@lunanhs.edu.ph',
    role: 'registrar',
    status: 'invited',
    lastActive: 'Never signed in',
    createdOn: 'Sep 28, 2026',
  },
  {
    id: 'u6',
    name: 'Cristina Lim',
    initials: 'CL',
    email: 'c.lim@lunanhs.edu.ph',
    role: 'scanner',
    status: 'disabled',
    lastActive: 'Aug 14, 2026',
    createdOn: 'Jun 2, 2026',
  },
]

/* ----------------------------------------------------------------- Devices */

export type DeviceStatus = 'online' | 'offline' | 'syncing'

export interface Device {
  id: string
  name: string
  location: string
  code: string
  status: DeviceStatus
  lastSeen: string
  scansToday: number
  pendingSync: number
  operator: string
}

export const DEVICE_STATUS_LABEL: Record<DeviceStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  syncing: 'Syncing',
}

export const DEVICES: Device[] = [
  {
    id: 'd1',
    name: 'Main Gate — Scanner 1',
    location: 'Main gate, east post',
    code: 'LNHS-GATE-01',
    status: 'online',
    lastSeen: 'Just now',
    scansToday: 486,
    pendingSync: 0,
    operator: 'Danilo Ramos',
  },
  {
    id: 'd2',
    name: 'Main Gate — Scanner 2',
    location: 'Main gate, west post',
    code: 'LNHS-GATE-02',
    status: 'online',
    lastSeen: '1 min ago',
    scansToday: 402,
    pendingSync: 0,
    operator: 'Marites Valdez',
  },
  {
    id: 'd3',
    name: 'Back Gate — Scanner',
    location: 'Back gate, near covered court',
    code: 'LNHS-GATE-03',
    status: 'syncing',
    lastSeen: '4 min ago',
    scansToday: 118,
    pendingSync: 12,
    operator: 'Danilo Ramos',
  },
  {
    id: 'd4',
    name: 'Spare Tablet',
    location: 'Registrar’s office',
    code: 'LNHS-SPARE-01',
    status: 'offline',
    lastSeen: 'Sep 24, 2026',
    scansToday: 0,
    pendingSync: 0,
    operator: '—',
  },
]

/* -------------------------------------------------------------- Attendance */

export type AttendanceStatus = 'present' | 'late' | 'absent'

export interface AttendanceRecord {
  id: string
  lrn: string
  name: string
  gradeLevel: string
  section: string
  timeIn: string | null
  timeOut: string | null
  status: AttendanceStatus
  gate: string
}

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
}

export const GRADE_LEVELS = [
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
]

export const SECTIONS = [
  'Sampaguita',
  'Narra',
  'Molave',
  'Acacia',
  'Ilang-Ilang',
  'Kamagong',
]

export const STRANDS = ['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL']

export const ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'a1',
    lrn: '136743020001',
    name: 'Bautista, Andrei L.',
    gradeLevel: 'Grade 7',
    section: 'Sampaguita',
    timeIn: '6:42 AM',
    timeOut: '4:08 PM',
    status: 'present',
    gate: 'Main Gate — Scanner 1',
  },
  {
    id: 'a2',
    lrn: '136743020002',
    name: 'Cruz, Bea R.',
    gradeLevel: 'Grade 7',
    section: 'Narra',
    timeIn: '7:34 AM',
    timeOut: '4:11 PM',
    status: 'late',
    gate: 'Main Gate — Scanner 2',
  },
  {
    id: 'a3',
    lrn: '136743020003',
    name: 'Dela Cruz, Carlo S. Jr.',
    gradeLevel: 'Grade 8',
    section: 'Molave',
    timeIn: '6:51 AM',
    timeOut: '4:05 PM',
    status: 'present',
    gate: 'Main Gate — Scanner 1',
  },
  {
    id: 'a4',
    lrn: '136743020004',
    name: 'Espinosa, Danica V.',
    gradeLevel: 'Grade 9',
    section: 'Acacia',
    timeIn: null,
    timeOut: null,
    status: 'absent',
    gate: '—',
  },
  {
    id: 'a5',
    lrn: '136743020005',
    name: 'Fernandez, Elias R.',
    gradeLevel: 'Grade 10',
    section: 'Ilang-Ilang',
    timeIn: '6:38 AM',
    timeOut: '4:02 PM',
    status: 'present',
    gate: 'Back Gate — Scanner',
  },
  {
    id: 'a6',
    lrn: '136743020006',
    name: 'Gonzales, Fatima A.',
    gradeLevel: 'Grade 11',
    section: 'Kamagong',
    timeIn: '7:29 AM',
    timeOut: '4:15 PM',
    status: 'late',
    gate: 'Main Gate — Scanner 1',
  },
  {
    id: 'a7',
    lrn: '136743020007',
    name: 'Hernandez, Gabriel M.',
    gradeLevel: 'Grade 11',
    section: 'Narra',
    timeIn: '6:47 AM',
    timeOut: null,
    status: 'present',
    gate: 'Main Gate — Scanner 2',
  },
  {
    id: 'a8',
    lrn: '136743020008',
    name: 'Ibanez, Hannah T.',
    gradeLevel: 'Grade 12',
    section: 'Molave',
    timeIn: null,
    timeOut: null,
    status: 'absent',
    gate: '—',
  },
  {
    id: 'a9',
    lrn: '136743020009',
    name: 'Jimenez, Ivan P.',
    gradeLevel: 'Grade 9',
    section: 'Sampaguita',
    timeIn: '6:55 AM',
    timeOut: '4:07 PM',
    status: 'present',
    gate: 'Main Gate — Scanner 1',
  },
  {
    id: 'a10',
    lrn: '136743020010',
    name: 'Katigbak, Jonalyn D.',
    gradeLevel: 'Grade 10',
    section: 'Acacia',
    timeIn: '7:41 AM',
    timeOut: '4:09 PM',
    status: 'late',
    gate: 'Back Gate — Scanner',
  },
  {
    id: 'a11',
    lrn: '136743020011',
    name: 'Lorenzo, Kenneth B.',
    gradeLevel: 'Grade 12',
    section: 'Kamagong',
    timeIn: '6:44 AM',
    timeOut: '4:03 PM',
    status: 'present',
    gate: 'Main Gate — Scanner 2',
  },
  {
    id: 'a12',
    lrn: '136743020012',
    name: 'Manalo, Liza C.',
    gradeLevel: 'Grade 8',
    section: 'Ilang-Ilang',
    timeIn: '6:59 AM',
    timeOut: '4:12 PM',
    status: 'present',
    gate: 'Main Gate — Scanner 1',
  },
]

/* ------------------------------------------------------- Weekly attendance */

export interface DayTotals {
  day: string
  date: string
  present: number
  late: number
  absent: number
}

/** Mon–Fri of the current school week; totals add up to enrolment that day. */
export const WEEK: DayTotals[] = [
  { day: 'Mon', date: 'Sep 28', present: 1032, late: 74, absent: 142 },
  { day: 'Tue', date: 'Sep 29', present: 1104, late: 58, absent: 86 },
  { day: 'Wed', date: 'Sep 30', present: 1081, late: 66, absent: 101 },
  { day: 'Thu', date: 'Oct 1', present: 1126, late: 41, absent: 81 },
  { day: 'Fri', date: 'Oct 2', present: 998, late: 89, absent: 161 },
]

export const ENROLLED = 1248

/** Today is Wednesday in the fixtures — the dashboard leads with that column. */
export const TODAY = WEEK[2]

/* --------------------------------------------------------- Live scan feed */

export interface ScanEvent {
  id: string
  name: string
  lrn: string
  direction: 'in' | 'out'
  time: string
  gate: string
  outcome: 'ok' | 'late' | 'invalid'
}

export const RECENT_SCANS: ScanEvent[] = [
  {
    id: 'e1',
    name: 'Manalo, Liza C.',
    lrn: '136743020012',
    direction: 'in',
    time: '6:59 AM',
    gate: 'Main Gate — Scanner 1',
    outcome: 'ok',
  },
  {
    id: 'e2',
    name: 'Jimenez, Ivan P.',
    lrn: '136743020009',
    direction: 'in',
    time: '6:55 AM',
    gate: 'Main Gate — Scanner 1',
    outcome: 'ok',
  },
  {
    id: 'e3',
    name: 'Unknown card',
    lrn: '136743019884',
    direction: 'in',
    time: '6:53 AM',
    gate: 'Back Gate — Scanner',
    outcome: 'invalid',
  },
  {
    id: 'e4',
    name: 'Dela Cruz, Carlo S. Jr.',
    lrn: '136743020003',
    direction: 'in',
    time: '6:51 AM',
    gate: 'Main Gate — Scanner 1',
    outcome: 'ok',
  },
  {
    id: 'e5',
    name: 'Hernandez, Gabriel M.',
    lrn: '136743020007',
    direction: 'in',
    time: '6:47 AM',
    gate: 'Main Gate — Scanner 2',
    outcome: 'ok',
  },
  {
    id: 'e6',
    name: 'Lorenzo, Kenneth B.',
    lrn: '136743020011',
    direction: 'in',
    time: '6:44 AM',
    gate: 'Main Gate — Scanner 2',
    outcome: 'ok',
  },
  {
    id: 'e7',
    name: 'Gonzales, Fatima A.',
    lrn: '136743020006',
    direction: 'in',
    time: '7:29 AM',
    gate: 'Main Gate — Scanner 1',
    outcome: 'late',
  },
]

/* --------------------------------------------------------------- Sections */

export interface SectionRow {
  id: string
  name: string
  gradeLevel: string
  strand?: string
  adviser: string
  enrolled: number
}

export const SECTION_ROWS: SectionRow[] = [
  { id: 'c1', name: 'Sampaguita', gradeLevel: 'Grade 7', adviser: 'J. Aquino', enrolled: 48 },
  { id: 'c2', name: 'Narra', gradeLevel: 'Grade 7', adviser: 'P. Dizon', enrolled: 46 },
  { id: 'c3', name: 'Molave', gradeLevel: 'Grade 8', adviser: 'L. Soriano', enrolled: 44 },
  { id: 'c4', name: 'Acacia', gradeLevel: 'Grade 9', adviser: 'R. Mendoza', enrolled: 45 },
  { id: 'c5', name: 'Ilang-Ilang', gradeLevel: 'Grade 10', adviser: 'T. Villanueva', enrolled: 43 },
  {
    id: 'c6',
    name: 'Kamagong',
    gradeLevel: 'Grade 11',
    strand: 'STEM',
    adviser: 'A. Pascual',
    enrolled: 41,
  },
  {
    id: 'c7',
    name: 'Narra',
    gradeLevel: 'Grade 11',
    strand: 'ABM',
    adviser: 'C. Reyes',
    enrolled: 39,
  },
  {
    id: 'c8',
    name: 'Molave',
    gradeLevel: 'Grade 12',
    strand: 'HUMSS',
    adviser: 'M. Torres',
    enrolled: 40,
  },
]

/* -------------------------------------------------------------- Audit log */

export type AuditKind = 'account' | 'student' | 'device' | 'settings' | 'security'

export interface AuditEntry {
  id: string
  at: string
  actor: string
  kind: AuditKind
  action: string
  detail: string
}

export const AUDIT_KIND_LABEL: Record<AuditKind, string> = {
  account: 'Account',
  student: 'Student',
  device: 'Device',
  settings: 'Settings',
  security: 'Security',
}

export const AUDIT: AuditEntry[] = [
  {
    id: 'l1',
    at: 'Sep 30, 2026 · 7:12 AM',
    actor: 'Elena Marquez',
    kind: 'settings',
    action: 'Updated attendance rules',
    detail: 'Late cut-off changed from 7:15 AM to 7:20 AM',
  },
  {
    id: 'l2',
    at: 'Sep 30, 2026 · 6:40 AM',
    actor: 'Danilo Ramos',
    kind: 'device',
    action: 'Signed in to device',
    detail: 'LNHS-GATE-01 — Main Gate, east post',
  },
  {
    id: 'l3',
    at: 'Sep 29, 2026 · 4:26 PM',
    actor: 'Rosario Gundran',
    kind: 'student',
    action: 'Reissued ID card',
    detail: 'Gonzales, Fatima A. — previous card revoked (Lost)',
  },
  {
    id: 'l4',
    at: 'Sep 28, 2026 · 2:03 PM',
    actor: 'Elena Marquez',
    kind: 'account',
    action: 'Invited staff account',
    detail: 'a.bautista@lunanhs.edu.ph — role: Registrar',
  },
  {
    id: 'l5',
    at: 'Sep 28, 2026 · 9:15 AM',
    actor: 'Elena Marquez',
    kind: 'security',
    action: 'Failed sign-in attempts',
    detail: '3 attempts for c.lim@lunanhs.edu.ph from 203.177.x.x',
  },
  {
    id: 'l6',
    at: 'Sep 24, 2026 · 11:48 AM',
    actor: 'Elena Marquez',
    kind: 'device',
    action: 'Deactivated device',
    detail: 'LNHS-SPARE-01 — returned to registrar’s office',
  },
  {
    id: 'l7',
    at: 'Aug 14, 2026 · 8:02 AM',
    actor: 'Elena Marquez',
    kind: 'account',
    action: 'Disabled account',
    detail: 'c.lim@lunanhs.edu.ph — end of contract',
  },
]

/* --------------------------------------------------------------- Helpers */

export const pct = (part: number, whole: number) =>
  whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10
