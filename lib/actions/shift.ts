"use server"

import { createClient } from "@/lib/supabase/server"
import { getSupabaseServerClaims } from "@/lib/supabase/server"
import { insertPackageTimeline } from "@/lib/supabase/supabase-rpc"
import { getAvailableDriverVehiclePairs, getUnassignedPackagesByWarehouse } from "@/lib/supabase/db-server"
import type { DriverVehiclePair, UnassignedPackage } from "@/lib/supabase/db-server"
import type { RoutePreview } from "@/app/models/route-preview"
import { getErrorMessage } from "@/lib/utils"
import type { Database } from "@/lib/supabase/supabase"

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
    warehouseLng: number
    warehouseLat: number
    date: string // YYYY-MM-DD
    driverId: string
    vehicleId: string
    orderedPackages: {
        packageId: string
        customerLng: number
        customerLat: number
    }[]
    routePreview: RoutePreview
}

export async function createManualShift(params: ManualShiftParams): Promise<{ success: true; routeId: string } | { success: false; error: string }> {
    const { data: claimsData, error: claimsError } = await getSupabaseServerClaims()
    if (claimsError || !claimsData?.claims?.sub) {
        return { success: false, error: "Not authenticated" }
    }
    const userId = claimsData.claims.sub

    const supabase = await createClient()

    try {
        // 0. Resolve the org owning this shift. The vrp_optimization RLS
        // insert policy (migration 0031) requires organisation_id to be set.
        const { data: warehouse, error: warehouseError } = await supabase
            .from("warehouse")
            .select("organisation_id")
            .eq("id", params.warehouseId)
            .single()

        if (warehouseError || !warehouse) {
            throw new Error(`warehouse lookup (${params.warehouseId}): ${warehouseError?.message ?? "not found"}`)
        }

        // 1. Insert vrp_optimization
        const { data: optimization, error: optError } = await supabase
            .from("vrp_optimization")
            .insert({
                provider: "manual",
                organisation_id: warehouse.organisation_id,
                request: { _meta: { created_by: userId, created_at: new Date().toISOString() } },
                response: { _meta: { manual: true } },
            })
            .select("id")
            .single()

        if (optError) throw new Error(`vrp_optimization insert: ${optError.message}`)

        // 2. Insert vrp_solution
        const { data: solution, error: solError } = await supabase
            .from("vrp_solution")
            .insert({
                optimization_id: optimization.id,
                routes_count: 1,
                unassigned_count: 0,
                duration: params.routePreview.summary.duration,
            })
            .select("id")
            .single()

        if (solError) throw new Error(`vrp_solution insert: ${solError.message}`)

        // 3. Insert vrp_route
        const { data: route, error: routeError } = await supabase
            .from("vrp_route")
            .insert({
                solution_id: solution.id,
                duration: params.routePreview.summary.duration,
            })
            .select("id")
            .single()

        if (routeError) throw new Error(`vrp_route insert: ${routeError.message}`)

        // 4. Insert package_assignment rows
        for (const pkg of params.orderedPackages) {
            const { error: paError } = await supabase
                .from("package_assignment")
                .insert({
                    package_id: pkg.packageId,
                    driver_id: params.driverId,
                    vehicle_id: params.vehicleId,
                })

            if (paError) throw new Error(`package_assignment insert (${pkg.packageId}): ${paError.message}`)
        }

        // 5. Build vrp_route_step rows
        // Arrival per stop is derived from the cumulative leg durations
        // (legs[i] connects stop i to stop i+1).
        const segmentDurations: number[] = params.routePreview.legs.map((leg) => leg.duration)

        const routeStepInserts: Database["public"]["Tables"]["vrp_route_step"]["Insert"][] = []

        // start step
        routeStepInserts.push({
            route_id: route.id,
            solution_id: solution.id,
            step_index: 0,
            type: "start",
            location: `SRID=4326;POINT(${params.warehouseLng} ${params.warehouseLat})`,
            arrival: 0,
        })

        // job steps
        let cumulativeArrival = 0
        for (let i = 0; i < params.orderedPackages.length; i++) {
            cumulativeArrival += segmentDurations[i] ?? 0
            const pkg = params.orderedPackages[i]
            routeStepInserts.push({
                route_id: route.id,
                solution_id: solution.id,
                step_index: i + 1,
                type: "job",
                location: `SRID=4326;POINT(${pkg.customerLng} ${pkg.customerLat})`,
                arrival: Math.round(cumulativeArrival),
                package_id: pkg.packageId,
            })
        }

        // end step
        cumulativeArrival += segmentDurations[params.orderedPackages.length] ?? 0
        routeStepInserts.push({
            route_id: route.id,
            solution_id: solution.id,
            step_index: params.orderedPackages.length + 1,
            type: "end",
            location: `SRID=4326;POINT(${params.warehouseLng} ${params.warehouseLat})`,
            arrival: Math.round(cumulativeArrival),
        })

        const { error: stepsError } = await supabase.from("vrp_route_step").insert(routeStepInserts)
        if (stepsError) throw new Error(`vrp_route_step insert: ${stepsError.message}`)

        // 6. Upsert package_delivery_window per package
        const [year, month, day] = params.date.split("-").map(Number)
        const departureDate = new Date(Date.UTC(year, month - 1, day, 8, 0, 0))

        let cumSecs = 0
        for (let i = 0; i < params.orderedPackages.length; i++) {
            cumSecs += segmentDurations[i] ?? 0
            const pkg = params.orderedPackages[i]
            const scheduledArrival = new Date(departureDate.getTime() + cumSecs * 1000)

            const { error: pdwError } = await supabase
                .from("package_delivery_window")
                .upsert({
                    package_id: pkg.packageId,
                    scheduled_departure: departureDate.toISOString(),
                    scheduled_arrival: scheduledArrival.toISOString(),
                })

            if (pdwError) throw new Error(`package_delivery_window upsert (${pkg.packageId}): ${pdwError.message}`)
        }

        // 7. Insert package_timeline ASSIGNED for each package
        for (const pkg of params.orderedPackages) {
            await insertPackageTimeline(pkg.packageId, "ASSIGNED", supabase)
        }

        return { success: true, routeId: route.id }
    } catch (err) {
        console.error("createManualShift error:", err)
        return { success: false, error: getErrorMessage(err) || "An unexpected error occurred" }
    }
}
