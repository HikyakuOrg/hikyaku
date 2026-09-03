"use server"

import type { CreatePackageDto, CreatePackageResultDto } from "@/lib/api"
import { createClient } from "@/lib/supabase/server"
import { getDriversByIds } from "@/lib/supabase/supabase-rpc"
import { type ActionError, buildApiContext, parseApiError } from "./api-client"

/**
 * A created package plus the outcome of assigning it, and the assigned driver's
 * name when there is one.
 *
 * `result` is the generated DTO verbatim — nothing about the contract is
 * restated here. `driverName` is the one thing the response cannot carry:
 * `AssignedShiftDto` identifies the driver by id, and the success panel has to
 * say "Assigned to Alex's shift", not a UUID. Resolving it here keeps the
 * client to a single round trip. Null when the package was not assigned, or
 * when the driver lookup failed — the outcome still renders without it.
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
 * Replaces four non-atomic PostgREST writes (packages, package_dimensions,
 * package_delivery_window, package_timeline) with one call. The org is derived
 * from the `X-Organisation-Slug` header, so no slug→id lookup happens here.
 *
 * The API answers 201 even when assignment failed — a package is never lost
 * because no van had room. Read `result.assignment.outcome` for what actually
 * happened; an `error` from this action means the package was *not* created.
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
        return { success: false, error: "Failed to reach the API." }
    }

    // 201 on create, 200 when an identical payload replays against an existing
    // tracking number. Both are successes and both return the same body.
    if (!res.ok) return { success: false, error: await parseApiError(res) }

    const result: CreatePackageResultDto = await res.json()
    return {
        success: true,
        result,
        driverName: await resolveDriverName(result.assignment.shift?.driverId ?? null),
    }
}

/**
 * Display name for an assigned driver. Drivers are read through a Postgres RPC
 * rather than the API (see `ListDriverDto` in `lib/api/manual.ts`), and a
 * failure here must not turn a successful creation into an error — the panel
 * falls back to "a driver".
 */
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
