"use server"

import { getServiceAreasInBounds } from "@/lib/supabase/db-server"

const LATITUDE_LIMIT = 90
const LONGITUDE_LIMIT = 180

type ViewportBounds = {
    minLat: number
    minLng: number
    maxLat: number
    maxLng: number
}

function isFiniteCoordinate(value: number) {
    return Number.isFinite(value)
}

export async function getVisibleServiceAreas(bounds: ViewportBounds) {
    if (
        !isFiniteCoordinate(bounds.minLng) ||
        !isFiniteCoordinate(bounds.minLat) ||
        !isFiniteCoordinate(bounds.maxLng) ||
        !isFiniteCoordinate(bounds.maxLat)
    ) {
        throw new Error("Missing or invalid viewport bounds.")
    }

    if (
        Math.abs(bounds.minLng) > LONGITUDE_LIMIT ||
        Math.abs(bounds.maxLng) > LONGITUDE_LIMIT ||
        Math.abs(bounds.minLat) > LATITUDE_LIMIT ||
        Math.abs(bounds.maxLat) > LATITUDE_LIMIT
    ) {
        throw new Error("Viewport bounds are outside valid ranges.")
    }

    return getServiceAreasInBounds({
        minLng: Math.min(bounds.minLng, bounds.maxLng),
        minLat: Math.min(bounds.minLat, bounds.maxLat),
        maxLng: Math.max(bounds.minLng, bounds.maxLng),
        maxLat: Math.max(bounds.minLat, bounds.maxLat),
    })
}