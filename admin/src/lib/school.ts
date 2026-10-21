import { useEffect, useState } from 'react'
import { api } from './api'

/**
 * The school's own name and address, which the sign-in screen shows before
 * anyone is signed in.
 *
 * `GET /school` serves it without a session — it is the name on the building
 * and on every ID card, not a secret. These values are the fallback for when
 * the API cannot be reached, so the panel is never blank.
 */
export const SCHOOL = {
  name: 'Luna National High School',
  address: 'Luyao, Luna, Isabela',
  schoolId: '136743',
  schoolYear: null as string | null,
}

export interface SchoolIdentity {
  name: string
  address: string | null
  schoolId: string | null
  schoolYear: string | null
}

export function useSchool(): SchoolIdentity {
  const [school, setSchool] = useState<SchoolIdentity>(SCHOOL)

  useEffect(() => {
    let cancelled = false

    api
      .get<SchoolIdentity>('/school')
      .then((res) => {
        if (!cancelled) setSchool(res)
      })
      .catch(() => {
        // Keep the fallback; the sign-in form reports a dead API on submit.
      })

    return () => {
      cancelled = true
    }
  }, [])

  return school
}
