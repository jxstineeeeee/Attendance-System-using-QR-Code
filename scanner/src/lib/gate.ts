import { api } from './api'

/** The operator holding the scanner. Only scanner and admin accounts qualify. */
export interface Operator {
  id: string
  name: string
  email: string
  role: string
}

export interface Device {
  id: number
  code: string
  name: string
  location: string | null
  status: string
  lastSeen: string | null
}

/** The four windows of the school day, in order. */
export interface GateHours {
  opensAt: string
  amLateCutoffAt: string
  amOutOpensAt: string
  amOutClosesAt: string
  pmInOpensAt: string
  pmLateCutoffAt: string
  pmOutOpensAt: string
  closesAt: string
  rejectRevoked: boolean
}

export type Outcome = 'ok' | 'late' | 'invalid'
export type Session = 'am' | 'pm'

export interface SessionTimes {
  timeIn: string | null
  timeOut: string | null
  status: string
}

export interface ScanResult {
  outcome: Outcome
  /** Which half of the day this scan belongs to. */
  session: Session
  direction: 'in' | 'out'
  /** Why a scan was refused; null when it was accepted. */
  reason: string | null
  at: string
  student: {
    name: string
    lrn: string
    gradeSection: string
    photoPath: string | null
  } | null
  /** Both halves of the learner's day, after this scan. */
  day: {
    am: SessionTimes | null
    pm: SessionTimes | null
  }
  /** True when the API recognised this as a scan it had already recorded. */
  duplicate?: boolean
}

/** What the gate would make of a scan arriving right now. */
export interface CurrentWindow {
  session: Session
  direction: 'in' | 'out'
}

export async function signIn(email: string, password: string): Promise<Operator> {
  const { user } = await api.post<{ user: Operator }>('/auth/login', {
    email: email.trim(),
    password,
    app: 'scanner',
  })
  return user
}

export async function signOut(): Promise<void> {
  await api.post('/auth/logout')
}

export interface SessionCheck {
  operator: Operator | null
  /**
   * Set when this browser holds a session for a different app — the registrar
   * and the scanner share a cookie on localhost, because cookies ignore the
   * port.
   */
  otherRole: string | null
}

export async function currentOperator(): Promise<SessionCheck> {
  const res = await api.get<{ user: Operator | null; otherRole?: string }>(
    '/auth/session?app=scanner',
  )
  return { operator: res.user, otherRole: res.otherRole ?? null }
}

export async function listDevices(): Promise<Device[]> {
  const { devices } = await api.get<{ devices: Device[] }>('/devices')
  return devices
}

export async function gateHours(): Promise<{
  now: string
  gate: GateHours
  current: CurrentWindow | null
}> {
  return api.get<{ now: string; gate: GateHours; current: CurrentWindow | null }>(
    '/gate',
  )
}

/**
 * Sends one scan. `clientEventId` is generated per scan and is what makes a
 * resend safe: the API has a unique index on (device, clientEventId) and
 * replays the first decision rather than recording the scan twice.
 */
export async function sendScan(
  qrContent: string,
  device: string,
  clientEventId: string,
): Promise<ScanResult> {
  return api.post<ScanResult>('/scan', { qrContent, device, clientEventId })
}

/** "22:04" — the time part of a timestamp, which is all the gate cares about. */
export function clockTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}
