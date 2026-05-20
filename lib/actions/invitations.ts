"use server"

import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"

export interface PendingInvitation {
    id: string
    created_at: string
    organisation: { id: string; slug: string; name: string }
    role: string
    permissions: string[]
}

export interface CreateInvitationInput {
    userEmail: string
    orgId: string
    permissions: string[]
    role: string
}

export type ActionResult<T> = ({ success: true } & T) | { success: false; error: string }

async function getAccessToken(): Promise<string | { error: string }> {
    const supabase = await createClient()
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) return { error: "Session expired. Please log in again." }
    return token
}

function getApiUrl(): string | null {
    return process.env.WHENDAN_API_URL ?? null
}

async function getOrgSlug(): Promise<string | null> {
    const h = await headers()
    return h.get("x-org-slug")
}

async function parseError(res: Response): Promise<string> {
    let message = `Request failed (${res.status})`
    try {
        const body = await res.json()
        if (typeof body?.message === "string") message = body.message
        else if (Array.isArray(body?.message)) message = body.message.join(", ")
    } catch { /* ignore */ }
    return message
}

export async function createInvitation(
    input: CreateInvitationInput,
): Promise<ActionResult<{ id: string }>> {
    const token = await getAccessToken()
    if (typeof token !== "string") return { success: false, error: token.error }

    const apiUrl = getApiUrl()
    if (!apiUrl) return { success: false, error: "API is not configured." }

    const slug = await getOrgSlug()
    if (!slug) return { success: false, error: "No active organisation." }

    let res: Response
    try {
        res = await fetch(`${apiUrl}/api/v1/invitations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                "X-Organisation-Slug": slug,
            },
            body: JSON.stringify({
                user_email: input.userEmail,
                org_id: input.orgId,
                role: input.role,
                permissions: input.permissions,
            }),
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseError(res) }

    const data = await res.json()
    return { success: true, id: data.id }
}

export async function listPendingInvitations(): Promise<PendingInvitation[]> {
    const token = await getAccessToken()
    if (typeof token !== "string") return []

    const apiUrl = getApiUrl()
    if (!apiUrl) return []

    let res: Response
    try {
        res = await fetch(`${apiUrl}/api/v1/invitations/pending`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        })
    } catch {
        return []
    }

    if (!res.ok) return []
    return (await res.json()) as PendingInvitation[]
}

export async function acceptInvitation(
    id: string,
): Promise<ActionResult<{ organisationSlug: string }>> {
    const token = await getAccessToken()
    if (typeof token !== "string") return { success: false, error: token.error }

    const apiUrl = getApiUrl()
    if (!apiUrl) return { success: false, error: "API is not configured." }

    let res: Response
    try {
        res = await fetch(`${apiUrl}/api/v1/invitations/${id}/accept`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseError(res) }

    const data = await res.json()
    return { success: true, organisationSlug: data.organisation_slug }
}

export type DeclineResult = { success: true } | { success: false; error: string }

export async function declineInvitation(id: string): Promise<DeclineResult> {
    const token = await getAccessToken()
    if (typeof token !== "string") return { success: false, error: token.error }

    const apiUrl = getApiUrl()
    if (!apiUrl) return { success: false, error: "API is not configured." }

    let res: Response
    try {
        res = await fetch(`${apiUrl}/api/v1/invitations/${id}/decline`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseError(res) }

    return { success: true }
}
