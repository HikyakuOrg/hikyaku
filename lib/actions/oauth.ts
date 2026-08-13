'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { userHasCompanyOrg } from '@/lib/actions/organisations'

/**
 * One third-party app the signed-in user has authorised. Supabase models this
 * per OAuth client rather than per session: a client holds a single consent
 * record, and revoking it drops every session and refresh token issued under
 * it (see revokeConnectedApp).
 */
export interface ConnectedApp {
  clientId: string
  name: string
  uri: string | null
  logoUri: string | null
  scopes: string[]
  grantedAt: string
}

/**
 * Handles the Approve/Deny buttons on /oauth/consent. Both buttons submit the
 * same form; they're distinguished by the "decision" field the clicked
 * button contributes to the FormData.
 */
export async function submitOAuthDecision(formData: FormData): Promise<void> {
  const authorizationId = formData.get('authorization_id')
  const decision = formData.get('decision')

  if (typeof authorizationId !== 'string' || !authorizationId) {
    redirect('/auth/error?error=Missing+authorization_id')
  }

  const supabase = await createClient()

  // Personal accounts can't issue OAuth tokens — re-checked here in case the
  // consent screen's own gate (app/oauth/consent/page.tsx) is bypassed by a
  // direct POST with decision=approve.
  const approve = decision === 'approve' && (await userHasCompanyOrg())

  const { data, error } = approve
    ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
    : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true })

  if (error || !data?.redirect_url) {
    redirect(`/auth/error?error=${encodeURIComponent(error?.message ?? 'OAuth authorization failed')}`)
  }

  redirect(data.redirect_url)
}

/**
 * Lists the apps the signed-in user has authorised through the OAuth 2.1
 * server, newest first.
 */
export async function listConnectedApps(): Promise<ConnectedApp[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.oauth.listGrants()

  if (error) throw new Error(error.message)

  return (data ?? [])
    .map((grant) => ({
      clientId: grant.client.id,
      name: grant.client.name,
      // Supabase returns these as empty strings when the client didn't register
      // them; normalise so the UI only has to check for null.
      uri: grant.client.uri || null,
      logoUri: grant.client.logo_uri || null,
      scopes: grant.scopes ?? [],
      grantedAt: grant.granted_at,
    }))
    .sort((a, b) => b.grantedAt.localeCompare(a.grantedAt))
}

/**
 * Revokes the user's consent for one app. Supabase marks the consent revoked,
 * deletes that client's active sessions and invalidates its refresh tokens, so
 * the app has to go through /oauth/consent again to regain access.
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
