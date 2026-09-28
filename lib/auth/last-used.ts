/**
 * The sign-in method that last worked on this device. Sign-out does not clear
 * it. Store the method name only, never an email address.
 */
export type AuthMethod = 'google' | 'password' | 'email-code'

const LAST_USED_KEY = 'hikyaku:last-auth-method'

const METHODS: readonly string[] = ['google', 'password', 'email-code']

export function setLastAuthMethod(method: AuthMethod): void {
  try {
    localStorage.setItem(LAST_USED_KEY, method)
  } catch {
    // localStorage can be unavailable (private mode). The badge is optional.
  }
}

export function getLastAuthMethod(): AuthMethod | null {
  try {
    const stored = localStorage.getItem(LAST_USED_KEY)
    // Ignore values that are not a known method.
    return stored && METHODS.includes(stored) ? (stored as AuthMethod) : null
  } catch {
    return null
  }
}
