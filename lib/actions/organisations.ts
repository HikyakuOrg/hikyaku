'use server'

import { createClient } from '@/lib/supabase/server'
import { getIssuingStatuses } from '@/lib/actions/connect'

export interface OrganisationSummary {
  id: string
  slug: string
  /** NULL for personal orgs — UI renders these as "Personal". */
  name: string | null
  orgType: string
  cardIssuingStatus: string | null
  detailsSubmitted: boolean
}

/**
 * Create or look up the caller's org. Personal orgs are unique per user
 * (enforced by the partial unique index in migration 0010): if the caller
 * already has a personal org — usually the one auto-created at signup by
 * handle_new_user() — we return its slug instead of inserting a duplicate.
 */
export async function createOrganisation(
  name: string | null,
  orgType: 'personal' | 'company',
): Promise<{ slug: string } | string> {
  const supabase = await createClient()

  if (orgType === 'personal') {
    // Reuse the user's existing personal org (almost always the signup one).
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return 'Not authenticated.'

    const { data: existing } = await supabase
      .from('organisations')
      .select('slug')
      .eq('created_by', userData.user.id)
      .eq('org_type', 'personal')
      .maybeSingle()
    if (existing?.slug) return { slug: existing.slug }

    // Defensive — the signup trigger should already have created one.
    const { data, error } = await supabase
      .from('organisations')
      .insert({ name: null, org_type: 'personal' })
      .select('slug')
      .maybeSingle()
    if (error) return error.message
    return { slug: data?.slug || '' }
  }

  if (!name || !name.trim()) return 'Company name is required.'
  const { data, error } = await supabase
    .from('organisations')
    .insert({ name: name.trim(), org_type: 'company' })
    .select('slug')
    .maybeSingle()
  if (error) return error.message
  return { slug: data?.slug || '' }
}

/**
 * Change an existing org's type. Used by the Business Information page when a
 * personal org upgrades in place to a company (or vice versa). The DB partial
 * unique index will reject downgrading to personal if the caller already has
 * another personal org — that error is surfaced verbatim.
 */
export async function setOrgType(
  slug: string,
  orgType: 'personal' | 'company',
): Promise<{ ok: true } | string> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('organisations')
    .update({ org_type: orgType })
    .eq('slug', slug)
  if (error) return error.message
  return { ok: true }
}

/** Organisations the signed-in user belongs to — powers the org switcher. */
export async function listMyOrganisations(): Promise<OrganisationSummary[]> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return []

  const [orgsResult, issuingStatuses] = await Promise.all([
    supabase
      .from('organisations')
      .select('id, slug, name, org_type, team_members!inner(id)')
      .eq('team_members.id', userData.user.id),
    getIssuingStatuses(),
  ])

  if (orgsResult.error || !orgsResult.data) return []

  const statusBySlug = new Map(
    issuingStatuses.map((s) => [s.slug, s]),
  )

  return orgsResult.data.map(({ id, slug, name, org_type }) => {
    const stripe = statusBySlug.get(slug)
    return {
      id,
      slug,
      name: name ?? null,
      orgType: org_type ?? 'personal',
      cardIssuingStatus: stripe?.cardIssuingStatus ?? null,
      detailsSubmitted: stripe?.detailsSubmitted ?? false,
    }
  })
}
