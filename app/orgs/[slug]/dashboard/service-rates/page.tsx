import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    getOrganisationBySlug,
    getServiceRatesWithCoverage,
    type DashboardServiceRate,
} from "@/lib/supabase/db-server"

type PageProps = { params: Promise<{ slug: string }> }

function fmt(n: number) {
    return n.toFixed(2)
}

function RateEntry({ rate }: { rate: DashboardServiceRate }) {
    const isOnDemand = rate.delivery_type === "on_demand"

    return (
        <article className="py-10 flex items-start justify-between gap-16">
            <div className="flex items-start gap-3">
                <span
                    className={[
                        "mt-1.5 shrink-0 h-2 w-2 rounded-full",
                        isOnDemand ? "bg-amber-400" : "bg-sky-400",
                    ].join(" ")}
                />
                <div className="space-y-1">
                    <h2 className="text-base font-semibold leading-snug">{rate.name}</h2>
                    <p className="text-sm text-muted-foreground">
                        {isOnDemand ? "On demand" : "Scheduled"}
                    </p>
                </div>
            </div>

            <div className="text-right shrink-0 space-y-1 pt-0.5">
                <p className="tabular-nums font-mono text-lg font-semibold leading-snug">
                    {rate.currency} {fmt(rate.base_rate)}
                    <span className="font-sans font-normal text-muted-foreground text-sm ml-2">
                        base
                    </span>
                </p>
                <p className="tabular-nums font-mono text-sm text-muted-foreground">
                    + {fmt(rate.rate_per_distance)}{" "}
                    <span className="font-sans">/ {rate.distance_unit}</span>
                </p>
            </div>
        </article>
    )
}

export default async function ServiceRatesPage({ params }: PageProps) {
    const { slug } = await params
    const org = await getOrganisationBySlug(slug)
    const rates = org ? await getServiceRatesWithCoverage(org.id) : []

    return (
        <div className="p-8 space-y-10">
            <div className="flex items-start justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Service Rates</h1>
                    <p className="text-muted-foreground mt-2">
                        Pricing structures applied to deliveries.
                    </p>
                </div>
                <Button>
                    <Link href={`/orgs/${slug}/dashboard/service-rates/add`}>
                        New Rate
                    </Link>
                </Button>
            </div>

            {rates.length === 0 ? (
                <div className="py-20 text-center">
                    <p className="text-muted-foreground">
                        No service rates have been configured yet.
                    </p>
                    <Button variant="outline" className="mt-5">
                        <Link href={`/orgs/${slug}/dashboard/service-rates/add`}>
                            Create your first rate
                        </Link>
                    </Button>
                </div>
            ) : (
                <div className="divide-y">
                    {rates.map((rate) => (
                        <RateEntry key={rate.id} rate={rate} />
                    ))}
                </div>
            )}
        </div>
    )
}
