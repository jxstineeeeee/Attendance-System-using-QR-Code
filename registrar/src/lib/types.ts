export type IdStatus = 'printed' | 'not-printed' | 'reissue-needed'

export type CardStatus = 'active' | 'revoked'

export interface IdCard {
  id: string
  qrContent: string
  /** ISO timestamp from the database; render with formatDate. */
  issued: string
  status: CardStatus
  reason?: string
}

export interface Student {
  id: string
  lrn: string
  lastName: string
  firstName: string
  middleName?: string
  suffix?: string
  sex?: 'Male' | 'Female'
  gradeLevel: string
  section: string
  strand?: string
  idStatus: IdStatus
  active: boolean
  guardianName: string
  relationship?: string
  contactNumber: string
  photoPath?: string
  /** ISO timestamps; render with formatDate. */
  registeredOn: string
  lastUpdated: string
  registeredByName?: string
  cards: IdCard[]
}

export interface Registrar {
  id: string
  name: string
  role: string
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

export const RELATIONSHIPS = [
  'Mother',
  'Father',
  'Guardian',
  'Grandparent',
  'Sibling',
]

export const ID_STATUS_LABEL: Record<IdStatus, string> = {
  printed: 'Printed',
  'not-printed': 'Not printed',
  'reissue-needed': 'Reissue needed',
}

/** Grades 11 and 12 are senior high, the only band that carries a strand. */
export const isSeniorHigh = (grade: string) =>
  grade === 'Grade 11' || grade === 'Grade 12'

export const fullName = (s: Student) => {
  const mi = s.middleName ? ` ${s.middleName.charAt(0)}.` : ''
  const suffix = s.suffix ? ` ${s.suffix}` : ''
  return `${s.lastName}, ${s.firstName}${mi}${suffix}`
}

export const initials = (s: Student) =>
  `${s.firstName.charAt(0)}${s.lastName.charAt(0)}`.toUpperCase()

export const gradeAndSection = (s: Student) => `${s.gradeLevel} - ${s.section}`

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
