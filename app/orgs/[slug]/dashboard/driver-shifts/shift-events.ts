/**
 * Signal fired when driver shifts change (e.g. an on-demand optimisation run
 * completes) so the calendar refetches its data.
 *
 * The Optimise-routes button and the calendar are two independent client
 * islands with no shared state. `router.refresh()` only re-runs server
 * components, so it cannot update the calendar — the calendar fetches its
 * shifts client-side in a `useEffect`. This window event bridges the two:
 * the button dispatches it on completion, the calendar listens and refetches.
 */
export const SHIFTS_REFRESH_EVENT = "shifts:refresh"
