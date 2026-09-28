'use server'

import { createClient } from '@/lib/supabase/server'
import { getIssuingStatuses } from '@/lib/actions/connect'

export interface OrganisationSummary {
  id: string
  slug: string
  /** Null for personal orgs. The UI shows "Personal". */
  name: string | null
  orgType: string
  cardIssuingStatus: string | null
  detailsSubmitted: boolean
  /** Whether the org can accept payments. Controls the "Service Rates" menu item. */
  chargesEnabled: boolean
}

/**
 * Create an org. A user has one personal org (usually made at signup), so for
 * a personal org this returns the existing slug.
 */
export async function createOrganisation(
  name: string | null,
  orgType: 'personal' | 'company',
): Promise<{ slug: string } | string> {
  const supabase = await createClient()

  if (orgType === 'personal') {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return 'You are not signed in.'

    const { data: existing } = await supabase
      .from('organisations')
      .select('slug')
      .eq('created_by', userData.user.id)
      .eq('org_type', 'personal')
      .maybeSingle()
    if (existing?.slug) return { slug: existing.slug }

    // Fallback: signup normally creates it.
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
  if (error) {
    if (error.code === '23505') return 'An organisation with that name already exists. Try a different name.'
    return error.message
  }
  return { slug: data?.slug || '' }
}

/**
 * An org's type, without the Stripe lookup in listMyOrganisations(). Returns
 * null when the org does not exist or the caller cannot see it.
 */
export async function getOrganisationType(
  slug: string,
): Promise<'personal' | 'company' | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('organisations')
    .select('org_type')
    .eq('slug', slug)
    .maybeSingle()
  if (!data) return null
  return data.org_type === 'company' ? 'company' : 'personal'
}

/**
 * An org's vanity booking subdomain label, e.g. 'acme-couriers'. Use
 * `tenantUrl()` for the full URL. Null for personal orgs. A DB trigger sets it.
 */
export async function getOrganisationVanitySlug(
  slug: string,
): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('organisations')
    .select('vanity_slug')
    .eq('slug', slug)
    .maybeSingle()
  return data?.vanity_slug ?? null
}

/**
 * Org id and logo URL, for the logo uploader and branded QR codes. Returns
 * null when the org does not exist or the caller cannot see it.
 */
export async function getOrganisationBranding(
  slug: string,
): Promise<{ id: string; logoUrl: string | null } | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('organisations')
    .select('id, logo_url')
    .eq('slug', slug)
    .maybeSingle()
  if (!data) return null
  return { id: data.id, logoUrl: data.logo_url }
}

/** Save the URL of a logo uploaded with uploadOrganisationLogo. Null removes the logo. */
export async function updateOrganisationLogo(
  slug: string,
  logoUrl: string | null,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('organisations')
    .update({ logo_url: logoUrl })
    .eq('slug', slug)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * Whether the signed-in user belongs to a company org. OAuth grants are per
 * user, so OAuth features check this, not the org in the URL.
 */
export async function userHasCompanyOrg(): Promise<boolean> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return false

  const { data } = await supabase
    .from('organisations')
    .select('id, team_members!inner(id)')
    .eq('team_members.id', userData.user.id)
    .eq('org_type', 'company')
    .limit(1)
    .maybeSingle()

  return !!data
}

/** Organisations the signed-in user belongs to, for the org switcher. */
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
      chargesEnabled: stripe?.chargesEnabled ?? false,
    }
  })
}
