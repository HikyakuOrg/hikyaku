const API_URL = process.env.NEXT_PUBLIC_HIKYAKU_API_URL ?? "http://localhost:3002"

/** A priced add-on, with price/currency read live from Stripe by whendan-api. */
export type CatalogAddon = {
    id: string
    name: string
    pricing_unit: string
    amount_minor: number
    currency: string
}

/** A service plus its selectable add-ons. */
export type CatalogService = CatalogAddon & {
    addons: CatalogAddon[]
}

export type ServiceCatalog = {
    services: CatalogService[]
}

/**
 * The org's service catalog. Price/currency live in Stripe, so this reads from
 * whendan-api (which fetches Stripe live + caches) rather than supabase-js.
 *
 * Cached with a 60s TTL and a per-org tag so the public booking page never
 * hammers Stripe; admin mutations call `revalidateTag('catalog:<slug>')` to push
 * edits through immediately. Returns an empty catalog on any failure (e.g. the
 * org hasn't enabled payments) so callers can render the empty state.
 */
export async function getServiceCatalog(slug: string): Promise<ServiceCatalog> {
    try {
        const res = await fetch(`${API_URL}/api/v1/services/catalog`, {
            headers: { "x-org-slug": slug },
            next: { revalidate: 60, tags: [`catalog:${slug}`] },
        })
        if (!res.ok) return { services: [] }
        return res.json()
    } catch {
        return { services: [] }
    }
}
