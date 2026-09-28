import type { Tables, TablesInsert } from "@/lib/supabase/supabase"

/**
 * Dispatch settings: how automatic assignment works for one organisation.
 * One row in `organisation_dispatch_settings`, set in Settings > Dispatch and
 * read by hikyaku-api for every assignment.
 */

/**
 * `instant` assigns a package when it is created. `manual` keeps new packages
 * pending until a dispatcher assigns them.
 */
export type AssignmentMode = "instant" | "manual"

export type DispatchSettings = {
    assignmentMode: AssignmentMode
    loadSpreadEnabled: boolean
    serviceAreaMatching: boolean
}

/**
 * Settings before the first save. Keep in sync with the column defaults and
 * DEFAULT_DISPATCH_SETTINGS in hikyaku-api.
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

/** A row as settings. No row means the defaults. Anything but `manual` is `instant`, as in the API. */
export function toDispatchSettings(row: DispatchSettingsRow | null): DispatchSettings {
    if (!row) return { ...DEFAULT_DISPATCH_SETTINGS }
    return {
        assignmentMode: row.assignment_mode === "manual" ? "manual" : "instant",
        loadSpreadEnabled: row.load_spread_enabled,
        serviceAreaMatching: row.service_area_matching,
    }
}

/** All settings, so a save writes exactly what the page shows. */
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
