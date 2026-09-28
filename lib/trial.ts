/**
 * Display helpers for the trial deadline. hikyaku-api decides whether a trial
 * is over (`TrialStatusDto`); nothing here calculates it again.
 */

/** The trial end in the viewer's locale. Includes the time: the trial ends at an exact moment. */
export function formatTrialEnd(isoDate: string): string {
    return new Date(isoDate).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    })
}

/** "6 days left", "1 day left" or "Ends today", for the sidebar countdown. */
export function formatDaysRemaining(days: number): string {
    if (days <= 0) return "Ends today"
    return days === 1 ? "1 day left" : `${days} days left`
}
