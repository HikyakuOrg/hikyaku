"use server"

import type { DrivingLimitsSummaryDto } from "@/lib/api"
import { buildApiContext } from "./api-client"

/**
 * Whether automatic assignment is applying driving limits right now.
 *
 * DRIVING_LIMITS is a process-wide switch on hikyaku-api, and a profile a
 * dispatcher has saved does nothing to planning while it is off. Showing
 * "182 km of 250 km" without saying so would present a cap nobody is enforcing.
 * The diagnostics summary is the only response that reports the switch, so it
 * is asked for the shortest window it accepts.
 *
 * Null when the answer is unavailable (no session, API unreachable, or no
 * `shifts.view`), which callers must not read as either on or off.
 */
export async function fetchDrivingLimitsEnforced(): Promise<boolean | null> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return null

    try {
        const res = await fetch(`${ctx.apiUrl}/api/v1/dispatch/driving-limits/summary?days=1`, {
            headers: ctx.headers,
            cache: "no-store",
        })
        if (!res.ok) return null

        const summary: DrivingLimitsSummaryDto = await res.json()
        return summary.drivingLimitsEnabled
    } catch {
        return null
    }
}
