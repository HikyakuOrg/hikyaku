import type { SupabaseClient } from "@supabase/supabase-js"

import { resolveDrivingLimits, type DrivingLimits, type DrivingLimitValues } from "@/lib/driving-limits"

import type { Database } from "./supabase"

export type DrivingLimitsReadResult =
    | { status: "ok"; limitsByDriver: Map<string, DrivingLimits> }
    | { status: "error" }

/**
 * Effective driving limits for a set of drivers, with every requested id
 * present in the result.
 *
 * Takes a client rather than making one, so the server-rendered shift page and
 * the browser-side shift calendar share this one read. Three plain queries: the
 * organisation's default pointer, each driver's pointer, and the live profiles
 * those point at. A soft-deleted profile is left out of the last one, so a
 * driver or an organisation still pointing at it falls through to the next link
 * in the chain, exactly as hikyaku-api's resolver query does.
 *
 * A driver row the caller cannot read (no `drivers.view`) resolves on the
 * organisation default alone, the same answer the API gives an id it cannot
 * find in the organisation.
 *
 * A failed read is reported as such rather than as "no limits", which would
 * tell a dispatcher an over-limit shift is fine.
 */
export async function readDrivingLimitsForDrivers(
    supabase: SupabaseClient<Database>,
    organisationSlug: string,
    driverIds: string[],
): Promise<DrivingLimitsReadResult> {
    const ids = Array.from(new Set(driverIds))

    if (ids.length === 0) {
        return { status: "ok", limitsByDriver: new Map() }
    }

    const organisationResult = await supabase
        .from("organisations")
        .select("id, default_driving_limit_profile_id")
        .eq("slug", organisationSlug)
        .maybeSingle()

    if (organisationResult.error || !organisationResult.data) {
        console.error(organisationResult.error ?? `No organisation "${organisationSlug}" is readable.`)
        return { status: "error" }
    }

    // Scoped to the organisation, as the API's join is: RLS also lets a user read
    // their own driver row in another organisation, and that row's profile is not
    // this organisation's to resolve.
    const driversResult = await supabase
        .from("drivers")
        .select("id, driving_limit_profile_id")
        .eq("organisation_id", organisationResult.data.id)
        .in("id", ids)

    if (driversResult.error) {
        console.error(driversResult.error)
        return { status: "error" }
    }

    const defaultProfileId = organisationResult.data.default_driving_limit_profile_id
    const profileIdByDriver = new Map(
        (driversResult.data ?? []).map((row) => [row.id, row.driving_limit_profile_id])
    )

    const profileIds = Array.from(
        new Set([defaultProfileId, ...profileIdByDriver.values()].filter((id): id is string => Boolean(id)))
    )

    const profiles = new Map<string, DrivingLimitValues>()

    if (profileIds.length > 0) {
        const { data, error } = await supabase
            .from("driving_limit_profile")
            .select("id, max_working_seconds, max_driving_seconds, max_distance_m, max_stops")
            .in("id", profileIds)
            .eq("is_deleted", false)

        if (error) {
            console.error(error)
            return { status: "error" }
        }

        for (const profile of data ?? []) {
            profiles.set(profile.id, profile)
        }
    }

    const organisationDefault = defaultProfileId ? profiles.get(defaultProfileId) ?? null : null

    return {
        status: "ok",
        limitsByDriver: new Map(
            ids.map((driverId) => {
                const profileId = profileIdByDriver.get(driverId)
                const driverProfile = profileId ? profiles.get(profileId) ?? null : null
                return [driverId, resolveDrivingLimits(driverProfile, organisationDefault)]
            })
        ),
    }
}
