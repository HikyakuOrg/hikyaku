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
    const [driverId, setDriverId] = useState<string | null>(null)
    const [driver, setDriver] = useState<ListDriverDto | null>(null)
    const [fromCustomerId, setFromCustomerId] = useState<string | null>("")
    const [toCustomerId, setToCustomerId] = useState<string | null>("")
    const [fromCustomer, setFromCustomer] = useState<Customer | null>(null)
    const [toCustomer, setToCustomer] = useState<Customer | null>(null)
    const [packageStatusTimeline, setPackageStatusTimeline] = useState<PackageStatusTimeline[]>([])
    const [packageDimension, setPackageDimension] = useState<Tables<"package_dimensions"> | null>(null)
    const [packageDeliveryWindow, setPackageDeliveryWindow] = useState<Tables<"package_delivery_window"> | null>(null)
    const [packageData, setPackageData] = useState<Tables<"packages"> | null>(null)
    const [warehouse, setWarehouse] = useState<Tables<"warehouse"> | null>(null)
    const [packageFailure, setPackageFailure] = useState<Tables<"package_failure"> | null>(null)


    useEffect(() => {
        if (trackingNumber) {
            getPackageByTrackingNumber(trackingNumber).then(data => {
                setPackageId(data.id)
            }).catch(err => {
                console.error("Error fetching package by tracking number", err)
            })
        }
    }, [trackingNumber])

    useEffect(() => {
        if (packageId) {
            fetchTimeline(packageId)
            fetchPackageData(packageId)
            fetchPackageDimension(packageId)
            fetchPackageDeliveryWindow(packageId)
        }
    }, [packageId])

    async function fetchTimeline(packageId: string) {
        const packageTimelineValue = await getPackageTimeline(packageId)
        if (packageTimelineValue.length === 0) return

        const timeline: PackageStatusTimeline[] = packageTimelineValue.map(value => ({
            id: value.id.toString(),
            label: value.package_status.status,
            createdAt: value.created_at,
            status: value.package_status.enums as PackageStatus,
            statusText: value.package_status.status,
        }))
        setPackageStatusTimeline(timeline)

        if (timeline.at(-1)?.status === "FAILED") {
            try {
                const failure = await getPackageFailure(packageId)
                if (failure) {
                    setPackageFailure(failure)
                }
            } catch (err) {
                console.error("Failed to fetch package failure", err)
            }
        }
    }

    async function fetchPackageData(packageId: string) {
        try {
            const assignment = await getPackageAssignment(packageId)
            setDriverId(assignment.driver_id)
        } catch (e) {
            console.error("No driver assigned yet")
        }

        const data = await getPackage(packageId)
        setPackageData(data)
        setFromCustomerId(data.from_customer)
        setToCustomerId(data.to_customer)

        if (data.warehouse_id) {
            const wh = await getWarehouse(data.warehouse_id)
            setWarehouse(wh)
        }
    }

    async function fetchCustomer(customerIds: string[]) {
        const customers = await getCustomersByIdsAction(customerIds)
        const fromCust = customers.find((item) => item.id === fromCustomerId)
        const toCust = customers.find((item) => item.id === toCustomerId)
        if (fromCust) setFromCustomer(fromCust)
        if (toCust) setToCustomer(toCust)
    }

    async function fetchDriver(driverId: string) {
        const driver = await getDriversByIds([driverId])
        if (driver.length > 0) {
            setDriver(driver[0])
        }
    }

    async function fetchPackageDeliveryWindow(packageId: string) {
        const pdw = await getPackageDeliveryWindow(packageId)
        if (pdw) {
            setPackageDeliveryWindow(pdw)
        }
    }

    async function fetchPackageDimension(packageId: string) {
        const dim = await getPackageDimension(packageId)
        if (dim) {
            setPackageDimension(dim)
        }
    }

    useEffect(() => {
        if (fromCustomerId && toCustomerId) {
            fetchCustomer([fromCustomerId, toCustomerId])
        }
    }, [fromCustomerId, toCustomerId])

    useEffect(() => {
        if (driverId) {
            fetchDriver(driverId)
        }
    }, [driverId])

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
