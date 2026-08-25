import type { FeatureCollection, Point } from "geojson"

// Photon (https://photon.komoot.io) feature properties. Address components are
// split across dedicated fields rather than a single label.
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
    // OSM provenance (Photon) — stored for routing-quality and stable re-lookup.
    gid?: string
    confidence?: number
    raw: unknown
}

/** Maps a Photon GeoJSON feature collection (as returned by hikyaku-api's geocode endpoints) onto our suggestion shape. */
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
        return { label, street, suburb, state, country, postcode, lat, lon, gid, raw: feature }
    })
}
