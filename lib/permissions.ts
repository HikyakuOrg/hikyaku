import { PostgrestError } from "@supabase/supabase-js"

/**
 * Permission strings seeded into the `app_permission` table. Add a member here
 * when a screen starts gating on a new one, so callers get a checked union
 * instead of a free-form string that silently never matches.
 */
export type OrgPermission = "service_areas.edit" | "drivers.update" | "organisation.edit"

/** Drives the insert/update/delete RLS policies on `service_areas`. */
export const SERVICE_AREAS_EDIT = "service_areas.edit" satisfies OrgPermission

/**
 * Drives the write RLS policies on `driving_limit_profile`, and the update
 * policy on `drivers`, which is where each driver's profile is pointed at. One
 * permission for both halves on purpose: authoring a profile and assigning a
 * driver to it are the same dispatcher job.
 */
export const DRIVERS_UPDATE = "drivers.update" satisfies OrgPermission

/**
 * Drives the update RLS policy on `organisations`, which carries the default
 * driving limit profile. The organisation's creator passes that policy too, and
 * is granted every seeded permission when the organisation is made, so checking
 * the permission alone covers both.
 */
export const ORGANISATION_EDIT = "organisation.edit" satisfies OrgPermission

/**
 * What each permission lets somebody change, and what a write matching zero
 * rows may have run into, so the sentences below name the right thing.
 */
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

/**
 * Postgres `insufficient_privilege`. PostgREST surfaces it for both a plain
 * table-level denial and an INSERT that fails an RLS WITH CHECK clause.
 */
const INSUFFICIENT_PRIVILEGE = "42501"

/**
 * PostgREST "no (or multiple) rows returned". An UPDATE the RLS USING clause
 * filters out is not an error in Postgres, it simply matches zero rows, so a
 * refused update surfaces here rather than as 42501 whenever the query ends in
 * `.select().single()`.
 */
const NO_ROWS_RETURNED = "PGRST116"

/**
 * Postgres `unique_violation`. Names are unique per organisation rather than
 * globally (`service_areas.name`, and `driving_limit_profile.name` among
 * profiles that are not deleted), so this means the caller's own org already
 * has one by that name. The same name in another org is not a conflict.
 */
const UNIQUE_VIOLATION = "23505"

/**
 * The stated reason shown next to a control we have disabled. Keep it in one
 * place so the tooltip, the inline note and the failed-write toast all name the
 * same permission.
 */
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

/**
 * Whether a failed write collided with a unique index rather than with RLS.
 * Callers use it to put the failure on the offending field instead of in a
 * toast, since a name clash is something the dispatcher can fix in place.
 */
export function isUniqueViolationError(error: unknown): boolean {
    return asPostgrestError(error)?.code === UNIQUE_VIOLATION
}

/**
 * Turn a failed write into a sentence a dispatcher can act on. Defense in depth
 * only: RLS is the real boundary and hiding a control never relaxes it, so this
 * exists purely so a write that slips past the UI gate (a permission revoked
 * mid-session, say) does not surface as a raw PostgREST string.
 */
export function describeWriteError(
    error: unknown,
    permission: OrgPermission,
    fallback: string,
): string {
    if (isPermissionDeniedError(error)) {
        return permissionRequiredMessage(permission)
    }

    // A refused UPDATE matches zero rows instead of raising, so this code is
    // ambiguous: the row was either removed or is now out of reach. Say both
    // rather than assert the wrong one.
    if (asPostgrestError(error)?.code === NO_ROWS_RETURNED) {
        return `Nothing was saved. ${PERMISSION_SUBJECTS[permission].missingRow}, or your "${permission}" permission may have been revoked. Reload the page and try again.`
    }

    if (error instanceof Error) return error.message
    return fallback
}
