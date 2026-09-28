"use server"

import type { ShiftUsageStatusDto, TrialStatusDto, VanityUrlStatusDto } from "@/lib/api"
import type { ActionError } from "./api-client"
import { buildApiContext, parseApiError } from "./api-client"

export type TrialStatus = TrialStatusDto
export type ShiftUsageStatus = ShiftUsageStatusDto
export type VanityUrlStatus = VanityUrlStatusDto

/**
 * Trial state for the active organisation, or null on any error.
 *
 * It runs in the dashboard layout, so an API error must not break every page.
 * Null shows no countdown and no dialog. The API enforces the trial.
 */
export async function getTrialStatus(): Promise<TrialStatus | null> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return null

    try {
        const res = await fetch(`${ctx.apiUrl}/api/v1/billing/trial`, {
            headers: ctx.headers,
            // Read fresh each time; a cached value can be wrong after expiry.
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

/**
 * Shift usage for the current billing period, or null on any error (like
 * getTrialStatus). A DB trigger enforces the limit.
 */
export async function getShiftUsage(): Promise<ShiftUsageStatus | null> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return null

    try {
        const res = await fetch(`${ctx.apiUrl}/api/v1/billing/usage`, {
            headers: ctx.headers,
            cache: "no-store",
        })
        if (!res.ok) {
            console.error("Failed to read shift usage:", await parseApiError(res))
            return null
        }
        return await res.json()
    } catch {
        return null
    }
}

/**
 * Vanity URL status for the active organisation, or null on any error (like
 * getTrialStatus). The database decides whether a vanity host works.
 */
export async function getVanityUrlStatus(): Promise<VanityUrlStatus | null> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return null

    try {
        const res = await fetch(`${ctx.apiUrl}/api/v1/billing/vanity-url`, {
            headers: ctx.headers,
            cache: "no-store",
        })
        if (!res.ok) {
            console.error("Failed to read vanity URL status:", await parseApiError(res))
            return null
        }
        return await res.json()
    } catch {
        return null
    }
}

/**
 * Create a Stripe Billing Portal session and return its URL. Errors go to the
 * caller, because the user clicked a button and must see why nothing happened.
 */
export async function createBillingPortalSession(
    returnUrl: string,
): Promise<{ success: true; url: string } | ActionError> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return ctx

    try {
        const res = await fetch(`${ctx.apiUrl}/api/v1/billing/portal`, {
            method: "POST",
            headers: ctx.headers,
            body: JSON.stringify({ returnUrl }),
        })
        if (!res.ok) {
            return { success: false, error: await parseApiError(res) }
        }
        const body: { url: string } = await res.json()
        return { success: true, url: body.url }
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }
}
