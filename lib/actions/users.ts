"use server"

import { createClient } from "@/lib/supabase/server"

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
    const supabase = await createClient()
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token

    if (!accessToken) {
        return { success: false, error: "Session expired. Please log in again." }
    }

    const apiUrl = process.env.WHENDAN_API_URL
    if (!apiUrl) {
        return { success: false, error: "API is not configured." }
    }

    let res: Response
    try {
        res = await fetch(`${apiUrl}/api/v1/users`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
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
        } catch {
            // ignore parse errors
        }
        return { success: false, error: message }
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
