"use server"

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cookieDomain } from '@/lib/subdomain'
import type { OrgPermission } from '@/lib/permissions'
import { Database } from './supabase'

/**
 * If using Fluid compute: Don't put this client in a global variable. Always create a new client within each
 * function when using it.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookieOptions: { domain: cookieDomain() },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function getSupabaseServerClaims(){
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  return { data, error }
}

/**
 * Whether the signed-in user holds `permission` in the organisation addressed by
 * `slug` (the `/orgs/<slug>/...` route segment), which is the same org resolution the
 * dashboard layout uses when it picks `currentOrg` out of listMyOrganisations().
 * Slug to id is looked up directly here because listMyOrganisations() also does
 * a Stripe round trip we do not need (getOrganisationType() skips it for the
 * same reason).
 *
 * UI gating only. The RLS policies on the underlying table are the real
 * boundary and stay strict whether or not a control is on screen; this exists so
 * we never render a control that is guaranteed to fail.
 *
 * Call it from a server component or layout and pass the boolean down as a prop
 * (see the service-areas pages) rather than from a client component, which would
 * cost a round trip per control. Like getSupabaseServerClaims() it goes through
 * the request-scoped client, so it reads this request's cookies and its result
 * is never shared between users or orgs under `cacheComponents`.
 *
 * Fails closed: an unreachable database disables the control rather than
 * offering a write that cannot succeed.
 */
export async function hasOrgPermission(
  slug: string,
  permission: OrgPermission,
): Promise<boolean> {
  const supabase = await createClient()

  const { data: org, error: orgError } = await supabase
    .from('organisations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (orgError || !org) {
    if (orgError) console.error(orgError)
    return false
  }

  const { data, error } = await supabase.rpc('has_org_permission', {
    p_org: org.id,
    p_permission: permission,
  })

  if (error) {
    console.error(error)
    return false
  }

  return data === true
}