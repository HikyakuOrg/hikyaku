"use server"

import { revalidatePath } from "next/cache"
import { getSupabaseServerClaims } from "@/lib/supabase/server"
import { createClient } from "@/lib/supabase/server"
import { getShiftMeta } from "@/lib/supabase/db-server"
import { getOrgSlug } from "./api-client"
import { removePackageFromShift } from "./shift"

/** Packages with these statuses cannot be moved or removed. */
const LOCKED_STATUSES = ["DELIVERED", "IN_TRANSIT"] as const

export interface AdjustRouteParams {
    routeId: string
    /** All step IDs in the new order: start, remaining jobs, end. */
    orderedStepIds: number[]
    /** Step IDs to remove (PENDING or FAILED jobs after the last locked job). */
    deletedStepIds: number[]
}

export type AdjustRouteResult =
    | { success: true }
    | { success: false; error: string }

export async function adjustRoute(params: AdjustRouteParams): Promise<AdjustRouteResult> {
    // 1. Authenticate
    const { data: claimsData, error: claimsError } = await getSupabaseServerClaims()
    if (claimsError || !claimsData?.claims?.sub) {
        return { success: false, error: "You are not signed in." }
    }

    const { routeId, orderedStepIds, deletedStepIds } = params

    // 2. Fetch current route steps (RLS applies)
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
        return { success: false, error: `Could not load the route stops: ${fetchError.message}` }
    }
    if (!currentSteps || currentSteps.length === 0) {
        return { success: false, error: "Could not find this route." }
    }

    // 3. Lock boundary: the highest step_index of a job with a locked status
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
            return { success: false, error: "You cannot remove the start or end of the route." }
        }
        const status = statusOf(step)
        if (status && LOCKED_STATUSES.includes(status as never)) {
            return { success: false, error: `You cannot remove a stop with status ${status}.` }
        }
        if (step.step_index <= lockBoundaryStepIndex) {
            return {
                success: false,
                error: "You cannot remove a stop before the driver's current position.",
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
        return { success: false, error: "The stops changed. Reload the page and try again." }
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
        return { success: false, error: "The start must stay first." }
    }
    if (endStep && orderedStepIds[orderedStepIds.length - 1] !== endStep.id) {
        return { success: false, error: "The end must stay last." }
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
        return { success: false, error: "You cannot move delivered or in-transit stops." }
    }

    // No editable job can come before the last locked job
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
                error: "You cannot move a stop before a delivered or in-transit stop.",
            }
        }
    }

    // 6. Execute the changes.
    try {
        // 6a. The API removes each package in one transaction.
        if (deletedStepIds.length > 0) {
            const shift = await getShiftMeta(routeId)
            if (!shift) {
                throw new Error("Could not resolve the shift this route belongs to")
            }

            for (const stepId of deletedStepIds) {
                const step = currentSteps.find(s => s.id === stepId)
                // Only job steps get here, and each has a package.
                if (!step?.package_id) continue

                const removal = await removePackageFromShift(shift.optimisation_id, step.package_id)
                if (!removal.success) {
                    throw new Error(`Could not remove a package from the route: ${removal.error}`)
                }
            }
        }

        // 6b. Reorder the rest. The API has no reorder endpoint, so write
        // directly. Re-read the steps first: removal gives them new ids.
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
            throw new Error(`Could not reload the route stops: ${reloadError.message}`)
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
            // Two passes, because UNIQUE(route_id, step_index) rejects two
            // steps with the same index. First move each step to -id.
            for (const step of target) {
                const { error } = await supabase
                    .from("vrp_route_step")
                    .update({ step_index: -step.id })
                    .eq("id", step.id)
                if (error) {
                    throw new Error(`Could not save the new stop order: ${error.message}`)
                }
            }

            for (let newIndex = 0; newIndex < target.length; newIndex++) {
                const step = target[newIndex]
                const { error } = await supabase
                    .from("vrp_route_step")
                    .update({ step_index: newIndex })
                    .eq("id", step.id)
                if (error) {
                    throw new Error(`Could not save the new stop order: ${error.message}`)
                }
            }
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Could not change the route. Try again."
        return { success: false, error: message }
    }

    const slug = await getOrgSlug()
    if (slug) revalidatePath(`/orgs/${slug}/dashboard/driver-shifts/${routeId}`)
    return { success: true }
}
