import type { RoutePreview } from "@/app/models/route-preview"

const API_URL = process.env.NEXT_PUBLIC_HIKYAKU_API_URL ?? "http://localhost:3002"

/**
 * Fetches a route visiting `coords` ([lng, lat] pairs) in order for the given
 * vehicle `profile` from the whendan-api routing endpoint. The backend owns the
 * routing engine and returns a normalised RoutePreview, so the frontend never
 * has to know which engine is used. The org is identified by the x-org-slug header.
 */
export async function fetchRoutePreview(
    profile: string,
    coords: [number, number][],
    slug: string,
): Promise<RoutePreview> {
    const res = await fetch(`${API_URL}/api/v1/routing/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-org-slug": slug },
        body: JSON.stringify({ profile, coordinates: coords }),
    })
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
        const message = Array.isArray(error?.message)
            ? error.message.join(", ")
            : error?.message
        throw new Error(message ?? `HTTP ${res.status}`)
    }
    return res.json()
}
