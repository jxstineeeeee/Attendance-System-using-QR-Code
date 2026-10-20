import { ApiError, api, queryString } from './api'
import type { Student } from './types'

/**
 * Every call here is one request to the PHP API, which answers with the same
 * camelCase shapes the screens use — the row-to-domain mapping lives in PHP
 * (api/src/students.php) so the SQL and the names it produces stay together.
 *
 * Who is acting is never sent from the browser: the API reads it from the
 * session cookie and stamps `registered_by` / `issued_by` itself.
 */

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

/** One page of the students list; MySQL does the filtering, sorting and count. */
export async function listStudents(
  filters: StudentFilters,
  page: number,
  pageSize: number,
): Promise<StudentPage> {
  return api.get<StudentPage>(
    '/students' +
      queryString({
        query: filters.query,
        grade: filters.grade,
        section: filters.section,
        status: filters.status,
        page,
        pageSize,
      }),
  )
}

/** A student with their card history, or null when the id does not exist. */
export async function getStudent(id: string): Promise<Student | null> {
  try {
    const { student } = await api.get<{ student: Student }>(
      `/students/${encodeURIComponent(id)}`,
    )
    return student
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

/** Used by the register form to flag a duplicate before the insert is tried. */
export async function isLrnTaken(lrn: string): Promise<boolean> {
  const { taken } = await api.get<{ taken: boolean }>(
    '/students/lrn-taken' + queryString({ lrn }),
  )
  return taken
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
  guardianName: string
  relationship?: string
  contactNumber: string
}

/**
 * Creates the learner, enrols them in the chosen section for the active school
 * year and, unless told otherwise, issues their first ID card. The card is what
 * moves id_status to 'printed', via the trigger on id_cards.
 */
export async function registerStudent(
  input: NewStudent,
  printer?: string | null,
  issueFirstCard = true,
): Promise<string> {
  const { id } = await api.post<{ id: string }>('/students', {
    ...input,
    issueCard: issueFirstCard,
    printer: printer ?? null,
  })
  return id
}

/**
 * Issues a card for a student who has none active. The printer, when one is
 * selected, is recorded on the card as where it was meant to come out.
 */
export async function issueCard(
  studentId: string,
  printer?: string | null,
): Promise<void> {
  await api.post(`/students/${encodeURIComponent(studentId)}/cards`, {
    printer: printer ?? null,
  })
}

/**
 * Kills the learner's active card without printing a replacement. Keyed by
 * student, so a roster screen never has to look the card id up first.
 */
export async function revokeActiveCard(
  studentId: string,
  reason: string,
): Promise<void> {
  await api.post(`/students/${encodeURIComponent(studentId)}/revoke`, { reason })
}

/** Revokes whatever card is active and issues a replacement, in one transaction. */
export async function reissueCard(
  studentId: string,
  reason: string,
  printer?: string | null,
): Promise<void> {
  await api.post(`/students/${encodeURIComponent(studentId)}/reissue`, {
    reason,
    printer: printer ?? null,
  })
}

export async function setStudentActive(
  id: string,
  active: boolean,
): Promise<void> {
  await api.patch(`/students/${encodeURIComponent(id)}`, { active })
}

export interface SectionOption {
  id: number
  name: string
  gradeLevel: string
  strand: string | null
  adviser: string | null
}

export interface RosterOptions {
  /** Label of the active school year, or null when none is marked active. */
  schoolYear: string | null
  grades: { name: string; seniorHigh: boolean }[]
  sections: SectionOption[]
  strands: string[]
}

/**
 * Grade levels, sections and strands as they exist in the database. A learner
 * can only be enrolled into a section that is on the roster, so the forms are
 * built from this rather than from a hard-coded list.
 */
export async function listOptions(): Promise<RosterOptions> {
  return api.get<RosterOptions>('/options')
}

export interface Printer {
  name: string
  isDefault: boolean
  offline: boolean
  /** Windows port, e.g. USB001 or PORTPROMPT: — shown as a hint. */
  port: string
  /** True for "printers" that write a file instead: Print to PDF, OneNote. */
  virtual: boolean
}

export interface PrinterList {
  printers: Printer[]
  /** The machine the list came from — the one running Apache. */
  host: string
  /** Why the list is empty, when it is. */
  note: string | null
}

/**
 * The printers installed on the machine running the API. A browser cannot
 * enumerate printers itself, so this is the only way to offer a choice; see
 * api/src/printers.php for what that means when the API is not on this PC.
 */
export async function listPrinters(): Promise<PrinterList> {
  return api.get<PrinterList>('/printers')
}
