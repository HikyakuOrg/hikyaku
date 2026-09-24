"use server"

import type { VehicleInfoDto, VinDecodeResultDto, WmiResultDto } from "@/lib/api"
import type { ActionError } from "./api-client"
import { getAccessToken, getApiUrl, parseApiError } from "./api-client"

export type DecodedVin = {
    success: true
    vehicle: VehicleInfoDto
    wmi: WmiResultDto
    /** Upper bound of the GVWR class in kg, or null when the class is missing or unparseable. */
    gvwrKg: number | null
}

/**
 * GVWR comes back as a class label, e.g. "Class 2H: 9,001 - 10,000 lb
 * (4,082 - 4,536 kg)". Take the upper kg bound so the gross limit never
 * understates what the vehicle can legally carry.
 */
function parseGvwrKg(gvwr: string | undefined): number | null {
    const match = gvwr?.match(/([\d,]+)\s*kg\)/i)
    if (!match) return null
    const kg = Number(match[1].replace(/,/g, ""))
    return Number.isFinite(kg) && kg > 0 ? kg : null
}

/**
 * Decode a VIN via hikyaku-api's `/vin/{vin}` endpoint. The endpoint needs a
 * bearer token but no organisation, so this skips buildApiContext().
 */
export async function decodeVin(vin: string): Promise<DecodedVin | ActionError> {
    if (!vin || vin.length !== 17) {
        return { success: false, error: "Invalid VIN length" }
    }

    const auth = await getAccessToken()
    if ("error" in auth) return { success: false, error: auth.error }
    const apiUrl = getApiUrl()
    if (!apiUrl) return { success: false, error: "API is not configured." }

    try {
        const res = await fetch(`${apiUrl}/api/v1/vin/${encodeURIComponent(vin)}`, {
            headers: { Authorization: `Bearer ${auth.accessToken}` },
        })
        if (!res.ok) return { success: false, error: await parseApiError(res) }

        const result: VinDecodeResultDto = await res.json()
        const { vehicle, wmi } = result.components
        if (!result.valid || !vehicle || !wmi) {
            return { success: false, error: result.errors[0]?.message || "Could not decode VIN" }
        }
        return { success: true, vehicle, wmi, gvwrKg: parseGvwrKg(vehicle.gvwr) }
    } catch {
        return { success: false, error: "Could not reach the VIN decoder. Please enter details manually." }
    }
}
