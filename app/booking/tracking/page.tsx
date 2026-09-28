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
    // Reading the header and the query is request-time work, so it must be
    // inside <Suspense> (cacheComponents).
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
    // Middleware sets x-org-slug from the subdomain. Without it there is no organisation.
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
