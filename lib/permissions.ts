import { PostgrestError } from "@supabase/supabase-js"

/**
 * Permission strings seeded into the `app_permission` table. Add a member here
 * when a screen starts gating on a new one, so callers get a checked union
 * instead of a free-form string that silently never matches.
 */
export type OrgPermission = "service_areas.edit"

/** Drives the insert/update/delete RLS policies on `service_areas`. */
export const SERVICE_AREAS_EDIT = "service_areas.edit" satisfies OrgPermission

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
 * The stated reason shown next to a control we have disabled. Keep it in one
 * place so the tooltip, the inline note and the failed-write toast all name the
 * same permission.
 */
export function permissionRequiredMessage(permission: OrgPermission): string {
    return `You do not have permission to change service areas. Ask an organisation admin for the "${permission}" permission.`
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
        return `Nothing was saved. The service area may have been deleted, or your "${permission}" permission may have been revoked. Reload the page and try again.`
    }

    if (error instanceof Error) return error.message
    return fallback
}
