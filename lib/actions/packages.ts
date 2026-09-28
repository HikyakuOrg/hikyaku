"use server"

import type { CreatePackageDto, CreatePackageResultDto } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { getDriversByIds } from "@/lib/supabase/supabase-rpc"
import { type ActionError, buildApiContext, parseApiError } from "./api-client"

/**
 * A created package, its assignment outcome, and the assigned driver's name.
 * The API gives only the driver id. `driverName` is null when the package is
 * not assigned or the lookup failed.
 */
export type CreatePackageSuccess = {
    success: true
    result: CreatePackageResultDto
    driverName: string | null
}

export type CreatePackageActionResult = CreatePackageSuccess | ActionError

/**
 * Create a package and, unless `autoAssign` is false, assign it to a shift.
 *
 * The API returns 201 even when assignment fails. Check
 * `result.assignment.outcome`. An `error` means the package was not created.
 */
export async function createPackage(
    input: CreatePackageDto,
): Promise<CreatePackageActionResult> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return ctx

    let res: Response
    try {
        res = await fetch(`${ctx.apiUrl}/api/v1/packages`, {
            method: "POST",
            headers: ctx.headers,
            body: JSON.stringify(input),
            cache: "no-store",
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    // 201 on create, 200 when the same payload is sent again. Same body.
    if (!res.ok) return { success: false, error: await parseApiError(res) }

    const result: CreatePackageResultDto = await res.json()
    return {
        success: true,
        result,
        driverName: await resolveDriverName(result.assignment.shift?.driverId ?? null),
    }
}

/** The assigned driver's name, or null on failure. The package is still created. */
async function resolveDriverName(driverId: string | null): Promise<string | null> {
    if (!driverId) return null
    try {
        const supabase = await createClient()
        const drivers = await getDriversByIds([driverId], supabase)
        return drivers[0]?.display_name ?? null
    } catch (e) {
        console.error("Failed to resolve the assigned driver's name:", e)
        return null
    }
}
