import { createOrganisation } from '@/lib/actions/organisations'
import { orgPath } from '@/lib/subdomain'
import type { createClient } from '@/lib/supabase/client'

/**
 * Which flow sent the user to the OTP screen. It sets the text and the resend
 * call: signup and passwordless sign-in use different endpoints.
 */
export type VerificationIntent = 'signup' | 'signin'

export type PendingVerification = {
  email: string
  intent: VerificationIntent
  /** Same-origin path to land on after verifying, e.g. /oauth/consent. */
  redirectTo?: string
}

// The account waiting for an emailed code. Stored so the OTP screen survives a
// page refresh.
const PENDING_KEY = 'hikyaku:pending-verification-email'

export function setPendingVerification(
  email: string,
  intent: VerificationIntent,
  redirectTo?: string,
): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ email, intent, redirectTo }))
  } catch {
    // localStorage can be unavailable. The OTP screen then asks for the email.
  }
}

export function getPendingVerification(): PendingVerification {
  const empty: PendingVerification = { email: '', intent: 'signup' }
  try {
    const stored = localStorage.getItem(PENDING_KEY)
    if (!stored) return empty
    // Older builds stored the email as plain text.
    if (!stored.startsWith('{')) return { email: stored, intent: 'signup' }

    const parsed = JSON.parse(stored) as Partial<PendingVerification>
    return {
      email: typeof parsed.email === 'string' ? parsed.email : '',
      intent: parsed.intent === 'signin' ? 'signin' : 'signup',
      redirectTo: isSafeRedirectPath(parsed.redirectTo) ? parsed.redirectTo : undefined,
    }
  } catch {
    return empty
  }
}

export function clearPendingVerification(): void {
  try {
    localStorage.removeItem(PENDING_KEY)
  } catch {
    // no-op, see setPendingVerification.
  }
}

/**
 * Prevents open redirects: allows only same-origin relative paths. Rejects
 * "https://evil.com" and "//evil.com".
 */
export function isSafeRedirectPath(path: string | null | undefined): path is string {
  return !!path && path.startsWith('/') && !path.startsWith('//') && !path.includes('://')
}

/**
 * The dashboard path for a user who just signed in. Signup creates the user's
 * org. If it does not exist yet, this creates a personal org.
 */
export async function resolveOrgPath(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  const { data: org, error } = await supabase
    .from('organisations')
    .select('slug')
    .eq('created_by', userId)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (org?.slug) return orgPath(org.slug, '/dashboard')

  const created = await createOrganisation(null, 'personal')
  if (typeof created === 'string') throw new Error(created)
  return orgPath(created.slug, '/dashboard')
}

/**
 * Like `resolveOrgPath`, but sends the user to MFA first when the session needs
 * aal2. Every sign-in flow must use this, or it skips MFA.
 */
export async function resolveAuthenticatedDestination(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  redirectTo?: string,
): Promise<string> {
  const target = redirectTo ?? (await resolveOrgPath(supabase, userId))
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
    return `/auth/mfa?redirect=${encodeURIComponent(target)}`
  }
  return target
}
