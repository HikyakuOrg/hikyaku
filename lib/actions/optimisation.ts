"use server"

import { buildApiContext, parseApiError } from "./api-client"
import {
    getOptimisationVehicleOptions,
    getWarehouseSummaries,
    type OptimisationVehicleOption,
} from "@/lib/supabase/db-server"

export interface OptimisationWarehouse {
    id: string
    warehouse_name: string
}

export type OptimisationRunStatus =
    | "queued"
    | "running"
    | "completed"
    | "failed"
    | "skipped"

export interface OptimisationRunInfo {
    id: string
    status: OptimisationRunStatus | string
    requestedAt: string
    optimisationId: string | null
    error: string | null
    /** When the next run is allowed (null once the cooldown has lapsed). */
    nextAllowedAt: string | null
}

export interface SetOffOverrideInput {
    vehicleId: string
    /** ISO timestamp the vehicle should set off. */
    setOffAt: string
}

/**
 * Queue an optimisation for a warehouse. Returns the run id, or an error. When
 * rate-limited, the error has nextAllowedAt for the countdown.
 */
export async function triggerOptimisation(input: {
    warehouseId: string
    setOffOverrides?: SetOffOverrideInput[]
}): Promise<{ runId: string } | { error: string; nextAllowedAt?: string }> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return { error: ctx.error }

    const res = await fetch(`${ctx.apiUrl}/api/v1/optimisation/run`, {
        method: "POST",
        headers: ctx.headers,
        body: JSON.stringify(input),
        cache: "no-store",
    })

    if (res.status === 429) {
        const body = await res.json().catch(() => ({}))
        return {
            error: "Optimisation was run recently.",
            nextAllowedAt: typeof body?.nextAllowedAt === "string" ? body.nextAllowedAt : undefined,
        }
    }
    if (!res.ok) return { error: await parseApiError(res) }

    const data = await res.json()
    return { runId: data.runId as string }
}

/** The active org's latest run and next allowed time. Null if it never ran. */
export async function getOptimisationStatus(): Promise<
    OptimisationRunInfo | null | { error: string }
> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return { error: ctx.error }

    const res = await fetch(`${ctx.apiUrl}/api/v1/optimisation/run/latest`, {
        method: "GET",
        headers: ctx.headers,
        cache: "no-store",
    })
    if (!res.ok) return { error: await parseApiError(res) }
    return (await res.json()) as OptimisationRunInfo | null
}

/** The active org's warehouses, for the optimisation dialog selector. */
export async function getOptimisationWarehouses(): Promise<
    OptimisationWarehouse[] | { error: string }
> {
    try {
        const summaries = await getWarehouseSummaries()
        return summaries.map((w) => ({ id: w.id, warehouse_name: w.warehouse_name }))
    } catch (e) {
        return { error: e instanceof Error ? e.message : "Could not load the warehouses." }
    }
}

/** Driver and vehicle pairs in a warehouse, for the departure dialog. */
export async function getOptimisationVehicles(
    warehouseId: string,
): Promise<OptimisationVehicleOption[] | { error: string }> {
    try {
        return await getOptimisationVehicleOptions(warehouseId)
    } catch (e) {
        return { error: e instanceof Error ? e.message : "Could not load the vehicles." }
    }
}
