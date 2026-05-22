import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookieDomain, getSlugFromHost, ROOT_DOMAIN } from '@/lib/subdomain'

export async function updateSession(request: NextRequest) {
  const host = request.headers.get('host')
  const { pathname } = request.nextUrl

  // Derive the active org slug. Path-based slug (/orgs/<slug>/…) takes
  // precedence over host-based (subdomains serve booking only).
  const hostSlug = getSlugFromHost(host)
  const m = pathname.match(/^\/orgs\/([^/]+)/)
  const pathSlug = m && m[1] !== 'new' ? m[1] : null
  const slug = pathSlug ?? hostSlug

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
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

  // Apex host — protect dashboard and org routes.
  if (!user) {
    if (pathname.startsWith('/orgs') || (!isAuthRoute && pathname !== '/')) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
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
