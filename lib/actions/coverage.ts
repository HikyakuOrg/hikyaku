"use server"

import { buildApiContext, parseApiError } from "./api-client"
import { getWarehouseSummaries } from "@/lib/supabase/db-server"
import type { CoverageDiagnosticDto } from "@/lib/api"

export type CoverageLookupResult =
    | { status: "ok"; diagnostic: CoverageDiagnosticDto }
    // No warehouse exists yet to resolve drivers against. Distinct from an
    // error: it is a normal state for a brand new organisation, not a failure.
    | { status: "no-warehouse" }
    | { status: "error"; error: string }

/**
 * Which territories and drivers cover one point.
 *
 * This calls hikyaku-api's coverage diagnostic endpoint (`coverage.ts`'s CTE),
 * the same containment query Tier 1 assignment filters candidates with. It is
 * the one place in this app that asks "is this point covered", so the areas
 * page's coverage debugger (HIK-17) and customer creation's coverage warning
 * both call this instead of each running their own point-in-polygon check —
 * two implementations of "covered" is how a debugging tool ends up disagreeing
 * with the engine it is supposed to explain.
 *
 * The endpoint scopes its driver list to one warehouse and requires a
 * `warehouseId` whenever the organisation has more than one. `areas`,
 * `anyAreaCovers` and `organisationAreaCount` do not vary by warehouse (the
 * endpoint's own docs say the area list is "not filtered by warehouse"), so
 * defaulting to the organisation's first warehouse is safe for every field
 * this app reads today — it would only change which drivers come back, and no
 * caller here uses that list for a warehouse it did not ask for.
 */
export async function getCoverageForPoint(
    lon: number,
    lat: number,
    warehouseId?: string,
): Promise<CoverageLookupResult> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return { status: "error", error: ctx.error }

    let resolvedWarehouseId = warehouseId

    if (!resolvedWarehouseId) {
        const warehouses = await getWarehouseSummaries()
        if (warehouses.length === 0) return { status: "no-warehouse" }
        resolvedWarehouseId = warehouses[0].id
    }

    const query = new URLSearchParams({
        lon: String(lon),
        lat: String(lat),
        warehouseId: resolvedWarehouseId,
    })

    const res = await fetch(`${ctx.apiUrl}/api/v1/dispatch/coverage?${query.toString()}`, {
        headers: ctx.headers,
        cache: "no-store",
    })

    if (!res.ok) return { status: "error", error: await parseApiError(res) }

    return { status: "ok", diagnostic: (await res.json()) as CoverageDiagnosticDto }
}

/**
 * Why one specific package can or cannot be covered, including the
 * skills-specific reason HIK-94 added (`diagnostic.skills`). The endpoint's
 * "package" request form: it resolves the delivery point and required skills
 * from the package itself, so no lon/lat/warehouseId is needed here.
 */
export async function getCoverageForPackage(packageId: string): Promise<CoverageLookupResult> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return { status: "error", error: ctx.error }

    const query = new URLSearchParams({ packageId })

    const res = await fetch(`${ctx.apiUrl}/api/v1/dispatch/coverage?${query.toString()}`, {
        headers: ctx.headers,
        cache: "no-store",
    })

    if (!res.ok) return { status: "error", error: await parseApiError(res) }

    return { status: "ok", diagnostic: (await res.json()) as CoverageDiagnosticDto }
}
