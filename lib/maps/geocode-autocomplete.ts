import type { FeatureCollection, Point } from "geojson"

// Photon (https://photon.komoot.io) feature properties.
interface PhotonProperties {
    name?: string
    housenumber?: string
    street?: string
    city?: string
    district?: string
    locality?: string
    county?: string
    state?: string
    country?: string
    postcode?: string
    osm_id?: number
    osm_type?: string
    osm_key?: string
    osm_value?: string
    extent?: number[]
}

export interface AddressSuggestion {
    label: string
    street: string
    suburb: string
    state: string
    country: string
    postcode: string
    lat: number
    lon: number
    // OSM source, kept for routing quality and later lookups.
    gid?: string
    confidence?: number
    // OSM tag and bounding box, for isLikelyBuilding().
    osmKey?: string
    osmValue?: string
    extent?: number[]
    raw: unknown
}

/** Photon GeoJSON from the geocode endpoints, as address suggestions. */
export function parsePhotonFeatureCollection(
    data: FeatureCollection<Point, PhotonProperties>
): AddressSuggestion[] {
    return data.features.map((feature) => {
        const p = feature.properties
        const [lon, lat] = feature.geometry.coordinates
        const street = [p.housenumber, p.street].filter(Boolean).join(" ") || p.name || ""
        const suburb = p.city ?? p.district ?? p.locality ?? p.county ?? ""
        const state = p.state ?? ""
        const country = p.country ?? ""
        const postcode = p.postcode ?? ""
        const label = [street, suburb, state, country].filter(Boolean).join(", ")
        const gid = p.osm_type && p.osm_id != null ? `${p.osm_type}${p.osm_id}` : undefined
        return {
            label,
            street,
            suburb,
            state,
            country,
            postcode,
            lat,
            lon,
            gid,
            osmKey: p.osm_key,
            osmValue: p.osm_value,
            extent: p.extent,
            raw: feature,
        }
    })
}

/**
 * Whether a suggestion is probably a building, not a street or locality. Makes
 * the unit prompt more visible. OSM tags are inconsistent, so this prefers
 * false positives.
 */
export function isLikelyBuilding(suggestion: AddressSuggestion): boolean {
    const { osmKey, osmValue, extent } = suggestion
    if (osmKey === "building") return true
    if (osmKey === "place" && (osmValue === "house" || osmValue === "apartments" || osmValue === "residential")) {
        return true
    }
    const feature = suggestion.raw as { properties?: PhotonProperties } | undefined
    if (extent && extent.length > 0 && feature?.properties?.housenumber) return true
    return false
}
