export interface RouteLeg {
    /** Travel time in seconds. */
    duration: number
    /** Distance in meters. */
    distance: number
}

/**
 * Normalised routing result consumed by the route maps and shift creation.
 * Returned by the whendan-api routing endpoint (see lib/api/routing.ts).
 */
export interface RoutePreview {
    /** Whole-route path as [lng, lat] pairs (legs concatenated, shared boundary points de-duplicated). */
    coordinates: [number, number][]
    /** Index into `coordinates` of each stop; wayPoints[0] = 0, last = coordinates.length - 1. */
    wayPoints: number[]
    /** Per stop-pair legs (n stops → n-1 legs). */
    legs: RouteLeg[]
    summary: {
        /** Total travel time in seconds. */
        duration: number
        /** Total distance in meters. */
        distance: number
    }
}
