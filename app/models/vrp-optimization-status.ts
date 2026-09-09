/**
 * Shift lifecycle, from `vrp_optimization_status_check` (migration
 * AddShiftLifecycleColumns). The column is `text` with a CHECK rather than a
 * Postgres enum, so the generated `lib/supabase/supabase.ts` types it as plain
 * `string` — this union lives here instead, hand-written, where a
 * regeneration of that file cannot destroy it.
 *
 * `planned` is the only state open to automatic assignment, and only until 15
 * minutes before `scheduled_start`.
 */
export type VrpOptimizationStatus =
    | "planned"
    | "dispatched"
    | "completed"
    | "cancelled"
