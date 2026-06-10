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
    const [status, setStatus] = useState<DriverPresenceStatus>(emptyStatus(Boolean(driverId)))

    useEffect(() => {
        if (!driverId) {
            setStatus(emptyStatus(false))
            return
        }

        setStatus(emptyStatus(true))

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