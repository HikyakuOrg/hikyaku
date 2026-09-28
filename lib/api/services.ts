import type { CatalogAddonDto, CatalogServiceDto, ServiceCatalogDto } from "./generated"

const API_URL = process.env.NEXT_PUBLIC_HIKYAKU_API_URL ?? "http://localhost:3002"

/** A priced add-on. The price comes from Stripe. */
export type CatalogAddon = CatalogAddonDto

/** A service plus its selectable add-ons. */
export type CatalogService = CatalogServiceDto

export type ServiceCatalog = ServiceCatalogDto

/**
 * The org's service catalog, with prices from Stripe. Cached for 60s with the
 * tag `catalog:<slug>`, which edits refresh. Returns an empty catalog on any
 * error, for example when the org has no payments.
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
