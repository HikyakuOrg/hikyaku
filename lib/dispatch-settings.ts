import type { Tables, TablesInsert } from "@/lib/supabase/supabase"

/**
 * Dispatch settings: how automatic assignment behaves for one organisation.
 *
 * Stored in `organisation_dispatch_settings`, at most one row per organisation,
 * written from Settings > Dispatch and read by hikyaku-api at the start of every
 * assignment (src/dispatch/dispatch-settings.ts there). They used to be the
 * API's ASSIGNMENT_MODE, LOAD_SPREAD_ENABLED and SERVICE_AREA_MATCHING
 * environment variables, which every organisation shared.
 */

/**
 * `instant` places a package on a driver's shift as soon as it is created.
 * `manual` leaves new packages pending until a dispatcher assigns them. Mirrors
 * the CHECK constraint on `organisation_dispatch_settings.assignment_mode`.
 */
export type AssignmentMode = "instant" | "manual"

export type DispatchSettings = {
    assignmentMode: AssignmentMode
    loadSpreadEnabled: boolean
    serviceAreaMatching: boolean
}

/**
 * What an organisation that has never saved its settings runs on. Must match
 * the column defaults in hikyaku-api's
 * 1789693200000-create_organisation_dispatch_settings.sql and
 * DEFAULT_DISPATCH_SETTINGS in its src/dispatch/dispatch-settings.ts, or this
 * page would show one thing while the API dispatches by another.
 */
export const DEFAULT_DISPATCH_SETTINGS: DispatchSettings = {
    assignmentMode: "instant",
    loadSpreadEnabled: true,
    serviceAreaMatching: false,
}

type DispatchSettingsRow = Pick<
    Tables<"organisation_dispatch_settings">,
    "assignment_mode" | "load_spread_enabled" | "service_area_matching"
>

/**
 * A row as the page shows it; no row means the defaults. Anything but `manual`
 * reads as `instant`, the same way the API reads it.
 */
export function toDispatchSettings(row: DispatchSettingsRow | null): DispatchSettings {
    if (!row) return { ...DEFAULT_DISPATCH_SETTINGS }
    return {
        assignmentMode: row.assignment_mode === "manual" ? "manual" : "instant",
        loadSpreadEnabled: row.load_spread_enabled,
        serviceAreaMatching: row.service_area_matching,
    }
}

/** Every setting on every save, so a save always writes the page as shown rather than merging into the row. */
export function toDispatchSettingsRow(
    organisationId: string,
    settings: DispatchSettings,
): TablesInsert<"organisation_dispatch_settings"> {
    return {
        organisation_id: organisationId,
        assignment_mode: settings.assignmentMode,
        load_spread_enabled: settings.loadSpreadEnabled,
        service_area_matching: settings.serviceAreaMatching,
    }
}

export function sameDispatchSettings(a: DispatchSettings, b: DispatchSettings): boolean {
    return (
        a.assignmentMode === b.assignmentMode &&
        a.loadSpreadEnabled === b.loadSpreadEnabled &&
        a.serviceAreaMatching === b.serviceAreaMatching
    )
}
