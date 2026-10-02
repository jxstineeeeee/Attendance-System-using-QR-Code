/**
 * Row shapes for the tables in supabase/migrations. Hand-written to match that
 * schema; regenerate with
 *
 *   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
 *
 * once the project is linked.
 *
 * These are `type` aliases rather than `interface` on purpose: supabase-js
 * constrains a schema's tables to Record<string, unknown>, and an interface has
 * no implicit index signature, so using one collapses every query result to
 * `never`.
 */

export type IdStatusRow = 'printed' | 'not-printed' | 'reissue-needed'
export type CardStatusRow = 'active' | 'revoked'
export type SexRow = 'Male' | 'Female'

export type StudentRow = {
  id: string
  lrn: string
  last_name: string
  first_name: string
  middle_name: string | null
  suffix: string | null
  sex: SexRow | null
  grade_level: string
  section: string
  strand: string | null
  id_status: IdStatusRow
  active: boolean
  guardian_name: string
  relationship: string | null
  contact_number: string
  photo_path: string | null
  registered_by: string | null
  registered_on: string
  last_updated: string
}

export type IdCardRow = {
  id: string
  student_id: string
  qr_content: string
  status: CardStatusRow
  revoked_reason: string | null
  revoked_at: string | null
  issued_on: string
  issued_by: string | null
}

export type RegistrarRow = {
  id: string
  full_name: string
  role: string
  created_at: string
}

/** Columns the app sets on insert; the rest carry database defaults. */
type StudentInsert = Omit<
  StudentRow,
  'id' | 'id_status' | 'active' | 'registered_on' | 'last_updated'
> &
  Partial<Pick<StudentRow, 'id' | 'active' | 'registered_on'>>

type IdCardInsert = Omit<
  IdCardRow,
  'id' | 'status' | 'revoked_reason' | 'revoked_at' | 'issued_on'
> &
  Partial<Pick<IdCardRow, 'id' | 'status' | 'issued_on'>>

type RegistrarInsert = Omit<RegistrarRow, 'created_at' | 'role'> &
  Partial<Pick<RegistrarRow, 'created_at' | 'role'>>

export type Database = {
  public: {
    Tables: {
      students: {
        Row: StudentRow
        Insert: StudentInsert
        Update: Partial<StudentRow>
        Relationships: []
      }
      id_cards: {
        Row: IdCardRow
        Insert: IdCardInsert
        Update: Partial<IdCardRow>
        Relationships: []
      }
      registrars: {
        Row: RegistrarRow
        Insert: RegistrarInsert
        Update: Partial<RegistrarRow>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      is_registrar: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      id_status: IdStatusRow
      card_status: CardStatusRow
      student_sex: SexRow
    }
    CompositeTypes: { [_ in never]: never }
  }
}
