"use server"

import { buildApiContext } from "@/lib/actions/api-client"
import { parsePhotonFeatureCollection, type AddressSuggestion } from "@/lib/maps/geocode-autocomplete"

export type { AddressSuggestion }

/**
 * Address suggestions as the user types. The API needs a token, so this runs
 * on the server. Returns [] on any error.
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
