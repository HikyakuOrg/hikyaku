import { Suspense } from "react"
import { headers } from "next/headers"
import { notFound } from "next/navigation"

import { getTrackingDetails } from "@/lib/supabase/db-server"
import { Skeleton } from "@/components/ui/skeleton"
import { TrackingLookupForm } from "./tracking-lookup-form"
import { TrackingView } from "./tracking-view"

export default function TrackingPage({
    searchParams,
}: {
    searchParams: Promise<{ reference?: string }>
}) {
    // Reading the x-org-slug header and the reference query is request-time work,
    // so it must live inside <Suspense> (cacheComponents requirement).
    return (
        <Suspense fallback={<TrackingSkeleton />}>
            <TrackingContent searchParams={searchParams} />
        </Suspense>
    )
}

async function TrackingContent({
    searchParams,
}: {
    searchParams: Promise<{ reference?: string }>
}) {
    // The active tenant is resolved by middleware from the subdomain and exposed
    // as x-org-slug. Tracking is per-organisation; without a slug there is no org.
    const slug = (await headers()).get("x-org-slug")
    if (!slug) notFound()

    const { reference } = await searchParams
    const trackingNumber = reference?.trim()

    if (!trackingNumber) {
        return <TrackingLookupForm />
    }

    const details = await getTrackingDetails(trackingNumber, slug)
    if (!details) {
        return <TrackingLookupForm defaultValue={trackingNumber} notFound />
    }

    return <TrackingView details={details} />
}

function TrackingSkeleton() {
    return (
        <div className="space-y-8">
            <div className="space-y-3">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-8 w-72" />
            </div>
            <div className="grid gap-8 lg:grid-cols-3">
                <Skeleton className="h-[420px] w-full lg:col-span-2" />
                <div className="space-y-4">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
        </div>
    )
}
