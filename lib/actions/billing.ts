"use server"

import type { TrialStatusDto } from "@/lib/api"
import { buildApiContext, parseApiError } from "./api-client"

export type TrialStatus = TrialStatusDto

/**
 * Trial state for the active organisation.
 *
 * Unlike the other billing-adjacent actions this one never surfaces an error to
 * the caller — it returns `null` instead. It runs in the dashboard *layout*, so a
 * transient API blip must not take down every page underneath it; a null result
 * simply renders no countdown and no dialog, leaving the dashboard exactly as it
 * behaved before trials existed. The API is the enforcement boundary regardless,
 * so failing open here does not grant access to anything.
 */
export async function getTrialStatus(): Promise<TrialStatus | null> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return null

    try {
        const res = await fetch(`${ctx.apiUrl}/api/v1/billing/trial`, {
            headers: ctx.headers,
            // The deadline decides whether the dashboard is usable, so it is read
            // fresh per request rather than served from a cache that could keep
            // showing "2 days left" after expiry.
            cache: "no-store",
        })
        if (!res.ok) {
            console.error("Failed to read trial status:", await parseApiError(res))
            return null
        }
        return await res.json()
    } catch {
        return null
    }
}
