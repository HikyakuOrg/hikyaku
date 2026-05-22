import type { FeatureCollection, Point } from "geojson"

interface AddressProperties {
    name: string
    locality?: string
    region_a?: string
    country: string
    postalcode?: string
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
}

export async function fetchAddressSuggestions(text: string): Promise<AddressSuggestion[]> {
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_HIKYAKU_API_URL}/geocode/autocomplete?text=${encodeURIComponent(text)}`
    )
    if (!res.ok) return []
    const data: FeatureCollection<Point, AddressProperties> = await res.json()
    return data.features.map((feature) => {
        const p = feature.properties
        const [lon, lat] = feature.geometry.coordinates
        const street = p.name ?? ""
        const suburb = p.locality ?? ""
        const state = p.region_a ?? ""
        const country = p.country ?? ""
        const postcode = p.postalcode ?? ""
        const label = [street, suburb, state, country].filter(Boolean).join(", ")
        return { label, street, suburb, state, country, postcode, lat, lon }
    })
}
