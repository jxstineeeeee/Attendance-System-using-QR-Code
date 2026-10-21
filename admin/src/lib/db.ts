import { api, queryString } from './api'
import type {
  Academic,
  AttendanceRow,
  AttendanceStatus,
  AuditEntry,
  AuditKind,
  Device,
  Overview,
  ScanEvent,
  SessionKey,
  Settings,
  StaffUser,
} from './types'

/**
 * Every call the admin console makes, in one place.
 *
 * The API already answers in the camelCase shapes the screens use, so there is
 * no row-mapping layer here — these are thin, typed wrappers whose job is to
 * keep URL building out of the components.
 */

/* --------------------------------------------------------------- Dashboard */

export const getOverview = () => api.get<Overview>('/admin/overview')

/* -------------------------------------------------------------- Attendance */

export interface AttendanceFilters {
  date: string
  session: SessionKey
  query?: string
  grade?: string
  section?: string
  status?: AttendanceStatus | ''
  page?: number
  pageSize?: number
}

export interface AttendancePage {
  date: string
  session: SessionKey
  rows: AttendanceRow[]
  total: number
  totals: {
    present: number
    late: number
    absent: number
    enrolled: number
  }
}

export const listAttendance = (f: AttendanceFilters) =>
  api.get<AttendancePage>('/admin/attendance' + queryString({ ...f }))

/**
 * The CSV is a download, not a fetch — the browser needs to follow it so the
 * Content-Disposition header does its job. Same filters, minus the paging.
 */
export const attendanceCsvUrl = (f: AttendanceFilters) =>
  '/api/admin/attendance/export' +
  queryString({
    date: f.date,
    session: f.session,
    query: f.query,
    grade: f.grade,
    section: f.section,
    status: f.status,
  })

/* ------------------------------------------------------------------- Staff */

export const listStaff = (f: { query?: string; role?: string; status?: string }) =>
  api.get<{ rows: StaffUser[] }>('/admin/staff' + queryString({ ...f }))

export const createStaff = (body: {
  name: string
  email: string
  role: string
}) => api.post<{ id: string }>('/admin/staff', body)

export const updateStaff = (
  id: string,
  body: { name?: string; role?: string; status?: 'active' | 'disabled' },
) => api.patch<{ ok: true }>(`/admin/staff/${id}`, body)

export const setStaffPassword = (id: string, password: string) =>
  api.post<{ ok: true; nowActive: boolean; stillDisabled: boolean }>(
    `/admin/staff/${id}/password`,
    { password },
  )

/* ----------------------------------------------------------------- Devices */

export const listDevices = () =>
  api.get<{ devices: Device[] }>('/admin/devices')

export const pairDevice = (body: {
  code: string
  name: string
  location?: string
}) => api.post<{ id: number }>('/admin/devices', body)

export const updateDevice = (
  id: number,
  body: { name?: string; location?: string | null; isActive?: boolean },
) => api.patch<{ ok: true }>(`/admin/devices/${id}`, body)

export const listDeviceScans = (id: number) =>
  api.get<{ scans: ScanEvent[] }>(`/admin/devices/${id}/scans`)

/* ---------------------------------------------------------------- Academic */

export const getAcademic = () => api.get<Academic>('/admin/academic')

export interface SectionInput {
  name: string
  gradeLevelId: number
  strandId: number | null
  adviser: string
}

export const createSection = (body: SectionInput) =>
  api.post<{ id: number }>('/admin/academic/sections', body)

export const updateSection = (id: number, body: SectionInput) =>
  api.patch<{ ok: true }>(`/admin/academic/sections/${id}`, body)

export const deleteSection = (id: number) =>
  api.delete<{ ok: true }>(`/admin/academic/sections/${id}`)

/* --------------------------------------------------------------- Audit log */

export const auditCsvUrl = (f: { query?: string; kind?: AuditKind | '' }) =>
  '/api/admin/audit/export' + queryString({ ...f })

export const listAudit = (f: {
  query?: string
  kind?: AuditKind | ''
  page?: number
  pageSize?: number
}) =>
  api.get<{ rows: AuditEntry[]; total: number }>(
    '/admin/audit' + queryString({ ...f }),
  )

/* ---------------------------------------------------------------- Settings */

export const getSettings = () =>
  api.get<{ settings: Settings }>('/admin/settings')

export const saveSettings = (body: Partial<Settings>) =>
  api.patch<{ settings: Settings; changed: boolean }>('/admin/settings', body)
