'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface OrganisationSummary {
  id: string
  slug: string
  name: string
}

/**
 * Creates a new organisation for an already-authenticated user via the
 * create_new_organisation Supabase RPC. Returns the new org's slug, or an
 * error string on failure.
 */
export async function createOrganisation(name: string): Promise<{ slug: string } | string> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organisations')
    .insert({ name })
    .select()
    .maybeSingle()

  if (error) return error.message
  return { slug: data?.id || '' }
}

/** Organisations the signed-in user belongs to — powers the org switcher. */
export async function listMyOrganisations(): Promise<OrganisationSummary[]> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return []

  const { data, error } = await supabase
    .from('organisations')
    .select('id, slug, name, user_permission!inner(user_id)')
    .eq('user_permission.user_id', userData.user.id)

  if (error || !data) return []
  return data.map(({ id, slug, name }) => ({ id, slug, name }))

}
