/**
 * Window event that tells the calendar to reload shifts, for example after an
 * optimisation. The button and the calendar share no state, and
 * `router.refresh()` does not reload client data.
 */
export const SHIFTS_REFRESH_EVENT = "shifts:refresh"
