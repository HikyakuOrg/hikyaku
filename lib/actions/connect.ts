"use server"

import {
    type ActionError,
    buildApiContext,
    getAccessToken,
    getApiUrl,
    parseApiError,
} from "./api-client"

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

export interface OrgIssuingStatus {
    slug: string
    cardIssuingStatus: string | null
    detailsSubmitted: boolean
    /** Whether the connected account can accept payments — gates "Service Rates". */
    chargesEnabled: boolean
}

export async function getConnectStatus(): Promise<
    { success: true; data: ConnectStatus } | ActionError
> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return ctx

    let res: Response
    try {
        res = await fetch(`${ctx.apiUrl}/api/v1/connect/status`, {
            headers: ctx.headers,
            cache: "no-store",
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseApiError(res) }
    return { success: true, data: await res.json() }
}

export async function createAccountSession(
    country: string,
): Promise<{ success: true; data: AccountSession } | ActionError> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return ctx

    let res: Response
    try {
        res = await fetch(`${ctx.apiUrl}/api/v1/connect/account-session`, {
            method: "POST",
            headers: ctx.headers,
            body: JSON.stringify({ country }),
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseApiError(res) }
    return { success: true, data: await res.json() }
}

export async function getFundingInstructions(): Promise<
    { success: true; data: FundingInstructions } | ActionError
> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return ctx

    let res: Response
    try {
        res = await fetch(`${ctx.apiUrl}/api/v1/connect/funding-instructions`, {
            method: "POST",
            headers: ctx.headers,
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseApiError(res) }
    return { success: true, data: await res.json() }
}

export async function getIssuingBalance(): Promise<
    { success: true; data: IssuingBalance[] } | ActionError
> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return ctx

    let res: Response
    try {
        res = await fetch(`${ctx.apiUrl}/api/v1/connect/issuing-balance`, {
            headers: ctx.headers,
            cache: "no-store",
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseApiError(res) }
    return { success: true, data: await res.json() }
}

/**
 * Issuing-status flags for all orgs the caller belongs to.
 * Used by the org switcher — no active-org context needed, only a valid JWT.
 */
export async function getIssuingStatuses(): Promise<OrgIssuingStatus[]> {
    const auth = await getAccessToken()
    if ("error" in auth) return []

    const apiUrl = getApiUrl()
    if (!apiUrl) return []

    try {
        const res = await fetch(`${apiUrl}/api/v1/connect/issuing-statuses`, {
            headers: {
                Authorization: `Bearer ${auth.accessToken}`,
            },
            cache: "no-store",
        })
        if (!res.ok) return []
        return res.json()
    } catch {
        return []
    }
}
