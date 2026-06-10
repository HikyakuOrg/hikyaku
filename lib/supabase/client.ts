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

/**
 * Lazily-constructed shared browser client.
 *
 * Modules that hold a module-scoped client must use this instead of calling
 * `createClient()` at the top level. During `next build` ("Collecting page
 * data") route modules are evaluated in Node; constructing the client there
 * throws because the public Supabase env vars aren't inlined yet. This returns
 * a proxy that defers construction until the first property access — i.e. the
 * first real query, in the browser or at request time, where the env exists.
 * Behaviour is otherwise identical to holding a plain `createClient()` singleton.
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