"use server"

import {
    buildApiContext,
    getAccessToken,
    getApiUrl,
    parseApiError,
} from "./api-client"

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

export async function createInvitation(
    input: CreateInvitationInput,
): Promise<ActionResult<{ id: string }>> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return ctx

    let res: Response
    try {
        res = await fetch(`${ctx.apiUrl}/api/v1/invitations`, {
            method: "POST",
            headers: ctx.headers,
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

    if (!res.ok) return { success: false, error: await parseApiError(res) }

    const data = await res.json()
    return { success: true, id: data.id }
}

export async function listPendingInvitations(): Promise<PendingInvitation[]> {
    const auth = await getAccessToken()
    if ("error" in auth) return []

    const apiUrl = getApiUrl()
    if (!apiUrl) return []

    let res: Response
    try {
        res = await fetch(`${apiUrl}/api/v1/invitations/pending`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${auth.accessToken}`,
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
    const auth = await getAccessToken()
    if ("error" in auth) return { success: false, error: auth.error }

    const apiUrl = getApiUrl()
    if (!apiUrl) return { success: false, error: "API is not configured." }

    let res: Response
    try {
        res = await fetch(`${apiUrl}/api/v1/invitations/${id}/accept`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${auth.accessToken}`,
            },
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseApiError(res) }

    const data = await res.json()
    return { success: true, organisationSlug: data.organisation_slug }
}

export type DeclineResult = { success: true } | { success: false; error: string }

export async function declineInvitation(id: string): Promise<DeclineResult> {
    const auth = await getAccessToken()
    if ("error" in auth) return { success: false, error: auth.error }

    const apiUrl = getApiUrl()
    if (!apiUrl) return { success: false, error: "API is not configured." }

    let res: Response
    try {
        res = await fetch(`${apiUrl}/api/v1/invitations/${id}/decline`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${auth.accessToken}`,
            },
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseApiError(res) }

    return { success: true }
}
