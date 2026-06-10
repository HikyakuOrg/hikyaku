"use server"

import { getRoute } from "@/lib/maps/valhalla"
import type { RoutePreview } from "@/app/models/route-preview"

export async function getRoutePreview(profile: string, coords: [number, number][]): Promise<RoutePreview> {
    return await getRoute(profile, coords)
}
