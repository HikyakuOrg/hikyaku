import type { RouteLegDto, RoutePreviewDto } from "@/lib/api"

/** Per stop-pair leg: travel time in seconds, distance in meters. */
export type RouteLeg = RouteLegDto

/**
 * Normalised routing result consumed by the route maps and shift creation.
 * Returned by the hikyaku-api routing endpoint (see lib/api/routing.ts).
 *
 * Mirrors the generated `RoutePreviewDto` and narrows `coordinates` to [lng, lat]
 * tuples, which the maps rely on and OpenAPI's plain `number[][]` cannot express.
 */
export interface RoutePreview extends Omit<RoutePreviewDto, "coordinates"> {
    /** Whole-route path as [lng, lat] pairs (legs concatenated, shared boundary points de-duplicated). */
    coordinates: [number, number][]
}
