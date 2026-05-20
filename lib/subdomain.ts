// Tenant subdomain helpers. The active organisation is identified purely by the
// host: <slug>.<root-domain>. Root domain is environment-driven so the same
// code works on hikyaku.org (prod) and lvh.me:3000 / *.localhost (local).
//
// Local testing: lvh.me and *.localhost both resolve to 127.0.0.1 with no
// /etc/hosts edits. Set NEXT_PUBLIC_ROOT_DOMAIN=lvh.me:3000 locally.

export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'hikyaku.org'

// Hosts under the root that are NOT tenants (must mirror the API's RESERVED_SLUGS).
const RESERVED = new Set(['www', 'app', 'api', 'admin', 'auth', 'static'])

function stripPort(host: string): string {
  return host.split(':')[0].toLowerCase()
}

/**
 * Extracts the tenant slug from a Host header, or null when the request is for
 * the apex / www / a reserved host (signup, login, org selection live there).
 */
export function getSlugFromHost(host: string | null | undefined): string | null {
  if (!host) return null
  const hostname = stripPort(host)
  const rootHostname = stripPort(ROOT_DOMAIN)

  if (hostname === rootHostname) return null
  if (!hostname.endsWith(`.${rootHostname}`)) return null

  const label = hostname.slice(0, -(rootHostname.length + 1))
  // Only a single left-most label is a valid tenant (no nested subdomains).
  if (!label || label.includes('.')) return null
  if (RESERVED.has(label)) return null
  return label
}

/**
 * Cookie domain so the Supabase session is shared across every tenant
 * subdomain (and the apex). Host-only on plain localhost (a leading-dot
 * domain attribute is invalid there).
 */
export function cookieDomain(): string | undefined {
  const rootHostname = stripPort(ROOT_DOMAIN)
  if (rootHostname === 'localhost') return undefined
  return `.${rootHostname}`
}

/** Absolute URL for a tenant, e.g. https://k7m2qp9x.hikyaku.org/dashboard */
export function tenantUrl(slug: string, path = '/dashboard'): string {
  const isLocal =
    ROOT_DOMAIN.startsWith('localhost') ||
    ROOT_DOMAIN.includes('lvh.me') ||
    ROOT_DOMAIN.includes('.localhost')
  const protocol = isLocal ? 'http' : 'https'
  return `${protocol}://${slug}.${ROOT_DOMAIN}${path}`
}
