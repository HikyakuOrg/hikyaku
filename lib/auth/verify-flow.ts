import { orgPath } from '@/lib/subdomain'
import type { createClient } from '@/lib/supabase/client'

// Email of an account that has signed up but not yet confirmed its address.
// Persisted so the OTP screen survives a page refresh or navigating away and
// back — the in-memory form state alone would be lost.
const PENDING_EMAIL_KEY = 'hikyaku:pending-verification-email'

export function setPendingVerificationEmail(email: string): void {
  try {
    localStorage.setItem(PENDING_EMAIL_KEY, email)
  } catch {
    // localStorage can be unavailable (private mode, SSR); the OTP screen falls
    // back to its editable email field, so this is non-fatal.
  }
}

export function getPendingVerificationEmail(): string {
  try {
    return localStorage.getItem(PENDING_EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

export function clearPendingVerificationEmail(): void {
  try {
    localStorage.removeItem(PENDING_EMAIL_KEY)
  } catch {
    // no-op — see setPendingVerificationEmail.
  }
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
