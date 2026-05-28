"use server"

import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"

export interface ConnectStatus {
    accountId: string | null
    detailsSubmitted: boolean
    chargesEnabled: boolean
    payoutsEnabled: boolean
    cardIssuingStatus: string | null
    country: string | null
    currency: string | null
}

export interface AccountSession {
    clientSecret: string
    publishableKey: string
}

/** Raw Stripe funding_instructions object (untyped by the SDK). */
export interface FundingInstructions {
    currency: string
    bank_transfer: {
        country: string
        type: string
        financial_addresses: Array<Record<string, unknown>>
    }
}

export interface IssuingBalance {
    amount: number
    currency: string
}

type ActionError = { success: false; error: string }

async function getAuthHeaders(): Promise<{ accessToken: string } | { error: string }> {
    const supabase = await createClient()
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token
    if (!accessToken) return { error: "Session expired. Please log in again." }
    return { accessToken }
}

function getApiUrl(): string | null {
    return process.env.NEXT_PUBLIC_HIKYAKU_API_URL ?? null
}

async function getOrgSlug(): Promise<string | null> {
    const h = await headers()
    return h.get("x-org-slug")
}

async function buildHeaders(): Promise<
    { headers: Record<string, string> } | ActionError
> {
    const auth = await getAuthHeaders()
    if ("error" in auth) return { success: false, error: auth.error }
    const orgSlug = await getOrgSlug()
    if (!orgSlug) return { success: false, error: "No active organisation." }
    return {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.accessToken}`,
            "X-Organisation-Slug": orgSlug,
        },
    }
}

async function parseError(res: Response): Promise<string> {
    let message = `Request failed (${res.status})`
    try {
        const body = await res.json()
        if (typeof body?.message === "string") message = body.message
        else if (Array.isArray(body?.message)) message = body.message.join(", ")
    } catch {
        /* ignore */
    }
    return message
}

export async function getConnectStatus(): Promise<
    { success: true; data: ConnectStatus } | ActionError
> {
    const hResult = await buildHeaders()
    if ("error" in hResult) return { success: false, error: hResult.error }

    const apiUrl = getApiUrl()
    if (!apiUrl) return { success: false, error: "API is not configured." }

    let res: Response
    try {
        res = await fetch(`${apiUrl}/api/v1/connect/status`, {
            headers: hResult.headers,
            cache: "no-store",
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseError(res) }
    return { success: true, data: await res.json() }
}

export async function createAccountSession(
    country: string,
): Promise<{ success: true; data: AccountSession } | ActionError> {
    const hResult = await buildHeaders()
    if ("error" in hResult) return { success: false, error: hResult.error }

    const apiUrl = getApiUrl()
    if (!apiUrl) return { success: false, error: "API is not configured." }

    let res: Response
    try {
        res = await fetch(`${apiUrl}/api/v1/connect/account-session`, {
            method: "POST",
            headers: hResult.headers,
            body: JSON.stringify({ country }),
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseError(res) }
    return { success: true, data: await res.json() }
}

export async function getFundingInstructions(): Promise<
    { success: true; data: FundingInstructions } | ActionError
> {
    const hResult = await buildHeaders()
    if ("error" in hResult) return { success: false, error: hResult.error }

    const apiUrl = getApiUrl()
    if (!apiUrl) return { success: false, error: "API is not configured." }

    let res: Response
    try {
        res = await fetch(`${apiUrl}/api/v1/connect/funding-instructions`, {
            method: "POST",
            headers: hResult.headers,
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseError(res) }
    return { success: true, data: await res.json() }
}

export async function getIssuingBalance(): Promise<
    { success: true; data: IssuingBalance[] } | ActionError
> {
    const hResult = await buildHeaders()
    if ("error" in hResult) return { success: false, error: hResult.error }

    const apiUrl = getApiUrl()
    if (!apiUrl) return { success: false, error: "API is not configured." }

    let res: Response
    try {
        res = await fetch(`${apiUrl}/api/v1/connect/issuing-balance`, {
            headers: hResult.headers,
            cache: "no-store",
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseError(res) }
    return { success: true, data: await res.json() }
}
