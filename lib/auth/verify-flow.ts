import { orgPath } from '@/lib/subdomain'
import type { createClient } from '@/lib/supabase/client'

/**
 * Which flow sent the user to the OTP screen. It picks the copy shown there and,
 * more importantly, which call resends the code: confirming a new signup and
 * signing in passwordlessly issue codes through different endpoints.
 */
export type VerificationIntent = 'signup' | 'signin'

export type PendingVerification = {
  email: string
  intent: VerificationIntent
  /** Same-origin path to land on after verifying, e.g. /oauth/consent. */
  redirectTo?: string
}

// The account waiting on an emailed code. Persisted so the OTP screen survives
// a page refresh or navigating away and back; in-memory form state alone would
// be lost.
const PENDING_KEY = 'hikyaku:pending-verification-email'

export function setPendingVerification(
  email: string,
  intent: VerificationIntent,
  redirectTo?: string,
): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ email, intent, redirectTo }))
  } catch {
    // localStorage can be unavailable (private mode, SSR); the OTP screen falls
    // back to its editable email field, so this is non-fatal.
  }
}

export function getPendingVerification(): PendingVerification {
  const empty: PendingVerification = { email: '', intent: 'signup' }
  try {
    const stored = localStorage.getItem(PENDING_KEY)
    if (!stored) return empty
    // Earlier builds stored a bare email string under this key, so anything that
    // isn't JSON is read as that. Keeps a signup in flight working across the
    // deploy rather than dumping the user on an empty form.
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
 * Guards against open-redirect: only a same-origin relative path is safe to
 * hand to router.push / emailRedirectTo. Rejects absolute and protocol-relative
 * URLs (e.g. "https://evil.com" or "//evil.com") that a crafted ?redirect=
 * query param could otherwise smuggle in.
 */
export function isSafeRedirectPath(path: string | null | undefined): path is string {
  return !!path && path.startsWith('/') && !path.startsWith('//') && !path.includes('://')
}

/**
 * Resolves where to send a freshly-authenticated user. A signup triggers
 * DB-side creation of an organisations row owned by the new user, so we pick
 * that org's slug and land on its dashboard rather than the apex (where the
 * middleware would bounce to /select-org). Falls back to the org-creation flow
 * when no org exists yet.
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
  const slug = org?.slug
  return slug ? orgPath(slug, '/dashboard') : '/orgs/new'
}

/**
 * Resolves where to send a freshly-authenticated user, same as `resolveOrgPath`,
 * but first checks whether the session needs to be stepped up to aal2 for the
 * user's enrolled MFA factors. Every sign-in flow that establishes a session
 * should redirect through this rather than calling `resolveOrgPath` (or an
 * explicit `redirectTo`) directly, or a step-up requirement gets silently
 * skipped for that flow.
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
