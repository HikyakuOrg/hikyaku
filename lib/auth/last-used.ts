/**
 * Which sign-in method last worked on this device.
 *
 * Written on success and deliberately NOT cleared by sign-out: the whole point
 * is for it to still be there when the user comes back. It lives under its own
 * key rather than alongside the Supabase session, which signOut() does clear.
 *
 * Stores the method name only. Anything with access to the browser profile can
 * read this, so it must never hold an email address or anything else that
 * identifies who was signed in.
 */
export type AuthMethod = 'google' | 'password' | 'email-code'

const LAST_USED_KEY = 'hikyaku:last-auth-method'

const METHODS: readonly string[] = ['google', 'password', 'email-code']

export function setLastAuthMethod(method: AuthMethod): void {
  try {
    localStorage.setItem(LAST_USED_KEY, method)
  } catch {
    // localStorage can be unavailable (private mode). The badge is only a hint,
    // so losing it costs the user nothing.
  }
}

export function getLastAuthMethod(): AuthMethod | null {
  try {
    const stored = localStorage.getItem(LAST_USED_KEY)
    // Guard the read: a stale value from an older build (or anything hand-edited
    // into storage) must not render a badge against a method that no longer exists.
    return stored && METHODS.includes(stored) ? (stored as AuthMethod) : null
  } catch {
    return null
  }
}
