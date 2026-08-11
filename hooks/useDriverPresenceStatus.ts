import { useEffect, useState } from "react"
import { createLazyClient } from "@/lib/supabase/client"

type DriverPresencePayload = {
    online_at?: string
    [key: string]: unknown
}

type DriverPresenceStatus = {
    isOnline: boolean
    isLoading: boolean
    onlineCount: number
}

const supabase = createLazyClient()

function emptyStatus(isLoading: boolean): DriverPresenceStatus {
    return {
        isOnline: false,
        isLoading,
        onlineCount: 0,
    }
}

export function useDriverPresenceStatus(driverId: string) {
    // Keyed by `driverId` so presence for a previous driver is never reported as this
    // one's, which lets the "no driver"/"connecting" states be derived during render
    // rather than reset synchronously inside the subscription effect.
    const [presence, setPresence] = useState<{ driverId: string; status: DriverPresenceStatus } | null>(null)

    const status = !driverId
        ? emptyStatus(false)
        : presence?.driverId === driverId
            ? presence.status
            : emptyStatus(true)

    useEffect(() => {
        if (!driverId) {
            return
        }

        const setStatus = (next: DriverPresenceStatus) => setPresence({ driverId, status: next })

        const channel = supabase.channel(`driver-presence:${driverId}`)

        const syncPresenceState = () => {
            const presenceState = channel.presenceState<DriverPresencePayload>()
            const activePresences = Object.values(presenceState).flat()

            setStatus({
                isOnline: activePresences.length > 0,
                isLoading: false,
                onlineCount: activePresences.length,
            })
        }

        channel
            .on("presence", { event: "sync" }, syncPresenceState)
            .on("presence", { event: "join" }, syncPresenceState)
            .on("presence", { event: "leave" }, syncPresenceState)
            .subscribe((subscribeStatus) => {
                if (subscribeStatus === "SUBSCRIBED") {
                    syncPresenceState()
                    return
                }

                if (
                    subscribeStatus === "CHANNEL_ERROR" ||
                    subscribeStatus === "TIMED_OUT" ||
                    subscribeStatus === "CLOSED"
                ) {
                    setStatus(emptyStatus(false))
                }
            })

        return () => {
            void supabase.removeChannel(channel)
        }
    }, [driverId])

    return status
}