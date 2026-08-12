"use server"

import type {
    AccountSessionDto,
    ConnectStatusDto,
    FundingInstructionsDto,
    IssuingBalanceDto,
    OrgIssuingStatusDto,
} from "@/lib/api"
import {
    type ActionError,
    buildApiContext,
    getAccessToken,
    getApiUrl,
    parseApiError,
} from "./api-client"

export type ConnectStatus = ConnectStatusDto

export type AccountSession = AccountSessionDto

/** Raw Stripe funding_instructions object, forwarded verbatim by the API. */
export type FundingInstructions = FundingInstructionsDto

export type IssuingBalance = IssuingBalanceDto

/** Per-org issuing state; `chargesEnabled` gates the "Service Rates" screen. */
export type OrgIssuingStatus = OrgIssuingStatusDto

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
