import { createBrowserClient } from '@supabase/ssr'
import { cookieDomain } from '@/lib/subdomain'
import { Database } from './supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    // Share the session across tenant subdomains. Same domain as the server.
    {
      cookieOptions: {
        domain: cookieDomain(typeof window === 'undefined' ? undefined : window.location.host),
      },
    }
  )
}

/**
 * A shared browser client that is created on first use.
 *
 * Use this for module-scoped clients. `next build` evaluates route modules in
 * Node before the public env vars exist, so `createClient()` at the top level
 * throws.
 */
export function createLazyClient(): ReturnType<typeof createClient> {
  let client: ReturnType<typeof createClient> | undefined
  return new Proxy({} as ReturnType<typeof createClient>, {
    get(_target, prop) {
      client ??= createClient()
      const value = Reflect.get(client, prop)
      return typeof value === 'function' ? value.bind(client) : value
    },
  })
}