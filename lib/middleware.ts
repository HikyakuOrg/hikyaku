import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookieDomain, getSlugFromHost, ROOT_DOMAIN } from '@/lib/subdomain'

/**
 * The host the browser requested. Tenant hosts (<slug>.hikyaku.org) go through
 * the Cloudflare Worker in workers/tenant-proxy, which sends the tenant host in
 * x-tenant-host. That header is trusted only with the shared secret, because
 * the origin is public.
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

  // The path slug (/orgs/<slug>/...) wins over the host slug (booking only).
  const hostSlug = getSlugFromHost(host)
  const m = pathname.match(/^\/orgs\/([^/]+)/)
  const pathSlug = m && m[1] !== 'new' ? m[1] : null
  const slug = pathSlug ?? hostSlug

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  // Remove the proxy headers. Downstream code reads the tenant from x-org-slug only.
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

  // Create a new client on each request (Fluid compute).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookieOptions: { domain: cookieDomain(host) },
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

  // Do not add code between createServerClient and getClaims(), and do not
  // remove getClaims(). Either can log users out at random.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  const isAuthRoute = pathname.startsWith('/auth')
  const isBookingRoute = pathname.startsWith('/booking')
  const isApiEnvironmentRoute = pathname.startsWith('/api/environment')
  const isApiHealthRoute = pathname.startsWith('/api/health')

  if (hostSlug) {
    // Subdomains serve only the public booking site.
    if (isBookingRoute) return supabaseResponse

    const isLocal =
      ROOT_DOMAIN.startsWith('localhost') ||
      ROOT_DOMAIN.includes('lvh.me') ||
      ROOT_DOMAIN.includes('.localhost')
    const protocol = isLocal ? 'http' : 'https'
    return NextResponse.redirect(`${protocol}://${ROOT_DOMAIN}/`)
  }

  // Product host (app.<root>): every route needs sign-in except auth, health
  // and booking. Apex /booking reaches the page, which shows a 404.
  if (!user) {
    if (pathname.startsWith('/orgs') || (!isAuthRoute && !isBookingRoute && !isApiEnvironmentRoute && !isApiHealthRoute)) {
      // Keep the destination so login can send the user back to it.
      const destination = `${pathname}${request.nextUrl.search}`
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.search = ''
      url.searchParams.set('redirect', destination)
      return NextResponse.redirect(url)
    }
  }

  // Return supabaseResponse as is. A new response must pass the request and
  // copy its cookies, or the session can end early.

  return supabaseResponse
}
