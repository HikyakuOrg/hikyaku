import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookieDomain, getSlugFromHost, ROOT_DOMAIN } from '@/lib/subdomain'

/**
 * Host the browser actually requested. Tenant vanity hosts (<slug>.hikyaku.org)
 * are served through the Cloudflare Worker in workers/tenant-proxy, because
 * Vercel cannot issue certificates for them. That Worker connects to a plain
 * origin hostname, so the tenant host arrives in x-tenant-host rather than Host.
 *
 * The header is only trusted alongside the shared secret: the origin hostname is
 * publicly reachable, so without that check anyone could forge a tenant and pick
 * up the x-org-slug that scopes org data downstream.
 */
function requestedHost(request: NextRequest): string | null {
  const secret = process.env.TENANT_PROXY_SECRET
  if (secret && request.headers.get('x-tenant-proxy-secret') === secret) {
    const forwarded = request.headers.get('x-tenant-host')
    if (forwarded) return forwarded
  }
  return request.headers.get('host')
}

export async function updateSession(request: NextRequest) {
  const host = requestedHost(request)
  const { pathname } = request.nextUrl

  // Derive the active org slug. Path-based slug (/orgs/<slug>/…) takes
  // precedence over host-based (subdomains serve booking only).
  const hostSlug = getSlugFromHost(host)
  const m = pathname.match(/^\/orgs\/([^/]+)/)
  const pathSlug = m && m[1] !== 'new' ? m[1] : null
  const slug = pathSlug ?? hostSlug

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  // Strip the proxy headers so nothing downstream can read them: x-org-slug is
  // the only supported way to see the active tenant.
  requestHeaders.delete('x-tenant-host')
  requestHeaders.delete('x-tenant-proxy-secret')
  if (slug) {
    requestHeaders.set('x-org-slug', slug)
  } else {
    requestHeaders.delete('x-org-slug')
  }

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookieOptions: { domain: cookieDomain() },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  const isAuthRoute = pathname.startsWith('/auth')
  const isBookingRoute = pathname.startsWith('/booking')
  const isApiEnvironmentRoute = pathname.startsWith('/api/environment')

  if (hostSlug) {
    // Subdomain host — booking is public, nothing else is served here.
    if (isBookingRoute) return supabaseResponse

    // Non-booking subdomain traffic: redirect to the apex root.
    const isLocal =
      ROOT_DOMAIN.startsWith('localhost') ||
      ROOT_DOMAIN.includes('lvh.me') ||
      ROOT_DOMAIN.includes('.localhost')
    const protocol = isLocal ? 'http' : 'https'
    return NextResponse.redirect(`${protocol}://${ROOT_DOMAIN}/`)
  }

  // Product host (app.<root>) — protect dashboard and org routes. Marketing now
  // lives on a separate deploy at the apex, so there are no public marketing
  // routes here; the root path falls through to protection like anything else.
  // Booking is per-organisation (served on a tenant subdomain) and stays public:
  // let the apex /booking request reach the page so it can render a 404 (no org
  // slug to book with).
  if (!user) {
    if (pathname.startsWith('/orgs') || (!isAuthRoute && !isBookingRoute && !isApiEnvironmentRoute)) {
      // Preserve the original destination (e.g. /oauth/consent?authorization_id=…)
      // so the login page can send the user back where they were headed.
      const destination = `${pathname}${request.nextUrl.search}`
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.search = ''
      url.searchParams.set('redirect', destination)
      return NextResponse.redirect(url)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
