"use server"

import { fetchRoutePreview } from "@/lib/api/routing"
import { getOrgSlug } from "@/lib/actions/api-client"
import type { RoutePreview } from "@/app/models/route-preview"

export async function getRoutePreview(profile: string, coords: [number, number][]): Promise<RoutePreview> {
    const slug = await getOrgSlug()
    if (!slug) throw new Error("No active organisation.")
    return fetchRoutePreview(profile, coords, slug)
}
