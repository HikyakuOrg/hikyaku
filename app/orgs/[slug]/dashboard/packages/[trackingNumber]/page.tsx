"use client"

import { getPackage, getPackageAssignment, getPackageByTrackingNumber, getPackageDeliveryWindow, getPackageDimension, getPackageTimeline, getSkillsByPackage, getWarehouse, getPackageFailure, type Skill } from "@/lib/supabase/db"
import { getCustomersByIdsAction } from "@/lib/actions/customers"
import { getDriversByIds } from "@/lib/supabase/supabase-rpc"
import { getOrganisationBranding } from "@/lib/actions/organisations"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Printer, Package as PackageIcon, Warehouse as WarehouseIcon, MapPin, AlertCircle, ChevronLeft } from "lucide-react"
import { PackageLabel, downloadLabelAsPNG } from "@/components/package-label"

import { PackageStatus } from "@/app/models/package-status"
import { PackageStatusTimeline } from "@/app/models/package-status-timeline"
import { ListDriverDto } from "@/lib/api"
import { Tables } from "@/lib/supabase/supabase"
import { CoverageOutcomeNote } from "./coverage-outcome-note"
import { PackageDetailsTabs } from "./package-details-tabs"
import { PackageImages } from "./package-images"
import PackageTimeline from "./package-timeline"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb"

// PostgREST's "no (or multiple) rows returned" from `.single()`. For a tracking
// number lookup it means there is no package to show, as opposed to a request
// that failed on its way to the database.
function isNoRowsError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "PGRST116"
    )
}

