import { PostgrestError } from "@supabase/supabase-js"

/** Permissions from the `app_permission` table. Add one here when a screen needs it. */
export type OrgPermission = "service_areas.edit" | "drivers.update" | "organisation.edit"

/** Needed to insert, update and delete `service_areas` (RLS). */
export const SERVICE_AREAS_EDIT = "service_areas.edit" satisfies OrgPermission

/** Needed to write `driving_limit_profile` and to update `drivers` (RLS). */
export const DRIVERS_UPDATE = "drivers.update" satisfies OrgPermission

/**
 * Needed to update `organisations` and `organisation_dispatch_settings` (RLS).
 * The creator of an organisation gets every permission.
 */
export const ORGANISATION_EDIT = "organisation.edit" satisfies OrgPermission

/** Text for the error messages below. */
const PERMISSION_SUBJECTS: Record<OrgPermission, { change: string; missingRow: string }> = {
    "service_areas.edit": {
        change: "change service areas",
        missingRow: "The service area may have been deleted",
    },
    "drivers.update": {
        change: "change drivers or driving limits",
        missingRow: "The driver or driving limit profile may have been deleted",
    },
    "organisation.edit": {
        change: "change organisation settings",
        missingRow: "The organisation may no longer be reachable",
    },
}

/** Postgres `insufficient_privilege`: a table denial or an RLS WITH CHECK failure. */
const INSUFFICIENT_PRIVILEGE = "42501"

/**
 * PostgREST "no rows returned". An UPDATE that RLS refuses matches zero rows,
 * so with `.select().single()` it gives this code, not 42501.
 */
const NO_ROWS_RETURNED = "PGRST116"

/** Postgres `unique_violation`. Names are unique per organisation. */
const UNIQUE_VIOLATION = "23505"

/** The reason shown next to a disabled control and in failed-save messages. */
export function permissionRequiredMessage(permission: OrgPermission): string {
    return `You do not have permission to ${PERMISSION_SUBJECTS[permission].change}. Ask an organisation admin for the "${permission}" permission.`
}

function asPostgrestError(error: unknown): PostgrestError | null {
    if (error instanceof PostgrestError) return error
    if (typeof error === "object" && error !== null && "code" in error && "message" in error) {
        return error as PostgrestError
    }
    return null
}

/** Whether a failed write was refused by RLS rather than by validation. */
export function isPermissionDeniedError(error: unknown): boolean {
    const postgrest = asPostgrestError(error)
    if (!postgrest) return false
    if (postgrest.code === INSUFFICIENT_PRIVILEGE) return true
    return /row-level security|permission denied/i.test(postgrest.message ?? "")
}

/** Whether a failed write hit a unique index. Callers show this on the field. */
export function isUniqueViolationError(error: unknown): boolean {
    return asPostgrestError(error)?.code === UNIQUE_VIOLATION
}

/**
 * A failed write as a message a dispatcher can act on, for example when a
 * permission is removed during a session.
 */
export function describeWriteError(
    error: unknown,
    permission: OrgPermission,
    fallback: string,
): string {
    if (isPermissionDeniedError(error)) {
        return permissionRequiredMessage(permission)
    }

    // Zero rows: the row was deleted, or the permission was removed.
    if (asPostgrestError(error)?.code === NO_ROWS_RETURNED) {
        return `Nothing was saved. ${PERMISSION_SUBJECTS[permission].missingRow}, or your "${permission}" permission may have been revoked. Reload the page and try again.`
    }

    if (error instanceof Error) return error.message
    return fallback
}
