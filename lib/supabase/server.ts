"use server"

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cookieDomain } from '@/lib/subdomain'
import { Database } from './supabase'

/**
 * If using Fluid compute: Don't put this client in a global variable. Always create a new client within each
 * function when using it.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookieOptions: { domain: cookieDomain() },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function getSupabaseServerClaims(){
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  return { data, error }
}