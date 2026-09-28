"use server"

import { buildApiContext, parseApiError } from "./api-client"
import { getWarehouseSummaries } from "@/lib/supabase/db-server"
import type { CoverageDiagnosticDto } from "@/lib/api"

export type CoverageLookupResult =
    | { status: "ok"; diagnostic: CoverageDiagnosticDto }
    // No warehouse yet. Normal for a new organisation.
    | { status: "no-warehouse" }
    | { status: "error"; error: string }

/**
 * Which service areas and drivers cover one point.
 *
 * Uses the API's coverage endpoint, the same query that assignment uses. Use
 * this for every coverage check so the app and the engine always agree.
 *
 * The endpoint needs a warehouse. Without one this uses the first warehouse.
 * That changes only the driver list; the area fields are the same.
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
 * Why one package can or cannot be covered, including skills
 * (`diagnostic.skills`). The API reads the point and skills from the package.
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
