import { Suspense } from "react"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { BookingStepper } from "./booking-stepper"
import { getOrganisationBySlug } from "@/lib/supabase/db-server"
import { getServiceCatalog } from "@/lib/api/services"
import { Skeleton } from "@/components/ui/skeleton"

export default function BookingPage() {
    // The booking route has no dynamic segment, so Next prerenders it at build
    // time. Reading the request `x-org-slug` header and fetching the catalog are
    // request-time work, so they must live inside a <Suspense> boundary
    // (cacheComponents requirement) — the static shell streams in the content.
    return (
        <Suspense fallback={<BookingSkeleton />}>
            <BookingContent />
        </Suspense>
    )
}

async function BookingContent() {
    // The active tenant is resolved by middleware from the subdomain
    // (<slug>.hikyaku.org) and exposed as the x-org-slug request header. Booking
    // is per-organisation only — without a slug (e.g. the apex domain) there is
    // no store to book with.
    const slug = (await headers()).get("x-org-slug")
    if (!slug) notFound()

    const organisation = await getOrganisationBySlug(slug)
    if (!organisation) notFound()

    // Price/currency live in Stripe, so the catalog comes from whendan-api
    // (cached, 60s TTL) rather than supabase-js.
    const { services } = await getServiceCatalog(slug)
    const orgName = organisation.name ?? "This store"

    if (services.length === 0) {
        return (
            <div className="flex min-h-[70svh] flex-col items-center justify-center px-4 text-center">
                <h1 className="scroll-m-20 text-2xl font-semibold tracking-tight text-balance">
                    {orgName} is not accepting any services now
                </h1>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                    Schedule a Delivery
                </h1>
                <p className="text-muted-foreground mt-1">
                    Fill in your package and delivery details to get started.
                </p>
            </div>
            <BookingStepper services={services} orgSlug={organisation.slug} />
        </div>
    )
}

function BookingSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-5 w-80" />
            </div>
            <Skeleton className="h-96 w-full" />
        </div>
    )
}
