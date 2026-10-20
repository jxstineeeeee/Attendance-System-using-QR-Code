export type IdStatus = 'printed' | 'not-printed' | 'reissue-needed'

export type CardStatus = 'active' | 'revoked'

export interface IdCard {
  id: string
  qrContent: string
  /** ISO timestamp from the database; render with formatDate. */
  issued: string
  status: CardStatus
  reason: string | null
  /** The printer selected when the card was issued, if any was. */
  printer: string | null
}

/**
 * A learner as the API sends them. Columns that are nullable in MySQL arrive
 * as null rather than missing, so they are typed that way instead of optional.
 */
export interface Student {
  id: string
  lrn: string
  lastName: string
  firstName: string
  middleName: string | null
  suffix: string | null
  sex: 'Male' | 'Female' | null
  /** Empty when the learner has no enrolment in the active school year. */
  gradeLevel: string
  section: string
  strand: string | null
  idStatus: IdStatus
  active: boolean
  guardianName: string
  relationship: string | null
  contactNumber: string
  photoPath: string | null
  /** ISO timestamps; render with formatDate. */
  registeredOn: string
  lastUpdated: string
  registeredByName: string | null
  cards: IdCard[]
}

/** The signed-in staff account, from the `users` table. */
export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'registrar' | 'admin'
}

export const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  registrar: 'Registrar',
  scanner: 'Scanner',
}

/**
 * Grade levels, sections and strands are rows in MySQL, not constants — the
 * screens load them from GET /options (see listOptions in lib/db.ts), because
 * a learner can only be enrolled into a section that is on the roster.
 */
export const RELATIONSHIPS = [
  'Mother',
  'Father',
  'Guardian',
  'Grandparent',
  'Sibling',
]

/** Why a card is being replaced. Stored verbatim in id_cards.revoked_reason. */
export const REISSUE_REASONS = ['Lost', 'Damaged', 'Stolen', 'Incorrect details']

/**
 * Revoking without a replacement covers those plus the cases where the learner
 * is not getting another card at all.
 */
export const REVOKE_REASONS = [
  ...REISSUE_REASONS,
  'Transferred out',
  'No longer enrolled',
]

export const ID_STATUS_LABEL: Record<IdStatus, string> = {
  printed: 'Printed',
  'not-printed': 'Not printed',
  'reissue-needed': 'Reissue needed',
}

export const fullName = (s: Student) => {
  const mi = s.middleName ? ` ${s.middleName.charAt(0)}.` : ''
  const suffix = s.suffix ? ` ${s.suffix}` : ''
  return `${s.lastName}, ${s.firstName}${mi}${suffix}`
}

export const initials = (s: Student) =>
  `${s.firstName.charAt(0)}${s.lastName.charAt(0)}`.toUpperCase()

/** "Grade 11 - Kamagong", or a dash when the learner is not enrolled yet. */
export const gradeAndSection = (s: Student) =>
  [s.gradeLevel, s.section].filter(Boolean).join(' - ') || '—'

/** Initials for a registrar's sidebar avatar, e.g. "Rosario Gundran" -> "RG". */
export const nameInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

/** Timestamps arrive as ISO strings; the screens show "Jun 3, 2026". */
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

export const SCHOOL = {
  name: 'Luna National High School',
  address: 'Luyao, Luna, Isabela',
  schoolYear: '2026-2027',
}
