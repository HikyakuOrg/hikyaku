import { useSyncExternalStore } from "react"

// Nothing to subscribe to: the value only ever flips once, from the server
// snapshot during hydration to the client snapshot right after it.
function subscribe() {
    return () => {}
}

/**
 * False during SSR and hydration, true once the component is running in the
 * browser. Use it to hold back output that depends on the viewer's locale or
 * time zone, which the server cannot know, so hydration never sees a mismatch.
 */
export function useHydrated(): boolean {
    return useSyncExternalStore(subscribe, () => true, () => false)
}
