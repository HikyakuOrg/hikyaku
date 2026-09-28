import { Suspense } from "react"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { BookingStepper } from "./booking-stepper"
import { getOrganisationBySlug } from "@/lib/supabase/db-server"
import { getServiceCatalog } from "@/lib/api/services"
import { Skeleton } from "@/components/ui/skeleton"

export default function BookingPage() {
    // Next prerenders this route. Reading the header and the catalog is
    // request-time work, so it must be inside <Suspense> (cacheComponents).
    return (
        <Suspense fallback={<BookingSkeleton />}>
            <BookingContent />
        </Suspense>
    )
}

async function BookingContent() {
    // Middleware sets x-org-slug from the subdomain. Without a slug (the apex
    // domain) there is nothing to book.
    const slug = (await headers()).get("x-org-slug")
    if (!slug) notFound()

    const organisation = await getOrganisationBySlug(slug)
    if (!organisation) notFound()

    // Use the organisation slug, not the host label. On a vanity host the label
    // is the vanity slug, which the catalog endpoint does not accept.
    const { services } = await getServiceCatalog(organisation.slug)
    const orgName = organisation.name ?? "This store"

    if (services.length === 0) {
        return (
            <div className="flex min-h-[70svh] flex-col items-center justify-center px-4 text-center">
                <h1 className="scroll-m-20 text-2xl font-semibold tracking-tight text-balance">
                    {orgName} is not taking bookings right now
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
