"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RouteMap, RouteStep } from "@/components/route-map"
import { createManualShift } from "@/lib/actions/shift"
import { createBillingPortalSession } from "@/lib/actions/billing"
import type { ShiftUsageStatus } from "@/lib/actions/billing"
import { useRouter } from "next/navigation"
import { useOrgSlug } from "@/lib/use-org"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"
import { Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import { isBefore, parseISO } from "date-fns"
import type { FormData } from "@/app/orgs/[slug]/dashboard/driver-shifts/add/types"

export function OverviewStep({
    formData,
    usage,
    onPrev,
}: {
    formData: FormData
    usage: ShiftUsageStatus | null
    onPrev: () => void
}) {
    const router = useRouter()
    const slug = useOrgSlug()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isAddingPaymentMethod, setIsAddingPaymentMethod] = useState(false)

    // Pre-check only — enforce_shift_allowance() in hikyaku-api is the actual
    // enforcement point (see AddShiftUsageMetering). This just keeps the button
    // from offering a submission the trigger would reject, the same relationship
    // getWarehouseAllowance() has to the warehouse-limit trigger. `usage` is
    // null on a failed/unreachable read, which fails OPEN here (unlike the
    // trial dialog) — a transient billing-API blip must not block shift
    // creation on its own; the trigger is still there as the real backstop.
    const allowanceExhausted =
        !!usage &&
        usage.shiftsUsedThisPeriod >= usage.freeAllowance &&
        !usage.hasPaymentMethod

    async function handleAddPaymentMethod() {
        setIsAddingPaymentMethod(true)
        try {
            const result = await createBillingPortalSession(window.location.href)
            if (!result.success) {
                toast.error(result.error)
                return
            }
            window.location.href = result.url
        } catch (err) {
            toast.error(getErrorMessage(err) || "Failed to open the billing portal")
        } finally {
            setIsAddingPaymentMethod(false)
        }
    }

    const { warehouse, date, driverVehicle, packagesRoute } = formData

    if (!warehouse || !date || !driverVehicle || !packagesRoute) {
        return (
            <div className="py-8 text-center text-muted-foreground">
                Incomplete form data. Please go back and complete all steps.
            </div>
        )
    }

    const shiftDate = parseISO(date.date + "T00:00:00")

    // Validation checks
    const licenseExpired = driverVehicle.licenseExpiry
        ? isBefore(parseISO(driverVehicle.licenseExpiry), shiftDate)
        : false

    const routeSteps: RouteStep[] = [
        {
            coords: [warehouse.warehouseLocation[0], warehouse.warehouseLocation[1]],
            type: "start",
            warehouse_name: warehouse.warehouseName,
        },
        ...packagesRoute.orderedPackages.map((op) => ({
            coords: [op.customerLng, op.customerLat],
            type: "job" as const,
        })),
        {
            coords: [warehouse.warehouseLocation[0], warehouse.warehouseLocation[1]],
            type: "end",
            warehouse_name: warehouse.warehouseName,
        },
    ]

    async function handleSubmit() {
        if (!warehouse || !date || !driverVehicle || !packagesRoute) return
        setIsSubmitting(true)
        try {
            const result = await createManualShift({
                warehouseId: warehouse.warehouseId,
                date: date.date,
                driverId: driverVehicle.driverId,
                vehicleId: driverVehicle.vehicleId,
                orderedPackageIds: packagesRoute.orderedPackages.map((op) => op.packageId),
            })

            if (!result.success) {
                toast.error(result.error)
                return
            }

            toast.success("Shift created successfully!")
            // The API decided each package's feasibility; a warning means it was
            // placed anyway and the dispatcher should know what it costs.
            for (const warning of result.warnings) {
                toast.warning(warning)
            }

            // The shift detail page is keyed on the route, which a shift with no
            // stops may not have yet — fall back to the calendar, which shows
            // empty shifts.
            router.push(
                result.routeId
                    ? `/orgs/${slug}/dashboard/driver-shifts/${result.routeId}`
                    : `/orgs/${slug}/dashboard/driver-shifts`,
            )
        } catch (err) {
            toast.error(getErrorMessage(err) || "Failed to create shift")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">Review & Confirm</h3>
                <p className="text-muted-foreground mt-2 leading-7">
                    Review all shift details before submitting.
                </p>
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Warehouse</p>
                    <p className="font-medium">{warehouse.warehouseName}</p>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Shift Date</p>
                    <p className="font-medium">
                        {new Date(date.date + "T00:00:00").toLocaleDateString("en-AU", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </p>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Driver</p>
                    <div className="flex items-center gap-2">
                        <p className="font-medium">{driverVehicle.driverName}</p>
                        {driverVehicle.driverUnderProbation && (
                            <Badge variant="destructive" className="text-xs">Probation</Badge>
                        )}
                    </div>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Vehicle</p>
                    <p className="font-medium">
                        {driverVehicle.vehicleMake} {driverVehicle.vehicleModel} · {driverVehicle.vehiclePlate}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Capacity: {driverVehicle.vehicleGrossLimits > 0 ? `${driverVehicle.vehicleGrossLimits} kg` : "Unknown"}
                    </p>
                </div>
            </div>

            {/* Packages table */}
            <div className="space-y-2">
                <h4 className="text-sm font-medium">
                    Packages ({packagesRoute.orderedPackages.length})
                </h4>
                <div className="rounded-md border divide-y text-sm">
                    {packagesRoute.orderedPackages.map((op, i) => (
                        <div key={op.packageId} className="flex items-center gap-3 px-3 py-2">
                            <span className="text-muted-foreground w-5">{i + 1}</span>
                            <span className="font-mono text-xs">{op.packageId.slice(0, 8)}...</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Validation checklist */}
            <div className="rounded-lg border p-4 space-y-3">
                <h4 className="text-sm font-medium">Validation</h4>

                <div className="flex items-center gap-2 text-sm">
                    {licenseExpired ? (
                        <>
                            <XCircle className="h-4 w-4 text-destructive shrink-0" />
                            <span className="text-destructive">
                                Driver license expired —{" "}
                                {driverVehicle.licenseExpiry
                                    ? new Date(driverVehicle.licenseExpiry).toLocaleDateString()
                                    : "unknown"}
                            </span>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                            <span>Driver license valid</span>
                        </>
                    )}
                </div>

                {driverVehicle.driverUnderProbation && (
                    <div className="flex items-center gap-2 text-sm text-amber-600">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>Driver is under probation — supervisor approval recommended</span>
                    </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <span>{packagesRoute.orderedPackages.length} package(s) ready</span>
                </div>
            </div>

            {/* Route map */}
            <RouteMap
                routeSteps={routeSteps}
                route={packagesRoute.routePreview}
                height="400px"
            />

            {allowanceExhausted && usage && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-destructive">
                        <XCircle className="h-4 w-4 shrink-0" />
                        <span>
                            You&apos;ve used your {usage.freeAllowance} free shifts this billing
                            period. Add a payment method to keep creating shifts.
                        </span>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAddPaymentMethod}
                        disabled={isAddingPaymentMethod}
                    >
                        {isAddingPaymentMethod ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Opening billing portal...
                            </>
                        ) : (
                            "Add payment method"
                        )}
                    </Button>
                </div>
            )}

            <div className="flex justify-between">
                <Button variant="outline" onClick={onPrev} disabled={isSubmitting}>
                    Back
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || allowanceExhausted}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Shift...
                        </>
                    ) : (
                        "Create Shift"
                    )}
                </Button>
            </div>
        </div>
    )
}
