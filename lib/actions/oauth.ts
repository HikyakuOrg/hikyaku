'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { userHasCompanyOrg } from '@/lib/actions/organisations'

/** One third-party app the signed-in user has authorised. One consent per OAuth client. */
export interface ConnectedApp {
  clientId: string
  name: string
  uri: string | null
  logoUri: string | null
  scopes: string[]
  grantedAt: string
}

/** Handles Approve and Deny on /oauth/consent. The "decision" field tells them apart. */
export async function submitOAuthDecision(formData: FormData): Promise<void> {
  const authorizationId = formData.get('authorization_id')
  const decision = formData.get('decision')

  if (typeof authorizationId !== 'string' || !authorizationId) {
    redirect('/auth/error?error=Missing+authorization_id')
  }

  const supabase = await createClient()

  // Personal accounts cannot issue OAuth tokens. Check again in case of a
  // direct POST.
  const approve = decision === 'approve' && (await userHasCompanyOrg())

  const { data, error } = approve
    ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
    : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true })

  if (error || !data?.redirect_url) {
    redirect(`/auth/error?error=${encodeURIComponent(error?.message ?? 'OAuth authorization failed')}`)
  }

  redirect(data.redirect_url)
}

/** Apps the signed-in user has authorised, newest first. */
export async function listConnectedApps(): Promise<ConnectedApp[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.oauth.listGrants()

  if (error) throw new Error(error.message)

  return (data ?? [])
    .map((grant) => ({
      clientId: grant.client.id,
      name: grant.client.name,
      // Supabase returns "" when these are not set. Use null.
      uri: grant.client.uri || null,
      logoUri: grant.client.logo_uri || null,
      scopes: grant.scopes ?? [],
      grantedAt: grant.granted_at,
    }))
    .sort((a, b) => b.grantedAt.localeCompare(a.grantedAt))
}

/**
 * Revoke the user's consent for one app. Supabase ends its sessions and
 * tokens, so the app must ask for consent again.
 */
export async function revokeConnectedApp(
  slug: string,
  clientId: string,
): Promise<string | null> {
  const supabase = await createClient()
  const { error } = await supabase.auth.oauth.revokeGrant({ clientId })

  if (error) return error.message

  revalidatePath(`/orgs/${slug}/dashboard/user/connected-apps`)
  return null
}