export default function PackageDetails() {

    const params = useParams()
    const trackingNumber = params.trackingNumber as string
    const slug = params.slug as string
    const [packageId, setPackageId] = useState<string | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [driver, setDriver] = useState<ListDriverDto | null>(null)
    // undefined: no package_assignment row exists yet (not assigned). null: a
    // row exists but automatic assignment did not write an outcome onto it.
    const [coverageOutcome, setCoverageOutcome] = useState<string | null | undefined>(undefined)
    const [requiredSkills, setRequiredSkills] = useState<Skill[]>([])
    const [fromCustomer, setFromCustomer] = useState<Customer | null>(null)
    const [toCustomer, setToCustomer] = useState<Customer | null>(null)
    const [packageStatusTimeline, setPackageStatusTimeline] = useState<PackageStatusTimeline[]>([])
    const [packageDimension, setPackageDimension] = useState<Tables<"package_dimensions"> | null>(null)
    const [packageDeliveryWindow, setPackageDeliveryWindow] = useState<Tables<"package_delivery_window"> | null>(null)
    const [packageData, setPackageData] = useState<Tables<"packages"> | null>(null)
    const [warehouse, setWarehouse] = useState<Tables<"warehouse"> | null>(null)
    const [packageFailure, setPackageFailure] = useState<Tables<"package_failure"> | null>(null)
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    // Null while the load is in flight. "not-found" means the tracking number
    // matched nothing; "load-failed" means a required fetch rejected or came
    // back incomplete. Without this, any such failure left the page on the
    // spinner forever, because the render gate can only open once every
    // piece of state has been set.
    const [loadError, setLoadError] = useState<"not-found" | "load-failed" | null>(null)

    useEffect(() => {
        if (!slug) return
        let cancelled = false
        getOrganisationBranding(slug).then((branding) => {
            if (!cancelled) setLogoUrl(branding?.logoUrl ?? null)
        })
        return () => { cancelled = true }
    }, [slug])

    useEffect(() => {
        if (!trackingNumber) return
        let cancelled = false

        async function fetchAll() {
            // A client-side navigation between packages would otherwise keep
            // showing the previous package's rows (or its error panel) while
            // the new ones load.
            setLoadError(null)
            setPackageId(null)
            setPackageData(null)
            setFromCustomer(null)
            setToCustomer(null)
            setPackageDimension(null)
            setPackageDeliveryWindow(null)
            setPackageStatusTimeline([])
            setCoverageOutcome(undefined)
            setDriver(null)
            setWarehouse(null)
            setPackageFailure(null)

            let pkgByTracking: Tables<"packages">
            try {
                pkgByTracking = await getPackageByTrackingNumber(trackingNumber)
            } catch (err) {
                console.error("Failed to look up package by tracking number", err)
                if (!cancelled) setLoadError(isNoRowsError(err) ? "not-found" : "load-failed")
                return
            }
            const id = pkgByTracking.id
            if (cancelled) return
            setPackageId(id)

            const settled = await Promise.allSettled([
                getPackage(id),
                getPackageTimeline(id),
                getPackageDimension(id),
                getPackageDeliveryWindow(id),
                getPackageAssignment(id),
                getSkillsByPackage(id),
            ])
            const [packageResult, timelineResult, dimensionResult, deliveryWindowResult, assignmentResult, skillsResult] = settled
            const fetchNames = [
                "getPackage",
                "getPackageTimeline",
                "getPackageDimension",
                "getPackageDeliveryWindow",
                "getPackageAssignment",
                "getSkillsByPackage",
            ]
            settled.forEach((result, index) => {
                if (result.status === "rejected") {
                    console.error(`Failed to fetch package data from ${fetchNames[index]}`, result.reason)
                }
            })

            if (cancelled) return

            // The render gate cannot open without the package row, its
            // dimensions and its delivery window, so a rejection in any of
            // those three has to end the load. Timeline and assignment
            // failures are survivable: the page just renders an empty
            // timeline and no assigned driver.
            if (
                packageResult.status === "rejected" ||
                dimensionResult.status === "rejected" ||
                deliveryWindowResult.status === "rejected"
            ) {
                setLoadError("load-failed")
            }

            if (dimensionResult.status === "fulfilled" && dimensionResult.value) {
                setPackageDimension(dimensionResult.value)
            }

            if (deliveryWindowResult.status === "fulfilled" && deliveryWindowResult.value) {
                setPackageDeliveryWindow(deliveryWindowResult.value)
            }

            if (assignmentResult.status === "fulfilled") {
                setCoverageOutcome(assignmentResult.value.coverage_outcome ?? null)
            }

            if (skillsResult.status === "fulfilled") {
                setRequiredSkills(skillsResult.value)
            }

            if (timelineResult.status === "fulfilled" && timelineResult.value.length > 0) {
                try {
                    const timeline: PackageStatusTimeline[] = timelineResult.value.map(value => ({
                        id: value.id.toString(),
                        label: value.package_status.status,
                        createdAt: value.created_at,
                        status: value.package_status.enums as PackageStatus,
                        statusText: value.package_status.status,
                    }))
                    setPackageStatusTimeline(timeline)

                    if (timeline.at(-1)?.status === "FAILED") {
                        try {
                            const failure = await getPackageFailure(id)
                            if (!cancelled && failure) setPackageFailure(failure)
                        } catch (err) {
                            console.error("Failed to fetch package failure", err)
                        }
                    }
                } catch (err) {
                    console.error("Failed to map package timeline", err)
                }
            }

            if (packageResult.status === "fulfilled") {
                const data = packageResult.value
                setPackageData(data)

                // The by-ids lookup skips unknown ids and still answers 200,
                // and the sender/receiver pair is required by the render gate,
                // so an empty or partial customer list is a dead end the same
                // way a thrown request is — it would otherwise leave the page
                // waiting on customers that are never coming.
                const fromId = data.from_customer
                const toId = data.to_customer
                const customerIds = [fromId, toId].filter(Boolean) as string[]
                let customers: Customer[] = []
                if (customerIds.length > 0) {
                    try {
                        customers = await getCustomersByIdsAction(customerIds)
                    } catch (err) {
                        console.error("Failed to fetch package customers", err)
                    }
                }
                if (!cancelled) {
                    const fromCust = customers.find(c => c.id === fromId)
                    const toCust = customers.find(c => c.id === toId)
                    if (fromCust) setFromCustomer(fromCust)
                    if (toCust) setToCustomer(toCust)
                    if (!fromCust || !toCust) {
                        console.error("Package customers could not be resolved", {
                            fromId,
                            toId,
                            resolvedIds: customers.map(c => c.id),
                        })
                        setLoadError("load-failed")
                    }
                }

                if (data.warehouse_id) {
                    try {
                        const wh = await getWarehouse(data.warehouse_id)
                        if (!cancelled) setWarehouse(wh)
                    } catch (err) {
                        console.error("Failed to fetch departure warehouse", err)
                    }
                }
            }

            if (assignmentResult.status === "fulfilled" && assignmentResult.value.driver_id) {
                try {
                    const drivers = await getDriversByIds([assignmentResult.value.driver_id])
                    if (!cancelled && drivers.length > 0) setDriver(drivers[0])
                } catch (err) {
                    console.error("Failed to fetch assigned driver", err)
                }
            }
        }

        fetchAll().catch(err => console.error("Error fetching package details", err))
        return () => { cancelled = true }
    }, [trackingNumber])

    if (loadError) {
        // A wrong tracking number and a failed read get different panels, the
        // same split the service area detail page makes: a dispatcher told a
        // package is gone because the database is unreachable goes looking
        // for a problem that does not exist.
        const isMissing = loadError === "not-found"
        return (
            <div className="space-y-6 p-6">
                <Button variant="ghost" size="sm" render={<Link href={`/orgs/${slug}/dashboard/packages`} />}>
                    <ChevronLeft className="size-4" />
                    All packages
                </Button>

                <div
                    className="flex h-[320px] w-full items-center justify-center rounded-xl border border-destructive/40 bg-destructive/5 px-6 text-center"
                    data-testid={isMissing ? "package-not-found" : "package-load-error"}
                >
                    <div className="space-y-2">
                        <h1 className="text-lg font-semibold">
                            {isMissing ? "Package not found" : "Package could not be loaded"}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {isMissing
                                ? "Check the tracking number, or the package may belong to another organisation."
                                : "This is a problem reading its details, not a deleted package. Reload the page, and contact support if it keeps happening."}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    if (!toCustomer || !fromCustomer || !packageDimension || !packageDeliveryWindow || !packageData || !packageId) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href={`/orgs/${slug}/dashboard/packages`}>
                                    Packages
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{packageData.tracking_number}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
                <Button
                    className="gap-2"
                    onClick={() => {
                        if (canvasRef.current) {
                            downloadLabelAsPNG(canvasRef.current, `label-${packageData.tracking_number}.png`);
                        }
                    }}
                >
                    <Printer className="h-4 w-4" />
                    Print Shipping Label
                </Button>
            </div>

            <Separator />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {warehouse && (
                        <div className="border rounded-xl p-6 bg-muted/30">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <WarehouseIcon className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Departure Warehouse</h3>
                                    <p className="text-sm text-muted-foreground">Original service center</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Name</p>
                                    <p className="font-medium">{warehouse.warehouse_name}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Address</p>
                                    <p className="font-medium">{warehouse.warehouse_address}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {warehouse.warehouse_city}, {warehouse.warehouse_zipcode}, {warehouse.warehouse_country}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <PackageDetailsTabs
                        deliveryStatus={packageStatusTimeline.at(-1)?.statusText ?? ''}
                        scheduledArrival={packageDeliveryWindow?.scheduled_arrival ?? ''}
                        packageAttributes={{
                            width: packageDimension.width_cm,
                            length: packageDimension.length_cm,
                            height: packageDimension.height_cm,
                            weight: packageDimension.weight_kg
                        }}
                        requiredSkills={requiredSkills.map((skill) => skill.name)}
                        recipient={{
                            name: toCustomer.customer_name,
                            address: toCustomer.customer_address,
                            unit: toCustomer.customer_unit || undefined,
                            contact: toCustomer.customer_phone
                        }}
                        sender={{
                            name: fromCustomer.customer_name,
                            contact: fromCustomer.customer_phone
                        }}
                        driver={driver ? {
                            name: driver.display_name,
                            contact: driver.phone_number,
                        } : undefined}
                    />
                </div>

                <div className="space-y-8">
                    <div className="sticky top-24 space-y-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <MapPin className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="font-semibold text-lg">Tracking Timeline</h3>
                            </div>
                            <div className="border rounded-xl p-6 bg-card">
                                <PackageTimeline packageStatusTimeline={packageStatusTimeline} />
                                <CoverageOutcomeNote outcome={coverageOutcome} packageId={packageId} />

                                {packageFailure && (
                                    <div className="mt-6 p-4 bg-destructive/10 text-destructive rounded-lg flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                                        <div>
                                            <h4 className="font-semibold text-sm">Delivery Failed</h4>
                                            <p className="text-sm mt-1">{packageFailure.failure_reason}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <PackageIcon className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="font-semibold text-lg">Packaging</h3>
                            </div>

                            <div className="space-y-6">
                                <PackageLabel
                                    canvasRef={canvasRef}
                                    packageId={packageId}
                                    trackingNumber={packageData.tracking_number}
                                    receiver={toCustomer}
                                    logoUrl={logoUrl}
                                />
                                <PackageImages packageId={packageId} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
