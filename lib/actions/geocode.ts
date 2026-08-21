"use server"

import { buildApiContext } from "@/lib/actions/api-client"
import { parsePhotonFeatureCollection, type AddressSuggestion } from "@/lib/maps/geocode-autocomplete"

export type { AddressSuggestion }

/**
 * Address suggestions as the user types, via hikyaku-api's geocode/autocomplete
 * endpoint. That endpoint requires a bearer token, so this must run server-side
 * through buildApiContext() rather than fetching directly from the browser.
 * Returns [] on any auth/network failure so callers can degrade silently.
 */
export async function fetchAddressSuggestions(text: string): Promise<AddressSuggestion[]> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return []

    const res = await fetch(
        `${ctx.apiUrl}/geocode/autocomplete?text=${encodeURIComponent(text)}`,
        { headers: ctx.headers }
    )
    if (!res.ok) return []
    return parsePhotonFeatureCollection(await res.json())
}
