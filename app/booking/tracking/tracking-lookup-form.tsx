"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface TrackingLookupFormProps {
    defaultValue?: string
    /** True when a previous lookup returned no matching delivery. */
    notFound?: boolean
}

export function TrackingLookupForm({ defaultValue = "", notFound = false }: TrackingLookupFormProps) {
    const router = useRouter()
    const [value, setValue] = useState(defaultValue)
    const [pending, setPending] = useState(false)

    function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        const reference = value.trim()
        if (!reference) return
        setPending(true)
        router.push(`/booking/tracking?reference=${encodeURIComponent(reference)}`)
    }

    return (
        <div className="mx-auto flex min-h-[60svh] max-w-md flex-col justify-center">
            <div className="space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">Track your delivery</h1>
                <p className="text-base text-muted-foreground">
                    Enter your tracking number to see its latest status.
                </p>
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-3">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Tracking number"
                        autoFocus
                        autoComplete="off"
                        aria-label="Tracking number"
                        className="h-11 pl-9 text-base"
                    />
                </div>

                {notFound && (
                    <p className="text-sm text-red-600">
                        We couldn&apos;t find a delivery with that tracking number. Check it and try again.
                    </p>
                )}

                <Button type="submit" disabled={pending || !value.trim()} className="h-11 w-full">
                    Track delivery
                </Button>
            </form>
        </div>
    )
}
