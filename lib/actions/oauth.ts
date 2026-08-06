'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

  const { data, error } =
    decision === 'approve'
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
      : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true })

  if (error || !data?.redirect_url) {
    redirect(`/auth/error?error=${encodeURIComponent(error?.message ?? 'OAuth authorization failed')}`)
  }

  redirect(data.redirect_url)
}
