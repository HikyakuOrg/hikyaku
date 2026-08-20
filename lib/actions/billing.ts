"use server"

import type { ShiftUsageStatusDto, TrialStatusDto, VanityUrlStatusDto } from "@/lib/api"
import type { ActionError } from "./api-client"
import { buildApiContext, parseApiError } from "./api-client"

export type TrialStatus = TrialStatusDto
export type ShiftUsageStatus = ShiftUsageStatusDto
export type VanityUrlStatus = VanityUrlStatusDto

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

/**
 * Shift usage for the active organisation's current billing period.
 *
 * Same fail-open-to-`null` shape as getTrialStatus, for the same reason: this
 * drives a usage indicator and a block-explanation dialog, not the enforcement
 * itself (the DB trigger is that boundary — see AddShiftUsageMetering in
 * hikyaku-api). A transient blip here should not make either UI element wrong
 * in a way that blocks the user; it should just not render.
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
 * Vanity URL entitlement state for the active organisation.
 *
 * Same fail-open-to-`null` shape as getTrialStatus/getShiftUsage: this drives
 * the Business Information settings page's live/locked display, not the
 * enforcement itself — get_booking_organisation()/get_tracking_details() in
 * hikyaku-api are what actually decide whether a vanity host resolves.
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
 * Creates a Stripe Billing Portal session for the active organisation and
 * returns the URL to redirect the browser to. Unlike the two read actions
 * above, a failure here is surfaced to the caller rather than swallowed — this
 * is a user-initiated action (the "Add payment method" button), so silently
 * doing nothing would look like a broken button.
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
        return { success: false, error: "Failed to reach the API." }
    }
}
