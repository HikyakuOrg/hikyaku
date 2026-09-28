"use server"

import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { cookieDomain } from '@/lib/subdomain'
import type { OrgPermission } from '@/lib/permissions'
import { Database } from './supabase'

/** Create a new client in each function. Do not keep it in a global (Fluid compute). */
export async function createClient() {
  const cookieStore = await cookies()
  const host = (await headers()).get('host')

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookieOptions: { domain: cookieDomain(host) },
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
            // Called from a Server Component. Safe to ignore: middleware
            // refreshes the session.
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
 * Whether the signed-in user has `permission` in the organisation `slug`.
 *
 * For UI gating only: RLS is the real boundary. This hides controls that would
 * fail. Call it from a server component or layout and pass the result down as
 * a prop. Returns false on any error.
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