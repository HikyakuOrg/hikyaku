// Tenant subdomain helpers: <slug>.<root-domain>. NEXT_PUBLIC_ROOT_DOMAIN sets
// the root (hikyaku.org in prod).

// On Vercel previews, treat the deployment hostname as the root so it is not
// read as a tenant subdomain.
const vercelPreviewUrl =
  process.env.VERCEL_ENV === 'preview' ? process.env.VERCEL_URL : undefined

export const ROOT_DOMAIN =
  vercelPreviewUrl ?? process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'hikyaku.org'

// The public root, without the preview override. Booking links that customers
// see always use it.
const PUBLIC_ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'hikyaku.org'

// Hosts under the root that are not tenants. Keep in sync with the API's
// RESERVED_SLUGS. docs, send and origin are live hosts in the hikyaku.org zone.
const RESERVED = new Set([
  'www',
  'app',
  'api',
  'admin',
  'auth',
  'static',
  'docs',
  'send',
  'origin',
])

function stripPort(host: string): string {
  return host.split(':')[0].toLowerCase()
}

/** The tenant slug from a Host header, or null for the apex, www or a reserved host. */
export function getSlugFromHost(host: string | null | undefined): string | null {
  if (!host) return null
  const hostname = stripPort(host)
  const rootHostname = stripPort(ROOT_DOMAIN)

  if (hostname === rootHostname) return null
  if (!hostname.endsWith(`.${rootHostname}`)) return null

  const label = hostname.slice(0, -(rootHostname.length + 1))
  // One label only; no nested subdomains.
  if (!label || label.includes('.')) return null
  if (RESERVED.has(label)) return null
  return label
}

/**
 * Cookie domain for the Supabase session. Hosts under the public root get
 * `.<root>` so they share the session. Other hosts (previews, localhost) get a
 * host-only cookie.
 *
 * Uses PUBLIC_ROOT_DOMAIN, not ROOT_DOMAIN: the preview override exists only on
 * the server, and a mismatch makes the browser reject the refreshed token.
 */
export function cookieDomain(host: string | null | undefined): string | undefined {
  const rootHostname = stripPort(PUBLIC_ROOT_DOMAIN)
  if (rootHostname === 'localhost') return undefined
  if (host) {
    const hostname = stripPort(host)
    if (hostname !== rootHostname && !hostname.endsWith(`.${rootHostname}`)) return undefined
  }
  return `.${rootHostname}`
}

/** Org-scoped path on the product host, e.g. /orgs/k7m2qp9x/dashboard/customers */
export function orgPath(slug: string, path = '/dashboard'): string {
  return `/orgs/${slug}${path}`
}

/** Absolute URL in the product app (app.<root>), for links from emails or booking. */
export function appUrl(path = '/'): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}${path}`
  }
  const isLocal =
    ROOT_DOMAIN.startsWith('localhost') ||
    ROOT_DOMAIN.includes('lvh.me') ||
    ROOT_DOMAIN.includes('.localhost')
  const protocol = isLocal ? 'http' : 'https'
  return `${protocol}://app.${ROOT_DOMAIN}${path}`
}

/** Absolute tenant URL for booking links, e.g. https://k7m2qp9x.hikyaku.org/booking */
export function tenantUrl(slug: string, path = '/dashboard'): string {
  const isLocal =
    PUBLIC_ROOT_DOMAIN.startsWith('localhost') ||
    PUBLIC_ROOT_DOMAIN.includes('lvh.me') ||
    PUBLIC_ROOT_DOMAIN.includes('.localhost')
  const protocol = isLocal ? 'http' : 'https'
  return `${protocol}://${slug}.${PUBLIC_ROOT_DOMAIN}${path}`
}
