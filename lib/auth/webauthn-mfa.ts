// Supabase's WebAuthn MFA factor (supabase.auth.mfa.webauthn.*) is tagged
// @experimental in the SDK — its shape may change without notice. Route every
// call to it through this file rather than importing the namespace directly
// elsewhere, so a future breaking change has one place to land, not several.

/**
 * Whether this browser can run a WebAuthn ceremony at all. Used to hide the
 * "Add security key" control instead of letting a click fail outright.
 */
export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential
}

/**
 * Maps a WebAuthn/Auth error to copy a user should see, rather than a raw
 * DOMException message. Used for both enrollment (register) and login-time
 * verification (authenticate) failures.
 */
export function friendlyWebAuthnError(error: { message?: string }): string {
  const message = error.message?.toLowerCase() ?? ''
  if (message.includes('cancel') || message.includes('not allowed') || message.includes('timed out')) {
    return "Cancelled — try again when you're ready."
  }
  return error.message || 'Something went wrong with your security key.'
}
