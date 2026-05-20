'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { tenantUrl } from '@/lib/subdomain'

export interface OrganisationSummary {
  id: string
  slug: string
  name: string
}

function getApiUrl(): string | null {
  return process.env.WHENDAN_API_URL ?? null
}

/**
 * Public signup: creates the user + a new organisation (the creator becomes its
 * admin), signs the user in, then sends them to their tenant subdomain.
 * Shaped for useActionState — returns an error string, never on success.
 */
export async function signupOrganisation(
  _prevState: string | null,
  formData: FormData,
): Promise<string> {
  const apiUrl = getApiUrl()
  if (!apiUrl) return 'Signup is not configured.'

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const display_name = formData.get('displayName') as string
  const organisation_name = formData.get('organisationName') as string

  let res: Response
  try {
    res = await fetch(`${apiUrl}/api/v1/organisations/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, display_name, organisation_name }),
    })
  } catch {
    return 'Could not reach the server. Check your connection.'
  }

  if (!res.ok) {
    let message = `Signup failed (${res.status})`
    try {
      const body = await res.json()
      if (typeof body?.message === 'string') message = body.message
      else if (Array.isArray(body?.message)) message = body.message.join(', ')
    } catch {
      /* ignore */
    }
    return message
  }

  const { slug } = (await res.json()) as { slug: string }

  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (signInError) return signInError.message

  // Cross-subdomain session works because the auth cookie is set on the
  // parent domain (see cookieDomain()).
  redirect(tenantUrl(slug, '/dashboard'))
}

/** Organisations the signed-in user belongs to — powers the org switcher. */
export async function listMyOrganisations(): Promise<OrganisationSummary[]> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return []

  const { data, error } = await supabase
    .from('organisations')
    .select('id, slug, name, user_permission!inner(user_id)')
    .eq('user_permission.user_id', userData.user.id)

    if (error || !data) return []
  return data.map(({ id, slug, name }) => ({ id, slug, name }))
}
