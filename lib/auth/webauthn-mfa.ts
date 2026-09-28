// Supabase WebAuthn MFA (supabase.auth.mfa.webauthn.*) is experimental. Keep
// all calls to it in this file, so a breaking change affects one place.

/** Whether this browser supports WebAuthn. Hides "Add security key" when not. */
export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential
}

/**
 * Whether WebAuthn enrollment is on in Supabase. The client cannot read this,
 * so set NEXT_PUBLIC_WEBAUTHN_MFA_ENABLED after you enable it (see .env.example).
 */
export const isWebAuthnMfaEnabled = process.env.NEXT_PUBLIC_WEBAUTHN_MFA_ENABLED === 'true'

/** A WebAuthn error as a message for the user, for enrollment and sign-in. */
export function friendlyWebAuthnError(error: { message?: string }): string {
  const message = error.message?.toLowerCase() ?? ''
  if (message.includes('cancel') || message.includes('not allowed') || message.includes('timed out')) {
    return "Cancelled. Try again when you are ready."
  }
  return error.message || 'Something went wrong with your security key.'
}
