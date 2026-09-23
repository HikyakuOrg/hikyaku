"use server"

import type { CreateUserDto, CreateUserResultDto } from "@/lib/api"
import { buildApiContext, parseApiError } from "./api-client"

/** Body of `POST /api/v1/users`; `user_metadata` is required for the Driver role. */
export type CreateUserPayload = CreateUserDto

export interface CreateUserResult {
    success: true
    avatarUploadUrl?: string
}

export interface CreateUserError {
    success: false
    error: string
}

export async function createUser(
    payload: CreateUserPayload
): Promise<CreateUserResult | CreateUserError> {
    // The new member joins the active organisation, which the API resolves
    // from the X-Organisation-Slug header set by buildApiContext.
    const ctx = await buildApiContext()
    if ("error" in ctx) return ctx

    let res: Response
    try {
        res = await fetch(`${ctx.apiUrl}/api/v1/users`, {
            method: "POST",
            headers: ctx.headers,
            body: JSON.stringify(payload),
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) {
        return { success: false, error: await parseApiError(res) }
    }

    let data: Partial<CreateUserResultDto> = {}
    try {
        data = await res.json()
    } catch {
        // 201 with no body is fine
    }

    return {
        success: true,
        avatarUploadUrl:
            typeof data?.user_avatar_upload_url === "string"
                ? data.user_avatar_upload_url
                : undefined,
    }
}
