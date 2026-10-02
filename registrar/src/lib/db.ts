import { supabase } from './supabase'
import type { IdCardRow, StudentRow } from './database.types'
import type { IdCard, IdStatus, Student } from './types'

/**
 * Kept as one string literal, not a concatenation: supabase-js parses the
 * select list at the type level to infer the row shape, and a computed string
 * widens to `string`, which makes every result a GenericStringError.
 */
const STUDENT_COLUMNS =
  'id, lrn, last_name, first_name, middle_name, suffix, sex, grade_level, section, strand, id_status, active, guardian_name, relationship, contact_number, photo_path, registered_by, registered_on, last_updated' as const

const toStudent = (row: StudentRow): Student => ({
  id: row.id,
  lrn: row.lrn,
  lastName: row.last_name,
  firstName: row.first_name,
  middleName: row.middle_name ?? undefined,
  suffix: row.suffix ?? undefined,
  sex: row.sex ?? undefined,
  gradeLevel: row.grade_level,
  section: row.section,
  strand: row.strand ?? undefined,
  idStatus: row.id_status,
  active: row.active,
  guardianName: row.guardian_name,
  relationship: row.relationship ?? undefined,
  contactNumber: row.contact_number,
  photoPath: row.photo_path ?? undefined,
  registeredOn: row.registered_on,
  lastUpdated: row.last_updated,
  cards: [],
})

const toCard = (row: IdCardRow): IdCard => ({
  id: row.id,
  qrContent: row.qr_content,
  issued: row.issued_on,
  status: row.status,
  reason: row.revoked_reason ?? undefined,
})

/**
 * PostgREST reads commas, dots and parentheses as filter syntax inside `or()`,
 * so a raw search box value could break the query. Strip them.
 */
const sanitizeSearch = (q: string) => q.replace(/[,().%\\]/g, ' ').trim()

/** Card codes look like 136743020001-A7F2 — the LRN plus four hex digits. */
function newQrContent(lrn: string) {
  const bytes = new Uint8Array(2)
  crypto.getRandomValues(bytes)
  const code = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
  return `${lrn}-${code}`
}

export interface StudentFilters {
  query?: string
  grade?: string
  section?: string
  status?: string
}

export interface StudentPage {
  rows: Student[]
  total: number
}

/**
 * One page of the students list. Filtering, sorting and counting all happen in
 * Postgres so the client never holds the whole roster.
 */
export async function listStudents(
  filters: StudentFilters,
  page: number,
  pageSize: number,
): Promise<StudentPage> {
  let q = supabase
    .from('students')
    .select(STUDENT_COLUMNS, { count: 'exact' })
    .order('last_name')
    .order('first_name')
    .range(page * pageSize, page * pageSize + pageSize - 1)

  const search = filters.query ? sanitizeSearch(filters.query) : ''
  if (search) {
    q = q.or(
      `lrn.ilike.%${search}%,last_name.ilike.%${search}%,first_name.ilike.%${search}%`,
    )
  }
  if (filters.grade) q = q.eq('grade_level', filters.grade)
  if (filters.section) q = q.eq('section', filters.section)
  if (filters.status) q = q.eq('id_status', filters.status as IdStatus)

  const { data, error, count } = await q
  if (error) throw new Error(error.message)

  return {
    rows: (data as StudentRow[]).map(toStudent),
    total: count ?? 0,
  }
}

/** A student with their card history, or null when the id does not exist. */
export async function getStudent(id: string): Promise<Student | null> {
  const { data, error } = await supabase
    .from('students')
    .select(STUDENT_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const row = data as StudentRow
  const student = toStudent(row)

  const { data: cards, error: cardError } = await supabase
    .from('id_cards')
    .select('id, student_id, qr_content, status, revoked_reason, revoked_at, issued_on, issued_by')
    .eq('student_id', id)
    .order('issued_on', { ascending: false })

  if (cardError) throw new Error(cardError.message)
  student.cards = (cards as IdCardRow[]).map(toCard)

  if (row.registered_by) {
    const { data: registrar } = await supabase
      .from('registrars')
      .select('full_name')
      .eq('id', row.registered_by)
      .maybeSingle()
    student.registeredByName = registrar?.full_name ?? undefined
  }

  return student
}

/** Used by the register form to flag a duplicate before the insert is tried. */
export async function isLrnTaken(lrn: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('lrn', lrn)

  if (error) throw new Error(error.message)
  return (count ?? 0) > 0
}

export interface NewStudent {
  lrn: string
  lastName: string
  firstName: string
  middleName?: string
  suffix?: string
  sex?: string
  gradeLevel: string
  section: string
  strand?: string
  guardianName: string
  relationship?: string
  contactNumber: string
}

/**
 * Creates the learner and, when `issueCard` is set, their first ID card. The
 * card insert is what moves id_status to 'printed', via the database trigger.
 */
export async function registerStudent(
  input: NewStudent,
  registrarId: string | null,
  issueCard = true,
): Promise<string> {
  const { data, error } = await supabase
    .from('students')
    .insert({
      lrn: input.lrn,
      last_name: input.lastName.trim(),
      first_name: input.firstName.trim(),
      middle_name: input.middleName?.trim() || null,
      suffix: input.suffix?.trim() || null,
      sex: input.sex === 'Male' || input.sex === 'Female' ? input.sex : null,
      grade_level: input.gradeLevel,
      section: input.section,
      strand: input.strand || null,
      guardian_name: input.guardianName.trim(),
      relationship: input.relationship || null,
      contact_number: input.contactNumber.trim(),
      photo_path: null,
      registered_by: registrarId,
    })
    .select('id')
    .single()

  if (error) {
    // 23505 is unique_violation, which here can only be the LRN.
    if (error.code === '23505') {
      throw new Error('That LRN is already registered.')
    }
    throw new Error(error.message)
  }

  const studentId = (data as { id: string }).id

  if (issueCard) {
    const { error: cardError } = await supabase.from('id_cards').insert({
      student_id: studentId,
      qr_content: newQrContent(input.lrn),
      issued_by: registrarId,
    })
    // The learner is saved either way; surface the card failure without
    // pretending the registration itself failed.
    if (cardError) {
      throw new Error(
        `Student saved, but the ID card could not be issued: ${cardError.message}`,
      )
    }
  }

  return studentId
}

/** Issues a card for a student who has none active. */
export async function issueCard(
  studentId: string,
  lrn: string,
  registrarId: string | null,
): Promise<void> {
  const { error } = await supabase.from('id_cards').insert({
    student_id: studentId,
    qr_content: newQrContent(lrn),
    issued_by: registrarId,
  })
  if (error) {
    if (error.code === '23505') {
      throw new Error('This student already has an active card.')
    }
    throw new Error(error.message)
  }
}

export async function revokeCard(cardId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('id_cards')
    .update({
      status: 'revoked',
      revoked_reason: reason,
      revoked_at: new Date().toISOString(),
    })
    .eq('id', cardId)

  if (error) throw new Error(error.message)
}

/**
 * Revokes whatever card is active and issues a replacement. The unique index on
 * one active card per student means the revoke has to land first.
 */
export async function reissueCard(
  studentId: string,
  lrn: string,
  reason: string,
  registrarId: string | null,
): Promise<void> {
  const { data, error } = await supabase
    .from('id_cards')
    .select('id')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (data) await revokeCard((data as { id: string }).id, reason)

  await issueCard(studentId, lrn, registrarId)
}

export async function setStudentActive(
  id: string,
  active: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('students')
    .update({ active })
    .eq('id', id)

  if (error) throw new Error(error.message)
}
