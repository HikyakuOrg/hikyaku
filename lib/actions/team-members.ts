"use server"

import { buildApiContext, parseApiError } from "./api-client"

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

// The active tenant is forwarded to the API as the X-Organisation-Slug header
// (built by buildApiContext) so the operation is scoped to this organisation.
export async function updateTeamMemberRole(
    userId: string,
    roleName: string,
): Promise<UpdateTeamMemberRoleResult | TeamMemberActionError> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return ctx

    let res: Response
    try {
        res = await fetch(`${ctx.apiUrl}/api/v1/users/role`, {
            method: "PATCH",
            headers: ctx.headers,
            body: JSON.stringify({ user_id: userId, role_name: roleName }),
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseApiError(res) }

    const data = await res.json()
    return { success: true, user_id: data.user_id, role: data.role }
}

export async function deleteTeamMembers(
    userIds: string[],
): Promise<DeleteTeamMembersResult | TeamMemberActionError> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return ctx

    let res: Response
    try {
        res = await fetch(`${ctx.apiUrl}/api/v1/users`, {
            method: "DELETE",
            headers: ctx.headers,
            body: JSON.stringify({ user_ids: userIds }),
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseApiError(res) }

    const data = await res.json()
    return { success: true, deactivated: data.deactivated ?? [], failed: data.failed ?? [] }
}
