"use server"

import type { CreateShiftDto, ShiftDto, ShiftPlanDto } from "@/lib/api"
import { getAvailableDriverVehiclePairs, getUnassignedPackagesByWarehouse } from "@/lib/supabase/db-server"
import type { DriverVehiclePair, UnassignedPackage } from "@/lib/supabase/db-server"
import { buildApiContext, parseApiError } from "./api-client"

export type FetchShiftResult = { success: true; shift: ShiftDto } | { success: false; error: string }

/** One shift, with the API's resolved driving limits and whether it is enforcing them. */
export async function fetchShift(shiftId: string): Promise<FetchShiftResult> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return ctx

    let res: Response
    try {
        res = await fetch(`${ctx.apiUrl}/api/v1/shifts/${shiftId}`, {
            headers: ctx.headers,
            cache: "no-store",
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseApiError(res) }
    return { success: true, shift: await res.json() }
}

export type FetchShiftsInRangeResult = { success: true; shifts: ShiftDto[] } | { success: false; error: string }

/** Shifts with a service day in [from, to] (YYYY-MM-DD), for the calendar's driving limit markers. */
export async function fetchShiftsInRange(from: string, to: string): Promise<FetchShiftsInRangeResult> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return ctx

    let res: Response
    try {
        res = await fetch(`${ctx.apiUrl}/api/v1/shifts?from=${from}&to=${to}`, {
            headers: ctx.headers,
            cache: "no-store",
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseApiError(res) }
    return { success: true, shifts: await res.json() }
}

export async function fetchAvailableDriverVehiclePairs(
    warehouseId: string,
    date: string
): Promise<DriverVehiclePair[]> {
    return getAvailableDriverVehiclePairs(warehouseId, date)
}

export async function fetchUnassignedPackages(warehouseId: string): Promise<UnassignedPackage[]> {
    return getUnassignedPackagesByWarehouse(warehouseId)
}

export interface ManualShiftParams {
    warehouseId: string
    /** Warehouse-local service day, YYYY-MM-DD. */
    date: string
    driverId: string
    vehicleId: string
    /** Packages for the shift, in order. Optional: a shift can start empty. */
    orderedPackageIds?: string[]
}

export type CreateManualShiftResult =
    | {
          success: true
          /** vrp_optimization.id. */
          shiftId: string
          /** vrp_route.id for the shift detail page. Null when there is no route yet. */
          routeId: string | null
          /** Packages not added, or added over a deadline or driving limit, with the reason. */
          warnings: string[]
      }
    | { success: false; error: string }

/**
 * Create a manual shift, then add the packages picked in the wizard.
 *
 * Two calls: POST /shifts creates an empty shift (and bills it), and
 * POST /shifts/:id/packages adds the packages. Each is atomic on the server.
 */
export async function createManualShift(params: ManualShiftParams): Promise<CreateManualShiftResult> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return ctx

    const body: CreateShiftDto = {
        warehouseId: params.warehouseId,
        driverId: params.driverId,
        vehicleId: params.vehicleId,
        shiftDate: params.date,
        // No scheduledStart: the shift stays open until someone dispatches it.
    }

    let created: Response
    try {
        created = await fetch(`${ctx.apiUrl}/api/v1/shifts`, {
            method: "POST",
            headers: ctx.headers,
            body: JSON.stringify(body),
            cache: "no-store",
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (created.status === 409) {
        return {
            success: false,
            error: "That driver or vehicle already has an open shift on this date.",
        }
    }
    if (created.status === 402) {
        return {
            success: false,
            error:
                "You used all the shifts for this billing period. Add a payment method to create more.",
        }
    }
    if (!created.ok) return { success: false, error: await parseApiError(created) }

    const shift: ShiftDto = await created.json()

    const packageIds = params.orderedPackageIds ?? []
    if (packageIds.length === 0) {
        return { success: true, shiftId: shift.id, routeId: shift.routeId, warnings: [] }
    }

    let planned: Response
    try {
        planned = await fetch(`${ctx.apiUrl}/api/v1/shifts/${shift.id}/packages`, {
            method: "POST",
            headers: ctx.headers,
            body: JSON.stringify({ packageIds }),
            cache: "no-store",
        })
    } catch {
        // The shift exists but is empty. The dispatcher can fill it from the shift page.
        return {
            success: false,
            error: "The shift was created, but the packages were not added. Open the shift and add them again.",
        }
    }

    if (!planned.ok) {
        return {
            success: false,
            error: `The shift was created, but the packages were not added: ${await parseApiError(planned)}`,
        }
    }

    const plan: ShiftPlanDto = await planned.json()
    const warnings = plan.packages
        .filter((p) => !p.added || p.warning)
        .map((p) => {
            const label = `Package ${p.packageId.slice(0, 8)}`
            if (!p.added) return p.warning ?? `${label} could not be added.`
            // Limits apply to automatic assignment, not to the dispatcher, so the
            // package is on the shift. The API warning describes the breach.
            return `${label} was added anyway: ${p.warning}.`
        })

    return {
        success: true,
        shiftId: plan.shift.id,
        routeId: plan.shift.routeId,
        warnings,
    }
}

/**
 * Remove one package from a shift. The API rewrites the route and sets the
 * package back to PENDING. It refuses (409) a package that is IN_TRANSIT,
 * onboard or delivered.
 */
export async function removePackageFromShift(
    shiftId: string,
    packageId: string,
): Promise<{ success: true; plan: ShiftPlanDto } | { success: false; error: string }> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return ctx

    let res: Response
    try {
        res = await fetch(`${ctx.apiUrl}/api/v1/shifts/${shiftId}/packages/${packageId}`, {
            method: "DELETE",
            headers: ctx.headers,
            cache: "no-store",
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseApiError(res) }
    return { success: true, plan: await res.json() }
}
