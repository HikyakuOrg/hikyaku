"use server"

import { createClient } from "@/lib/supabase/server"
import { getSupabaseServerClaims } from "@/lib/supabase/server"
import { insertPackageTimeline } from "@/lib/supabase/supabase-rpc"
import { getAvailableDriverVehiclePairs, getUnassignedPackagesByWarehouse } from "@/lib/supabase/db-server"
import type { DriverVehiclePair, UnassignedPackage } from "@/lib/supabase/db-server"
import { DirectionsResponse, type RouteSegment } from "ors-client"
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
    orsRoute: DirectionsResponse
}

export async function createManualShift(params: ManualShiftParams): Promise<{ success: true; routeId: string } | { success: false; error: string }> {
    const { data: claimsData, error: claimsError } = await getSupabaseServerClaims()
    if (claimsError || !claimsData?.claims?.sub) {
        return { success: false, error: "Not authenticated" }
    }
    const userId = claimsData.claims.sub

    const supabase = await createClient()

    try {
        // 1. Insert vrp_optimization
        const { data: optimization, error: optError } = await supabase
            .from("vrp_optimization")
            .insert({
                provider: "manual",
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
                duration: params.orsRoute.routes?.[0]?.summary?.duration ?? 0,
            })
            .select("id")
            .single()

        if (solError) throw new Error(`vrp_solution insert: ${solError.message}`)

        // 3. Insert vrp_route
        const { data: route, error: routeError } = await supabase
            .from("vrp_route")
            .insert({
                solution_id: solution.id,
                duration: params.orsRoute.routes?.[0]?.summary?.duration ?? 0,
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
        // ORS segments: waypoints[i] → waypoints[i+1] gives index ranges
        const orsRoute = params.orsRoute.routes?.[0]
        const waypoints = orsRoute?.way_points ?? []
        // arrival seconds per stop index come from "segments[i].steps"
        // We use the ORS duration per waypoint segment to derive arrival
        const segmentDurations: number[] = (orsRoute?.segments ?? []).map((s: RouteSegment) => s.duration ?? 0)

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
