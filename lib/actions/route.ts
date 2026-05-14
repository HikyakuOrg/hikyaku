"use server"

import { getRoute } from "@/lib/maps/openrouteservice"

export async function getRoutePreview(profile: string, coords: [number, number][]) {
    return await getRoute(profile, coords)
}
