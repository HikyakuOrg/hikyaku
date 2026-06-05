import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"

/** Discriminated error shape returned by tenant-scoped server actions. */
export type ActionError = { success: false; error: string }

/**
 * Everything a tenant-scoped call to hikyaku-api needs: the backend base URL,
 * the active org slug, the caller's access token, and a ready-to-send headers
 * object (JSON + bearer auth + org slug).
 */
export type ApiContext = {
    apiUrl: string
    slug: string
    accessToken: string
    headers: Record<string, string>
}

/** Base URL of the hikyaku-api backend, or null when unconfigured. */
export function getApiUrl(): string | null {
    return process.env.NEXT_PUBLIC_HIKYAKU_API_URL ?? null
}

/** The active org slug, forwarded by middleware as the `x-org-slug` header. */
export async function getOrgSlug(): Promise<string | null> {
    return (await headers()).get("x-org-slug")
}

/** The caller's Supabase access token, or an error if the session has expired. */
export async function getAccessToken(): Promise<{ accessToken: string } | { error: string }> {
    const supabase = await createClient()
    const { data } = await supabase.auth.getSession()
    const accessToken = data?.session?.access_token
    if (!accessToken) return { error: "Session expired. Please log in again." }
    return { accessToken }
}

/**
 * Resolve the full context for a tenant-scoped API call. Returns an
 * `ActionError` if the session, active org, or API config is missing, so
 * callers can `if ("error" in ctx) return ctx`.
 */
export async function buildApiContext(): Promise<ApiContext | ActionError> {
    const auth = await getAccessToken()
    if ("error" in auth) return { success: false, error: auth.error }
    const slug = await getOrgSlug()
    if (!slug) return { success: false, error: "No active organisation." }
    const apiUrl = getApiUrl()
    if (!apiUrl) return { success: false, error: "API is not configured." }
    return {
        apiUrl,
        slug,
        accessToken: auth.accessToken,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.accessToken}`,
            "X-Organisation-Slug": slug,
        },
    }
}

/** Extract a human-friendly message from a failed hikyaku-api response. */
export async function parseApiError(res: Response): Promise<string> {
    let message = `Request failed (${res.status})`
    try {
        const body = await res.json()
        if (typeof body?.message === "string") message = body.message
        else if (Array.isArray(body?.message)) message = body.message.join(", ")
    } catch {
        /* ignore */
    }
    return message
}
