/**
 * Shift status. The column is text with a CHECK, so the generated types say
 * `string`; this union is kept here by hand.
 *
 * Automatic assignment uses only `planned` shifts, until 15 minutes before
 * `scheduled_start`.
 */
export type VrpOptimizationStatus =
    | "planned"
    | "dispatched"
    | "completed"
    | "cancelled"
