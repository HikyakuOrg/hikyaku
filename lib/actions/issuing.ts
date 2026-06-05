"use server"

import { type ActionError, buildApiContext, parseApiError } from "./api-client"

export interface IssuingCard {
    id: string
    organisationId: string
    cardholderId: string
    vehicleId: string | null
    stripeCardId: string
    last4: string | null
    type: string
    currency: string
    status: string
    spendingLimitMinor: number | null
    spendingInterval: string | null
    createdAt: string
    updatedAt: string
}

export interface IssuingTransaction {
    id: string
    organisationId: string
    cardId: string | null
    cardholderId: string | null
    vehicleId: string | null
    driverId: string | null
    stripeTransactionId: string
    stripeAuthorizationId: string | null
    type: string
    amountMinor: number
    currency: string
    merchantName: string | null
    merchantCategory: string | null
    merchantCity: string | null
    merchantCountry: string | null
    authorizedAt: string | null
    createdAt: string
}

export interface IssueCardInput {
    driverId: string
    vehicleId?: string | null
    spendingLimitMajor?: number | null
    interval?: string
    currency: string
}

export async function listFuelCards(): Promise<
    { success: true; data: IssuingCard[] } | ActionError
> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return ctx

    let res: Response
    try {
        res = await fetch(`${ctx.apiUrl}/api/v1/issuing/cards`, {
            headers: ctx.headers,
            cache: "no-store",
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseApiError(res) }

    const data = await res.json()
    return { success: true, data }
}

export async function issueFuelCard(
    input: IssueCardInput,
): Promise<{ success: true; data: IssuingCard } | ActionError> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return ctx

    let res: Response
    try {
        res = await fetch(`${ctx.apiUrl}/api/v1/issuing/cards`, {
            method: "POST",
            headers: ctx.headers,
            body: JSON.stringify(input),
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseApiError(res) }

    const data = await res.json()
    return { success: true, data }
}

export async function listFuelTransactions(filters?: {
    driverId?: string
    vehicleId?: string
}): Promise<{ success: true; data: IssuingTransaction[] } | ActionError> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return ctx

    const params = new URLSearchParams()
    if (filters?.driverId) params.set("driverId", filters.driverId)
    if (filters?.vehicleId) params.set("vehicleId", filters.vehicleId)
    const qs = params.toString() ? `?${params.toString()}` : ""

    let res: Response
    try {
        res = await fetch(`${ctx.apiUrl}/api/v1/issuing/transactions${qs}`, {
            headers: ctx.headers,
            cache: "no-store",
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseApiError(res) }

    const data = await res.json()
    return { success: true, data }
}

export async function setFuelCardStatus(
    cardId: string,
    status: "active" | "inactive" | "canceled",
): Promise<{ success: true; data: IssuingCard } | ActionError> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return ctx

    let res: Response
    try {
        res = await fetch(`${ctx.apiUrl}/api/v1/issuing/cards/${cardId}/status`, {
            method: "PATCH",
            headers: ctx.headers,
            body: JSON.stringify({ status }),
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseApiError(res) }

    const data = await res.json()
    return { success: true, data }
}
