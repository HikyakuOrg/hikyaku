'use client'

import { createContext, useContext, type ReactNode } from 'react'

const OrganisationIdContext = createContext<string | null>(null)

/**
 * Makes the dashboard's organisation id available to client components.
 *
 * The browser reads in `lib/supabase/db.ts` filter on `organisation_id`
 * explicitly, because RLS admits every organisation the caller belongs to. The
 * dashboard layout already resolved the organisation from the URL slug, so it
 * hands the id down here instead of every picker looking it up again.
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
