"use server"

import { getAccessToken, getApiUrl, parseApiError } from "./api-client"

export interface CreateUserPayload {
    user_email: string
    user_display_name: string
    user_phone_number: string
    user_role: string
    user_permission: string[]
    user_avatar?: boolean
    user_metadata?: {
        driver_license?: string
        license_expiry?: string
        country_of_issue?: string
        driver_under_probation?: boolean
        license_type?: string
    }
}

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
    const auth = await getAccessToken()
    if ("error" in auth) {
        return { success: false, error: auth.error }
    }

    const apiUrl = getApiUrl()
    if (!apiUrl) {
        return { success: false, error: "API is not configured." }
    }

    let res: Response
    try {
        res = await fetch(`${apiUrl}/api/v1/users`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${auth.accessToken}`,
            },
            body: JSON.stringify(payload),
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) {
        return { success: false, error: await parseApiError(res) }
    }

    let data: Record<string, unknown> = {}
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
