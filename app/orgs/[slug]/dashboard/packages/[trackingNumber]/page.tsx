"use client"

import { getPackage, getPackageAssignment, getPackageByTrackingNumber, getPackageDeliveryWindow, getPackageDimension, getPackageTimeline, getWarehouse, getPackageFailure } from "@/lib/supabase/db"
import { getCustomersByIdsAction } from "@/lib/actions/customers"
import { getDriversByIds } from "@/lib/supabase/supabase-rpc"
import { useParams } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Printer, Package as PackageIcon, Warehouse as WarehouseIcon, User, Truck, MapPin, AlertCircle } from "lucide-react"
import { PackageLabel, downloadLabelAsPNG } from "@/components/package-label"

import { PackageStatus } from "@/app/models/package-status"
import { PackageStatusTimeline } from "@/app/models/package-status-timeline"
import { ListDriverDto } from "@/lib/api"
import { Tables } from "@/lib/supabase/supabase"
import { PackageDetailsTabs } from "./package-details-tabs"
import { PackageImages } from "./package-images"
import PackageTimeline from "./package-timeline"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb"

export default function PackageDetails() {

    const params = useParams()
    const trackingNumber = params.trackingNumber as string
    const slug = params.slug as string
    const [packageId, setPackageId] = useState<string | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [driver, setDriver] = useState<ListDriverDto | null>(null)
    const [fromCustomer, setFromCustomer] = useState<Customer | null>(null)
    const [toCustomer, setToCustomer] = useState<Customer | null>(null)
    const [packageStatusTimeline, setPackageStatusTimeline] = useState<PackageStatusTimeline[]>([])
    const [packageDimension, setPackageDimension] = useState<Tables<"package_dimensions"> | null>(null)
    const [packageDeliveryWindow, setPackageDeliveryWindow] = useState<Tables<"package_delivery_window"> | null>(null)
    const [packageData, setPackageData] = useState<Tables<"packages"> | null>(null)
    const [warehouse, setWarehouse] = useState<Tables<"warehouse"> | null>(null)
    const [packageFailure, setPackageFailure] = useState<Tables<"package_failure"> | null>(null)

    useEffect(() => {
        if (!trackingNumber) return
        let cancelled = false

        async function fetchAll() {
            const pkgByTracking = await getPackageByTrackingNumber(trackingNumber)
            const id = pkgByTracking.id
            if (cancelled) return
            setPackageId(id)

            const [packageResult, timelineResult, dimensionResult, deliveryWindowResult, assignmentResult] =
                await Promise.allSettled([
                    getPackage(id),
                    getPackageTimeline(id),
                    getPackageDimension(id),
                    getPackageDeliveryWindow(id),
                    getPackageAssignment(id),
                ])

            if (cancelled) return

            if (packageResult.status === 'fulfilled') {
                const data = packageResult.value
                setPackageData(data)

                const customerIds = [data.from_customer, data.to_customer].filter(Boolean) as string[]
                if (customerIds.length > 0) {
                    const customers = await getCustomersByIdsAction(customerIds)
                    if (!cancelled) {
                        const fromCust = customers.find(c => c.id === data.from_customer)
                        const toCust = customers.find(c => c.id === data.to_customer)
                        if (fromCust) setFromCustomer(fromCust)
                        if (toCust) setToCustomer(toCust)
                    }
                }

                if (data.warehouse_id) {
                    const wh = await getWarehouse(data.warehouse_id)
                    if (!cancelled) setWarehouse(wh)
                }
            }

            if (timelineResult.status === 'fulfilled' && timelineResult.value.length > 0) {
                const timeline: PackageStatusTimeline[] = timelineResult.value.map(value => ({
                    id: value.id.toString(),
                    label: value.package_status.status,
                    createdAt: value.created_at,
                    status: value.package_status.enums as PackageStatus,
                    statusText: value.package_status.status,
                }))
                if (!cancelled) setPackageStatusTimeline(timeline)

                if (timeline.at(-1)?.status === "FAILED") {
                    try {
                        const failure = await getPackageFailure(id)
                        if (!cancelled && failure) setPackageFailure(failure)
                    } catch (err) {
                        console.error("Failed to fetch package failure", err)
                    }
                }
            }

            if (dimensionResult.status === 'fulfilled' && dimensionResult.value && !cancelled) {
                setPackageDimension(dimensionResult.value)
            }

            if (deliveryWindowResult.status === 'fulfilled' && deliveryWindowResult.value && !cancelled) {
                setPackageDeliveryWindow(deliveryWindowResult.value)
            }

            if (assignmentResult.status === 'fulfilled') {
                const driverId = assignmentResult.value.driver_id
                if (driverId) {
                    const drivers = await getDriversByIds([driverId])
                    if (!cancelled && drivers.length > 0) setDriver(drivers[0])
                }
            } else {
                console.error("No driver assigned yet")
            }
        }

        fetchAll().catch(err => console.error("Error fetching package details", err))
        return () => { cancelled = true }
    }, [trackingNumber])

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
                        recipient={{
                            name: toCustomer.customer_name,
                            address: toCustomer.customer_address,
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
