import { useEffect, useState } from 'react'
import { listOptions, type RosterOptions } from './db'

/**
 * The grade levels and sections on file, shared by the students filters and
 * the register form. One request per sign-in: the roster changes once a school
 * year, so the promise is cached for the life of the page.
 */
let pending: Promise<RosterOptions> | null = null

const EMPTY: RosterOptions = {
  schoolYear: null,
  grades: [],
  sections: [],
  strands: [],
}

export function loadRoster(): Promise<RosterOptions> {
  pending ??= listOptions().catch((err: unknown) => {
    // Don't cache a failure, so the next screen can try again.
    pending = null
    throw err
  })
  return pending
}

export function useRoster() {
  const [roster, setRoster] = useState<RosterOptions>(EMPTY)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    loadRoster()
      .then((next) => {
        if (!cancelled) setRoster(next)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load grade levels and sections.',
        )
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { roster, error }
}

/** The sections offered for a grade level, or all of them when none is picked. */
export function sectionsFor(roster: RosterOptions, gradeLevel: string) {
  if (!gradeLevel) {
    // The students filter lists every section name once, across all grades.
    return [...new Set(roster.sections.map((s) => s.name))].sort()
  }
  return roster.sections
    .filter((s) => s.gradeLevel === gradeLevel)
    .map((s) => s.name)
}
