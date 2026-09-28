import type { RouteLegDto, RoutePreviewDto } from "@/lib/api"

/** Per stop-pair leg: travel time in seconds, distance in meters. */
export type RouteLeg = RouteLegDto

/** A route from the API (lib/api/routing.ts), with `coordinates` as [lng, lat] tuples. */
export interface RoutePreview extends Omit<RoutePreviewDto, "coordinates"> {
    /** The whole route as [lng, lat] pairs. */
    coordinates: [number, number][]
}
