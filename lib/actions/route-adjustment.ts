"use server"

import { revalidatePath } from "next/cache"
import { getSupabaseServerClaims } from "@/lib/supabase/server"
import { createClient } from "@/lib/supabase/server"
import { getShiftMeta } from "@/lib/supabase/db-server"
import { getOrgSlug } from "./api-client"
import { removePackageFromShift } from "./shift"

/** Statuses that are immovable/undeletable */
const LOCKED_STATUSES = ["DELIVERED", "IN_TRANSIT"] as const

export interface AdjustRouteParams {
    routeId: string
    /** Full ordered list of step IDs representing the desired order after adjustment (must include start, all remaining jobs, and end). */
    orderedStepIds: number[]
    /** Step IDs to delete (only PENDING/FAILED jobs below the lock boundary). */
    deletedStepIds: number[]
}

export type AdjustRouteResult =
    | { success: true }
    | { success: false; error: string }

export async function adjustRoute(params: AdjustRouteParams): Promise<AdjustRouteResult> {
    // 1. Authenticate
    const { data: claimsData, error: claimsError } = await getSupabaseServerClaims()
    if (claimsError || !claimsData?.claims?.sub) {
        return { success: false, error: "Not authenticated" }
    }

    const { routeId, orderedStepIds, deletedStepIds } = params

    // 2. Fetch current route steps (authenticated client – respects read RLS)
    const supabase = await createClient()
    const { data: currentSteps, error: fetchError } = await supabase
        .from("vrp_route_step")
        .select(`
            id,
            step_index,
            type,
            package_id,
            package_assignment(
                package_id,
                package:packages_with_latest_status!package_assignment_package_id_fkey(
                    current_status
                )
            )
        `)
        .eq("route_id", routeId)
        .order("step_index", { ascending: true })

    if (fetchError) {
        return { success: false, error: `Failed to fetch route steps: ${fetchError.message}` }
    }
    if (!currentSteps || currentSteps.length === 0) {
        return { success: false, error: "Route not found" }
    }

    // 3. Compute the lock boundary: highest step_index of any JOB with a locked status
    const lockBoundaryStepIndex = (() => {
        const locked = currentSteps.filter(s => {
            const status = s.package_assignment?.package?.current_status as string | undefined
            return s.type === "job" && LOCKED_STATUSES.includes(status as never)
        })
        return locked.length > 0 ? Math.max(...locked.map(s => s.step_index)) : -1
    })()

    // Helper: get the status of a step
    const statusOf = (s: (typeof currentSteps)[number]) =>
        (s.package_assignment?.package?.current_status as string | undefined) ?? null

    // 4. Validate each deletion
    for (const stepId of deletedStepIds) {
        const step = currentSteps.find(s => s.id === stepId)
        if (!step) {
            return { success: false, error: `Step ${stepId} not found in this route` }
        }
        if (step.type !== "job") {
            return { success: false, error: "Cannot delete start or end steps" }
        }
        const status = statusOf(step)
        if (status && LOCKED_STATUSES.includes(status as never)) {
            return { success: false, error: `Cannot delete a package with status ${status}` }
        }
        if (step.step_index <= lockBoundaryStepIndex) {
            return {
                success: false,
                error: "Cannot delete a package that is above the current delivery position",
            }
        }
    }

    // 5. Validate the new ordering
    const stepMap = new Map(currentSteps.map(s => [s.id, s]))

    // The orderedStepIds must contain every non-deleted step exactly once
    const expectedIds = new Set(
        currentSteps.filter(s => !deletedStepIds.includes(s.id)).map(s => s.id)
    )
    if (orderedStepIds.length !== expectedIds.size) {
        return { success: false, error: "Ordered step list has wrong length" }
    }
    for (const id of orderedStepIds) {
        if (!expectedIds.has(id)) {
            return { success: false, error: `Step ${id} is not part of this route or was already deleted` }
        }
    }

    // Validate start is still first, end is still last
    const startStep = currentSteps.find(s => s.type === "start")
    const endStep = currentSteps.find(s => s.type === "end")
    if (startStep && orderedStepIds[0] !== startStep.id) {
        return { success: false, error: "Start step must remain first" }
    }
    if (endStep && orderedStepIds[orderedStepIds.length - 1] !== endStep.id) {
        return { success: false, error: "End step must remain last" }
    }

    // Validate that the relative order of locked steps is unchanged
    const originalLockedJobOrder = currentSteps
        .filter(s => s.type === "job" && LOCKED_STATUSES.includes(statusOf(s) as never))
        .map(s => s.id)
    const newLockedJobOrder = orderedStepIds.filter(id => {
        const s = stepMap.get(id)
        return s?.type === "job" && LOCKED_STATUSES.includes(statusOf(s) as never)
    })
    if (JSON.stringify(originalLockedJobOrder) !== JSON.stringify(newLockedJobOrder)) {
        return { success: false, error: "Cannot reorder delivered or in-transit packages" }
    }

    // Validate no editable step appears before the lock boundary position
    // Find the position of the last locked job in orderedStepIds
    let lastLockedPosition = -1
    for (let i = 0; i < orderedStepIds.length; i++) {
        const s = stepMap.get(orderedStepIds[i])
        if (s?.type === "job" && LOCKED_STATUSES.includes(statusOf(s) as never)) {
            lastLockedPosition = i
        }
    }
    for (let i = 0; i < lastLockedPosition; i++) {
        const s = stepMap.get(orderedStepIds[i])
        if (!s) continue
        if (s.type === "job" && !LOCKED_STATUSES.includes(statusOf(s) as never)) {
            return {
                success: false,
                error: "Cannot move a pending/failed package above a delivered or in-transit position",
            }
        }
    }

    // 6. Execute the changes.
    try {
        // 6a. Removals go to the API, which drops the assignment, rewrites the
        // route's steps without the package and puts it back to PENDING — all in
        // one transaction. Doing that from here took three round trips per
        // package with nothing holding them together, and its PENDING write was
        // silently swallowed by the timeline's unique constraint (dropped in
        // AllowStatusRevisits), so a removed package showed ASSIGNED forever.
        if (deletedStepIds.length > 0) {
            const shift = await getShiftMeta(routeId)
            if (!shift) {
                throw new Error("Could not resolve the shift this route belongs to")
            }

            for (const stepId of deletedStepIds) {
                const step = currentSteps.find(s => s.id === stepId)
                // Validation above already rejected non-job steps, and every job
                // step carries a package.
                if (!step?.package_id) continue

                const removal = await removePackageFromShift(shift.optimisation_id, step.package_id)
                if (!removal.success) {
                    throw new Error(`Failed to remove package ${step.package_id}: ${removal.error}`)
                }
            }
        }

        // 6b. Reorder whatever is left.
        //
        // There is no reorder endpoint — the API rewrites step order as a result
        // of adding or removing a package, not as an operation of its own — so
        // this stays a direct write. Removal already compacted the indexes, so
        // it runs only when the dispatcher actually dragged something, which is
        // also why the step ids have to be re-read: the API deletes and
        // re-inserts the surviving steps, giving them new ids.
        const desiredPackageOrder = orderedStepIds
            .map(id => stepMap.get(id))
            .filter(s => s?.type === "job")
            .map(s => s?.package_id)
            .filter((id): id is string => !!id)

        const { data: liveSteps, error: reloadError } = await supabase
            .from("vrp_route_step")
            .select("id, step_index, type, package_id")
            .eq("route_id", routeId)
            .order("step_index", { ascending: true })

        if (reloadError) {
            throw new Error(`Failed to re-read route steps: ${reloadError.message}`)
        }

        const liveJobsByPackage = new Map(
            (liveSteps ?? [])
                .filter(s => s.type === "job" && s.package_id)
                .map(s => [s.package_id as string, s])
        )
        const liveStart = (liveSteps ?? []).find(s => s.type === "start")
        const liveEnd = (liveSteps ?? []).find(s => s.type === "end")

        const target = [
            ...(liveStart ? [liveStart] : []),
            ...desiredPackageOrder
                .map(packageId => liveJobsByPackage.get(packageId))
                .filter((s): s is NonNullable<typeof s> => !!s),
            ...(liveEnd ? [liveEnd] : []),
        ]

        const alreadyOrdered = target.every((step, index) => step.step_index === index)
        if (!alreadyOrdered) {
            // Two phases, because UNIQUE(route_id, step_index) rejects any
            // intermediate state where two steps share an index. Negating by id
            // parks every row somewhere no positive index can collide with.
            for (const step of target) {
                const { error } = await supabase
                    .from("vrp_route_step")
                    .update({ step_index: -step.id })
                    .eq("id", step.id)
                if (error) {
                    throw new Error(`Failed to negate step_index for step ${step.id}: ${error.message}`)
                }
            }

            for (let newIndex = 0; newIndex < target.length; newIndex++) {
                const step = target[newIndex]
                const { error } = await supabase
                    .from("vrp_route_step")
                    .update({ step_index: newIndex })
                    .eq("id", step.id)
                if (error) {
                    throw new Error(`Failed to update step_index for step ${step.id}: ${error.message}`)
                }
            }
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unexpected error during route adjustment"
        return { success: false, error: message }
    }

    const slug = await getOrgSlug()
    if (slug) revalidatePath(`/orgs/${slug}/dashboard/driver-shifts/${routeId}`)
    return { success: true }
}
