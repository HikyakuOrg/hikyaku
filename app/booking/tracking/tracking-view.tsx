import { format } from "date-fns"
import { Bike, Car, Mail, MapPin } from "lucide-react"

import { PackageStatus, PackageStatusText } from "@/app/models/package-status"
import type { PackageStatusTimeline } from "@/app/models/package-status-timeline"
import type { TrackingDetails, TrackingDriver, TrackingLngLat } from "@/app/models/tracking"
import { Separator } from "@/components/ui/separator"
import { TrackingMap } from "@/components/tracking/tracking-map"
import PackageTimeline from "@/app/orgs/[slug]/dashboard/packages/[trackingNumber]/package-timeline"
import { PackageImages } from "@/app/orgs/[slug]/dashboard/packages/[trackingNumber]/package-images"
import { CopyTrackingNumber } from "./copy-tracking-number"

const STATUS_TONE: Record<PackageStatus, string> = {
    PENDING: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    ASSIGNED: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    OUT_FOR_DELIVERY: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    IN_TRANSIT: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    DELIVERED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    FAILED: "bg-red-500/10 text-red-600 dark:text-red-400",
}

function headline(status: PackageStatus): string {
    switch (status) {
        case "PENDING":
        case "ASSIGNED":
            return "Preparing your delivery"
        case "OUT_FOR_DELIVERY":
        case "IN_TRANSIT":
            return "Your delivery is on the way"
        case "DELIVERED":
            return "Delivered"
        case "FAILED":
            return "Delivery unsuccessful"
    }
}

function StatusPill({ status }: { status: PackageStatus }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[status]}`}
        >
            <span className="size-1.5 rounded-full bg-current opacity-70" />
            {PackageStatusText(status)}
        </span>
    )
}

function DriverPanel({ driver, updatedAt }: { driver: TrackingDriver; updatedAt: string | null }) {
    const isBike = driver.vehicle_type === "Bicycle"
    const vehicleLine = isBike
        ? "By bicycle"
        : [driver.vehicle_label, driver.vehicle_plate].filter(Boolean).join(" · ") || null

    return (
        <div className="flex items-start gap-3 rounded-xl border p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                {isBike ? <Bike className="size-5" /> : <Car className="size-5" />}
            </div>
            <div className="min-w-0 space-y-0.5">
                <p className="text-sm text-muted-foreground">Your courier</p>
                <p className="font-medium">{driver.name ?? "Assigned courier"}</p>
                {vehicleLine && <p className="text-sm text-muted-foreground">{vehicleLine}</p>}
                {updatedAt && (
                    <p className="text-xs text-muted-foreground">
                        Location updated {format(new Date(updatedAt), "h:mm a")}
                    </p>
                )}
            </div>
        </div>
    )
}

export function TrackingView({ details }: { details: TrackingDetails }) {
    const inTransit = details.current_status === "IN_TRANSIT"
    const delivered = details.current_status === "DELIVERED"

    const destination: TrackingLngLat | null =
        details.recipient.lng != null && details.recipient.lat != null
            ? { lng: details.recipient.lng, lat: details.recipient.lat }
            : null
    const origin: TrackingLngLat | null =
        details.origin && details.origin.lng != null && details.origin.lat != null
            ? { lng: details.origin.lng, lat: details.origin.lat }
            : null

    const timeline: PackageStatusTimeline[] = details.timeline.map((entry, index) => ({
        id: String(index),
        label: PackageStatusText(entry.status),
        statusText: PackageStatusText(entry.status),
        status: entry.status,
        createdAt: entry.created_at,
    }))

    return (
        <div className="space-y-8">
            <header className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                    <StatusPill status={details.current_status} />
                    <CopyTrackingNumber value={details.tracking_number} />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    {headline(details.current_status)}
                </h1>
            </header>

            <div className="grid gap-8 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    {destination ? (
                        <TrackingMap
                            trackingNumber={details.tracking_number}
                            status={details.current_status}
                            destination={destination}
                            origin={origin}
                            initialDriverLocation={details.driver_location}
                        />
                    ) : (
                        <div className="flex h-[200px] items-center justify-center rounded-xl border bg-muted/20 text-sm text-muted-foreground">
                            Map unavailable for this delivery.
                        </div>
                    )}

                    {inTransit && details.driver && (
                        <DriverPanel
                            driver={details.driver}
                            updatedAt={details.driver_location?.updated_at ?? null}
                        />
                    )}
                </div>

                <aside className="space-y-6">
                    <section>
                        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Progress</h2>
                        <PackageTimeline packageStatusTimeline={timeline} />
                    </section>

                    <Separator />

                    <section className="space-y-2">
                        <h2 className="text-sm font-medium text-muted-foreground">Recipient</h2>
                        {details.recipient.name && (
                            <p className="font-medium">{details.recipient.name}</p>
                        )}
                        {details.recipient.email && (
                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="size-4 shrink-0" />
                                {details.recipient.email}
                            </p>
                        )}
                        {details.recipient.address && (
                            <p className="flex items-start gap-2 text-sm text-muted-foreground">
                                <MapPin className="mt-0.5 size-4 shrink-0" />
                                <span>{details.recipient.address}</span>
                            </p>
                        )}
                    </section>
                </aside>
            </div>

            {delivered && (
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold tracking-tight">Proof of delivery</h2>
                    <PackageImages packageId={details.package_id} />
                </section>
            )}
        </div>
    )
}
