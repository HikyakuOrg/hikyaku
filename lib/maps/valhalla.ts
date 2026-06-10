import { decodePolyline } from "@/lib/maps/geo"
import type { RouteLeg, RoutePreview } from "@/app/models/route-preview"

// Server-side only — keeps the routing server address out of the client bundle.
const VALHALLA_URL = process.env.VALHALLA_URL ?? "http://localhost:8002"

interface ValhallaLeg {
    summary: { time: number; length: number }
    /** Encoded polyline, 6-digit precision. */
    shape: string
}

interface ValhallaRouteResponse {
    trip: {
        legs: ValhallaLeg[]
        summary: { time: number; length: number }
    }
}

/**
 * Maps the ORS-style profile values stored in vehicle_type.ors_vehicle_type
 * (e.g. 'driving-car', 'driving-hgv') to Valhalla costing names.
 *
 * The same table is duplicated in whendan-api at src/vroom/profile-map.ts —
 * keep both in sync.
 */
export function orsProfileToCosting(profile: string): string {
    if (profile === "driving-hgv") return "truck"
    if (profile.startsWith("cycling-")) return "bicycle"
    if (profile.startsWith("foot-") || profile === "wheelchair") return "pedestrian"
    if (profile === "public-transport") return "bus"
    return "auto" // driving-car and anything unknown
}

/**
 * Fetches a route visiting `coords` ([lng, lat] pairs) in order from Valhalla
 * and normalises it into a RoutePreview (coordinates in [lng, lat], durations
 * in seconds, distances in meters).
 */
export async function getRoute(profile: string, coords: [number, number][]): Promise<RoutePreview> {
    const res = await fetch(`${VALHALLA_URL}/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            locations: coords.map(([lng, lat]) => ({ lat, lon: lng, type: "break" })),
            costing: orsProfileToCosting(profile),
            units: "kilometers",
            directions_type: "none",
        }),
    })

    if (!res.ok) {
        const body = await res.text()
        throw new Error(`Valhalla /route failed (${res.status}): ${body}`)
    }

    const data = (await res.json()) as ValhallaRouteResponse

    const coordinates: [number, number][] = []
    const wayPoints: number[] = [0]
    const legs: RouteLeg[] = []

    for (const leg of data.trip.legs) {
        // Valhalla shapes are encoded with 6-digit precision (not the usual 5).
        const legCoords = decodePolyline(leg.shape, 1e6)
        // Consecutive legs share their boundary vertex — drop the duplicate.
        coordinates.push(...(coordinates.length > 0 ? legCoords.slice(1) : legCoords))
        wayPoints.push(coordinates.length - 1)
        legs.push({
            duration: leg.summary.time,
            distance: leg.summary.length * 1000,
        })
    }

    return {
        coordinates,
        wayPoints,
        legs,
        summary: {
            duration: data.trip.summary.time,
            distance: data.trip.summary.length * 1000,
        },
    }
}
