'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { setLastAuthMethod } from '@/lib/auth/last-used'
import { resolveOrgPath } from '@/lib/auth/verify-flow'

const GSI_SRC = 'https://accounts.google.com/gsi/client'

// Personalisation (showing the signed-in Google account's name and photo on the
// button) is suppressed by Google below 200px, or at any size other than
// type=standard/size=large. See
// https://developers.google.com/identity/gsi/web/guides/personalized-button
const MIN_PERSONALISED_WIDTH = 200
const MAX_BUTTON_WIDTH = 400

type GoogleCredentialResponse = {
  credential: string
  select_by?: string
}

type GoogleIdConfiguration = {
  client_id: string
  callback: (response: GoogleCredentialResponse) => void
  nonce?: string
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
  context?: 'signin' | 'signup' | 'use'
  itp_support?: boolean
  ux_mode?: 'popup' | 'redirect'
  use_fedcm_for_prompt?: boolean
  use_fedcm_for_button?: boolean
}

type GoogleButtonConfiguration = {
  type?: 'standard' | 'icon'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  logo_alignment?: 'left' | 'center'
  width?: number
  locale?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfiguration) => void
          renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void
          prompt: () => void
          cancel: () => void
          disableAutoSelect: () => void
        }
      }
    }
  }
}

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`)
  const script = existing ?? document.createElement('script')

  const loaded = new Promise<void>((resolve, reject) => {
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener(
      'error',
      () => reject(new Error('Could not reach Google Identity Services')),
      { once: true }
    )
  })

  if (!existing) {
    script.src = GSI_SRC
    script.async = true
    document.head.appendChild(script)
  }
  return loaded
}

/**
 * Google wants the SHA-256 hash of the nonce, Supabase wants the raw value, and
 * it compares the two to prove the ID token was minted for this page load.
 */
async function createNoncePair(): Promise<{ raw: string; hashed: string }> {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hashed = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return { raw, hashed }
}

/**
 * Whether Google sign-in is configured. Next inlines NEXT_PUBLIC_* at build
 * time, so this is a static boolean. Forms use it to drop their "or" divider
 * along with the button rather than leaving a divider with nothing above it.
 */
export const isGoogleSignInEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)

type GoogleSignInProps = {
  /** Switches the button label and One Tap wording to sign-up copy. */
  context?: 'signin' | 'signup'
  /** Where to land after success, e.g. back to /oauth/consent. */
  redirectTo?: string
  /** Also show the One Tap prompt, not just the button. */
  oneTap?: boolean
  /** Surfaced through the host form's existing error slot. */
  onError?: (message: string) => void
  className?: string
}

/**
 * Sign in with Google via Google Identity Services, exchanging the returned ID
 * token for a Supabase session. Renders nothing until NEXT_PUBLIC_GOOGLE_CLIENT_ID
 * is set, so the auth pages stay usable before the credentials are configured.
 *
 * The same client ID must also be registered in the Supabase dashboard under
 * Authentication > Providers > Google, in the "Authorized Client IDs" field,
 * otherwise signInWithIdToken rejects the token.
 */
export function GoogleSignIn({
  context = 'signin',
  redirectTo,
  oneTap = true,
  onError,
  className,
}: GoogleSignInProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)
  const nonceRef = useRef('')
  const [ready, setReady] = useState(false)
  const [width, setWidth] = useState(0)

  const handleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      const supabase = createClient()
      try {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.credential,
          nonce: nonceRef.current,
        })
        if (error) throw error
        if (!data.user) throw new Error('No user returned after Google sign-in')

        setLastAuthMethod('google')
        router.push(redirectTo ?? (await resolveOrgPath(supabase, data.user.id)))
      } catch (error: unknown) {
        onError?.(error instanceof Error ? error.message : 'Google sign-in failed')
      }
    },
    [onError, redirectTo, router]
  )

  // GSI captures the callback once at initialize() time, so route it through a
  // ref to keep it current without re-initialising (which would burn the nonce).
  const handlerRef = useRef(handleCredential)
  useEffect(() => {
    handlerRef.current = handleCredential
  }, [handleCredential])

  // Track the column width so the rendered button matches it. The button is an
  // iframe with a fixed pixel width, so it has to be re-rendered on resize.
  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const measure = () => setWidth(Math.round(element.getBoundingClientRect().width))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!clientId) return
    let cancelled = false

    ;(async () => {
      try {
        const { raw, hashed } = await createNoncePair()
        await loadGsiScript()
        if (cancelled || !window.google) return

        nonceRef.current = raw
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => handlerRef.current(response),
          nonce: hashed,
          context,
          itp_support: true,
          ux_mode: 'popup',
          // Keeps One Tap and button personalisation working now that browsers
          // are dropping third-party cookies.
          use_fedcm_for_prompt: true,
          use_fedcm_for_button: true,
        })
        setReady(true)
        if (oneTap) window.google.accounts.id.prompt()
      } catch (error: unknown) {
        if (!cancelled) {
          onError?.(error instanceof Error ? error.message : 'Google sign-in is unavailable')
        }
      }
    })()

    return () => {
      cancelled = true
      window.google?.accounts.id.cancel()
    }
    // Deliberately one-shot: re-running would mint a new nonce and re-prompt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  useEffect(() => {
    if (!ready || !width || !buttonRef.current || !window.google) return

    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      logo_alignment: 'left',
      text: context === 'signup' ? 'signup_with' : 'signin_with',
      width: Math.min(MAX_BUTTON_WIDTH, Math.max(MIN_PERSONALISED_WIDTH, width)),
    })
  }, [ready, width, context])

  if (!clientId) return null

  return (
    <div ref={containerRef} className={cn('w-full', className)}>
      {/* min-height reserves the large button's 40px so the form doesn't jump. */}
      <div ref={buttonRef} className="flex min-h-10 justify-center" />
    </div>
  )
}
