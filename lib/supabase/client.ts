import { createBrowserClient } from '@supabase/ssr'
import { cookieDomain } from '@/lib/subdomain'
import { Database } from './supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    // Share the session across every <slug>.<root> tenant subdomain.
    { cookieOptions: { domain: cookieDomain() } }
  )
}