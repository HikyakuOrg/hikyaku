"use server"

import type { CreateShiftDto, ShiftDto, ShiftPlanDto } from "@/lib/api"
import { getAvailableDriverVehiclePairs, getUnassignedPackagesByWarehouse } from "@/lib/supabase/db-server"
import type { DriverVehiclePair, UnassignedPackage } from "@/lib/supabase/db-server"
import { buildApiContext, parseApiError } from "./api-client"

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
    /**
     * Packages to put on the shift, in the dispatcher's chosen order. Optional —
     * a shift can be opened with nothing on it and fill up by assignment.
     */
    orderedPackageIds?: string[]
}

export type CreateManualShiftResult =
    | {
          success: true
          /** vrp_optimization.id. */
          shiftId: string
          /**
           * vrp_route.id, which is what the shift detail page is keyed on. Null
           * when the shift has no route yet, in which case the caller should
           * fall back to the shifts list.
           */
          routeId: string | null
          /** Packages the API declined to place, with the reason it gave. */
          warnings: string[]
      }
    | { success: false; error: string }

/**
 * Open a manual shift and, when the wizard picked packages, put them on it.
 *
 * This used to be seven separate PostgREST writes from the browser —
 * vrp_optimization, vrp_solution, vrp_route, a package_assignment per package,
 * the route steps, a package_delivery_window upsert per package, and a timeline
 * row per package — with no transaction anywhere. Three specific problems went
 * with that:
 *
 *  - driver, vehicle, warehouse and date were stuffed into a `request._meta`
 *    JSON blob because the schema had nowhere to put them. They are columns now.
 *  - the delivery-window upsert overwrote `scheduled_arrival` — the customer's
 *    deadline — with a computed ETA. The planner writes `estimated_arrival`
 *    instead, and never touches the promise.
 *  - a failure partway through left a half-built shift behind.
 *
 * Two calls rather than one, because creating a shift and filling it are two
 * endpoints: POST /shifts opens an empty planned shift (this is the one place a
 * human deliberately bills a shift), POST /shifts/:id/packages is the dispatcher
 * override that places specific packages on it. Each is atomic server-side.
 *
 * RoutePreview stays client-side — it draws the map, and the API plans the route.
 */
export async function createManualShift(params: ManualShiftParams): Promise<CreateManualShiftResult> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return ctx

    const body: CreateShiftDto = {
        warehouseId: params.warehouseId,
        driverId: params.driverId,
        vehicleId: params.vehicleId,
        shiftDate: params.date,
        // scheduledStart is deliberately omitted. The old action invented 08:00
        // UTC as a departure time; the shift now simply stays open to assignment
        // until someone dispatches it.
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
        return { success: false, error: "Failed to reach the API." }
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
                "This billing period's shift allowance is used up. Add a payment method to create more shifts.",
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
        // The shift exists and is empty — a real, recoverable state the
        // dispatcher can fill from the shift page. Say so rather than implying
        // nothing happened.
        return {
            success: false,
            error: "The shift was created, but adding the packages failed. Open it and add them again.",
        }
    }

    if (!planned.ok) {
        return {
            success: false,
            error: `The shift was created, but adding the packages failed: ${await parseApiError(planned)}`,
        }
    }

    const plan: ShiftPlanDto = await planned.json()
    const warnings = plan.packages
        .filter((p) => !p.added || p.warning)
        .map((p) => p.warning ?? `Package ${p.packageId.slice(0, 8)} could not be added.`)

    return {
        success: true,
        shiftId: plan.shift.id,
        routeId: plan.shift.routeId,
        warnings,
    }
}

/**
 * Take one package off a shift: the assignment is dropped, the route steps are
 * rewritten without it, and the package goes back to PENDING for reassignment.
 *
 * Replaces a browser-side delete-then-renumber that could not be atomic, and
 * whose PENDING timeline write silently did nothing until AllowStatusRevisits
 * dropped the unique constraint that was swallowing it.
 *
 * The API refuses (409) a package that is already IN_TRANSIT, onboard or
 * delivered.
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
        return { success: false, error: "Failed to reach the API." }
    }

    if (!res.ok) return { success: false, error: await parseApiError(res) }
    return { success: true, plan: await res.json() }
}
