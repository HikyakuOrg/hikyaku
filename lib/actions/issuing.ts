"use server"

import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"

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

export async function listFuelCards(): Promise<
    { success: true; data: IssuingCard[] } | ActionError
> {
    const hResult = await buildHeaders()
    if ("error" in hResult) return { success: false, error: hResult.error }

    const apiUrl = getApiUrl()
    if (!apiUrl) return { success: false, error: "API is not configured." }

    let res: Response
    try {
        res = await fetch(`${apiUrl}/api/v1/issuing/cards`, {
            headers: hResult.headers,
            cache: "no-store",
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) {
        let message = `Request failed (${res.status})`
        try {
            const body = await res.json()
            if (typeof body?.message === "string") message = body.message
            else if (Array.isArray(body?.message)) message = body.message.join(", ")
        } catch { /* ignore */ }
        return { success: false, error: message }
    }

    const data = await res.json()
    return { success: true, data }
}

export async function issueFuelCard(
    input: IssueCardInput,
): Promise<{ success: true; data: IssuingCard } | ActionError> {
    const hResult = await buildHeaders()
    if ("error" in hResult) return { success: false, error: hResult.error }

    const apiUrl = getApiUrl()
    if (!apiUrl) return { success: false, error: "API is not configured." }

    let res: Response
    try {
        res = await fetch(`${apiUrl}/api/v1/issuing/cards`, {
            method: "POST",
            headers: hResult.headers,
            body: JSON.stringify(input),
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) {
        let message = `Request failed (${res.status})`
        try {
            const body = await res.json()
            if (typeof body?.message === "string") message = body.message
            else if (Array.isArray(body?.message)) message = body.message.join(", ")
        } catch { /* ignore */ }
        return { success: false, error: message }
    }

    const data = await res.json()
    return { success: true, data }
}

export async function listFuelTransactions(filters?: {
    driverId?: string
    vehicleId?: string
}): Promise<{ success: true; data: IssuingTransaction[] } | ActionError> {
    const hResult = await buildHeaders()
    if ("error" in hResult) return { success: false, error: hResult.error }

    const apiUrl = getApiUrl()
    if (!apiUrl) return { success: false, error: "API is not configured." }

    const params = new URLSearchParams()
    if (filters?.driverId) params.set("driverId", filters.driverId)
    if (filters?.vehicleId) params.set("vehicleId", filters.vehicleId)
    const qs = params.toString() ? `?${params.toString()}` : ""

    let res: Response
    try {
        res = await fetch(`${apiUrl}/api/v1/issuing/transactions${qs}`, {
            headers: hResult.headers,
            cache: "no-store",
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) {
        let message = `Request failed (${res.status})`
        try {
            const body = await res.json()
            if (typeof body?.message === "string") message = body.message
            else if (Array.isArray(body?.message)) message = body.message.join(", ")
        } catch { /* ignore */ }
        return { success: false, error: message }
    }

    const data = await res.json()
    return { success: true, data }
}

export async function setFuelCardStatus(
    cardId: string,
    status: "active" | "inactive" | "canceled",
): Promise<{ success: true; data: IssuingCard } | ActionError> {
    const hResult = await buildHeaders()
    if ("error" in hResult) return { success: false, error: hResult.error }

    const apiUrl = getApiUrl()
    if (!apiUrl) return { success: false, error: "API is not configured." }

    let res: Response
    try {
        res = await fetch(`${apiUrl}/api/v1/issuing/cards/${cardId}/status`, {
            method: "PATCH",
            headers: hResult.headers,
            body: JSON.stringify({ status }),
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) {
        let message = `Request failed (${res.status})`
        try {
            const body = await res.json()
            if (typeof body?.message === "string") message = body.message
            else if (Array.isArray(body?.message)) message = body.message.join(", ")
        } catch { /* ignore */ }
        return { success: false, error: message }
    }

    const data = await res.json()
    return { success: true, data }
}
