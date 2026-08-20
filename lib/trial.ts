/**
 * Presentation helpers for the trial deadline. The *decisions* — whether a trial
 * is over, how many days are left — are made server-side by hikyaku-api and
 * arrive on `TrialStatusDto`; nothing here re-derives them, so the dashboard can
 * never disagree with the guard that actually blocks requests.
 */

/**
 * Render a trial deadline in the viewer's locale, date and time.
 *
 * The time matters: a trial ending "22 August" tells a user nothing about
 * whether they have the rest of that day, and the deadline is an exact instant
 * seven days on from signup rather than midnight.
 */
export function formatTrialEnd(isoDate: string): string {
    return new Date(isoDate).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    })
}

/** "6 days left" / "1 day left" / "Ends today", for the sidebar countdown. */
export function formatDaysRemaining(days: number): string {
    if (days <= 0) return "Ends today"
    return days === 1 ? "1 day left" : `${days} days left`
}
