"use client"

import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { BookingFormData } from "../booking-stepper"
import type { AddressesFormValues, ServiceRateOption } from "../booking-schema"

function ReviewRow({
    label,
    value,
}: {
    label: string
    value: React.ReactNode
}) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5">
            <p className="text-muted-foreground text-sm shrink-0">{label}</p>
            <div className="text-sm font-medium text-right">{value}</div>
        </div>
    )
}

function ReviewSection({
    title,
    children,
}: {
    title: string
    children: React.ReactNode
}) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {title}
            </p>
            <div className="rounded-lg border bg-muted/20 px-4 divide-y">
                {children}
            </div>
        </div>
    )
}

function formatAddress(addr: AddressesFormValues["sender"] | undefined): string {
    if (!addr) return "—"
    return addr.address
}

function formatTimeWindow(from?: string, to?: string): string {
    if (!from && !to) return "—"
    if (from && to) return `${from} – ${to}`
    return from ?? to ?? "—"
}

export function ReviewStep({
    formData,
    serviceRates,
    onPrev,
    onSubmit,
    isSubmitting = false,
}: {
    formData: BookingFormData
    serviceRates: ServiceRateOption[]
    onPrev: () => void
    onSubmit: () => void | Promise<void>
    isSubmitting?: boolean
}) {
    const { package: pkg, addresses, schedule } = formData

    const isScheduled = pkg?.deliveryType === "scheduled"
    const selectedRate = serviceRates.find((r) => r.id === pkg?.serviceRateId)
    const serviceLabel =
        selectedRate?.name ??
        (pkg?.deliveryType === "on_demand" ? "On Demand" : "Scheduled")

    return (
        <div className="space-y-8 p-4">
            <div>
                <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                    Review
                </h3>
                <p className="text-muted-foreground mt-2 leading-7">
                    Check your booking details before submitting.
                </p>
            </div>

            <div className="space-y-6">
                {/* Package Details */}
                <ReviewSection title="Package Details">
                    <ReviewRow
                        label="Service"
                        value={<Badge variant="secondary">{serviceLabel}</Badge>}
                    />
                    <ReviewRow label="Description" value={pkg?.description ?? "—"} />
                    <ReviewRow
                        label="Weight"
                        value={
                            pkg?.weight != null
                                ? `${pkg.weight} ${pkg.weightUnit}`
                                : "—"
                        }
                    />
                    <ReviewRow
                        label="Dimensions"
                        value={
                            pkg?.length != null && pkg?.width != null && pkg?.height != null
                                ? `${pkg.length} × ${pkg.width} × ${pkg.height} cm`
                                : "—"
                        }
                    />
                   
                </ReviewSection>

                {/* Sender */}
                <ReviewSection title="Sender">
                    <ReviewRow label="Name" value={addresses?.sender?.fullName ?? "—"} />
                    <ReviewRow label="Email" value={addresses?.sender?.email ?? "—"} />
                    <ReviewRow label="Phone" value={addresses?.sender?.phone ?? "—"} />
                    <ReviewRow
                        label="Address"
                        value={formatAddress(addresses?.sender)}
                    />
                </ReviewSection>

                {/* Recipients */}
                {(addresses?.recipients ?? []).map((recipient, index) => (
                    <ReviewSection
                        key={index}
                        title={
                            (addresses?.recipients?.length ?? 0) === 1
                                ? "Recipient"
                                : `Recipient ${index + 1}`
                        }
                    >
                        <ReviewRow label="Name" value={recipient.fullName ?? "—"} />
                        <ReviewRow label="Email" value={recipient.email ?? "—"} />
                        <ReviewRow label="Phone" value={recipient.phone ?? "—"} />
                        <ReviewRow label="Address" value={formatAddress(recipient)} />
                    </ReviewSection>
                ))}

                {/* Schedule */}
                <ReviewSection title="Schedule & Options">
                    <ReviewRow
                        label="Pickup Date"
                        value={schedule?.pickupDate ?? "—"}
                    />
                    {isScheduled && (
                        <ReviewRow
                            label="Pickup Window"
                            value={formatTimeWindow(
                                schedule?.pickupTimeFrom,
                                schedule?.pickupTimeTo
                            )}
                        />
                    )}
                    {isScheduled && (
                        <>
                            <Separator className="my-0" />
                            <ReviewRow
                                label="Delivery Date"
                                value={schedule?.deliveryDate ?? "—"}
                            />
                            <ReviewRow
                                label="Delivery Window"
                                value={formatTimeWindow(
                                    schedule?.deliveryTimeFrom,
                                    schedule?.deliveryTimeTo
                                )}
                            />
                        </>
                    )}
                    <Separator className="my-0" />
                    {schedule?.deliveryNotes && (
                        <ReviewRow
                            label="Delivery Notes"
                            value={schedule.deliveryNotes}
                        />
                    )}
                    <ReviewRow
                        label="Signature Required"
                        value={schedule?.signatureRequired ? "Yes" : "No"}
                    />
                </ReviewSection>
            </div>

            <div className="flex justify-between pt-6 border-t">
                <Button type="button" variant="outline" onClick={onPrev}>
                    Previous
                </Button>
                <Button
                    type="button"
                    onClick={onSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Submit Booking
                </Button>
            </div>
        </div>
    )
}
