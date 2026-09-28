'use client'

import { createContext, useContext, type ReactNode } from 'react'

const OrganisationIdContext = createContext<string | null>(null)

/**
 * Gives client components the dashboard's organisation id. Browser reads
 * filter by it, because RLS shows every organisation the user belongs to.
 */
export function OrganisationProvider({
  organisationId,
  children,
}: {
  organisationId: string
  children: ReactNode
}) {
  return (
    <OrganisationIdContext.Provider value={organisationId}>
      {children}
    </OrganisationIdContext.Provider>
  )
}

/** The id of the organisation whose dashboard is open. */
export function useOrganisationId(): string {
  const organisationId = useContext(OrganisationIdContext)
  if (!organisationId) {
    throw new Error('useOrganisationId must be used inside the organisation dashboard.')
  }
  return organisationId
}
