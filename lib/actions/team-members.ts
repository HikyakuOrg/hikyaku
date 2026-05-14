"use server"

import { createClient } from "@/lib/supabase/server"

export interface UpdateTeamMemberRoleResult {
    success: true
    user_id: string
    role: string
}

export interface TeamMemberActionError {
    success: false
    error: string
}

export interface DeleteTeamMembersResult {
    success: true
    deactivated: string[]
    failed: Array<{ user_id: string; reason: string }>
}

async function getAuthHeaders(): Promise<{ accessToken: string } | { error: string }> {
    const supabase = await createClient()
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token
    if (!accessToken) return { error: "Session expired. Please log in again." }
    return { accessToken }
}

function getApiUrl(): string | null {
    return process.env.WHENDAN_API_URL ?? null
}

export async function updateTeamMemberRole(
    userId: string,
    roleName: string,
): Promise<UpdateTeamMemberRoleResult | TeamMemberActionError> {
    const auth = await getAuthHeaders()
    if ("error" in auth) return { success: false, error: auth.error }

    const apiUrl = getApiUrl()
    if (!apiUrl) return { success: false, error: "API is not configured." }

    let res: Response
    try {
        res = await fetch(`${apiUrl}/api/v1/users/role`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${auth.accessToken}`,
            },
            body: JSON.stringify({ user_id: userId, role_name: roleName }),
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
    return { success: true, user_id: data.user_id, role: data.role }
}

export async function deleteTeamMembers(
    userIds: string[],
): Promise<DeleteTeamMembersResult | TeamMemberActionError> {
    const auth = await getAuthHeaders()
    if ("error" in auth) return { success: false, error: auth.error }

    const apiUrl = getApiUrl()
    if (!apiUrl) return { success: false, error: "API is not configured." }

    let res: Response
    try {
        res = await fetch(`${apiUrl}/api/v1/users`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${auth.accessToken}`,
            },
            body: JSON.stringify({ user_ids: userIds }),
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
    return { success: true, deactivated: data.deactivated ?? [], failed: data.failed ?? [] }
}
