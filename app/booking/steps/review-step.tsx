"use client"

import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { BookingFormData } from "../booking-stepper"
import type { AddressesFormValues, ServiceOption } from "../booking-schema"
import type { QuoteResult } from "@/lib/api/payments"
import { formatCurrency } from "@/lib/currency"
import { minorToMajor, unitSuffix } from "@/lib/pricing"

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
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
            <div className="rounded-lg border bg-muted/20 px-4 divide-y">{children}</div>
        </div>
    )
}

function formatAddress(addr: AddressesFormValues["sender"] | undefined): string {
    return addr?.address ?? "—"
}

function formatTimeWindow(from?: string, to?: string): string {
    if (!from && !to) return "—"
    if (from && to) return `${from} – ${to}`
    return from ?? to ?? "—"
}

/** "Distance · 12.70 km × $0.50" for fractional units; just the name otherwise. */
function lineLabel(line: QuoteResult["lines"][number], currency: string): string {
    const suffix = unitSuffix(line.pricing_unit)
    if (line.pricing_unit === "per_recipient") {
        return `${line.name} · ${line.quantity} × ${formatCurrency(line.rate, currency)}`
    }
    if (!suffix) return line.name
    const qty = Number.isInteger(line.quantity)
        ? String(line.quantity)
        : line.quantity.toFixed(2)
    return `${line.name} · ${qty} ${suffix} × ${formatCurrency(line.rate, currency)}`
}

export function ReviewStep({
    formData,
    services,
    quote,
    onPrev,
    onSubmit,
    isSubmitting = false,
}: {
    formData: BookingFormData
    services: ServiceOption[]
    quote?: QuoteResult | null
    onPrev: () => void
    onSubmit: () => void | Promise<void>
    isSubmitting?: boolean
}) {
    const { package: pkg, addresses, schedule } = formData

    const selectedService = services.find((s) => s.id === pkg?.serviceId)
    const selectedAddons = (selectedService?.addons ?? []).filter((a) =>
        (pkg?.addonIds ?? []).includes(a.id)
    )

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
                        value={
                            <Badge variant="secondary">
                                {selectedService?.name ?? "—"}
                            </Badge>
                        }
                    />
                    {selectedAddons.length > 0 && (
                        <ReviewRow
                            label="Add-ons"
                            value={
                                <div className="flex flex-wrap justify-end gap-1">
                                    {selectedAddons.map((a) => (
                                        <Badge key={a.id} variant="outline">
                                            {a.name}
                                        </Badge>
                                    ))}
                                </div>
                            }
                        />
                    )}
                    <ReviewRow label="Description" value={pkg?.description ?? "—"} />
                    <ReviewRow
                        label="Weight"
                        value={pkg?.weight != null ? `${pkg.weight} ${pkg.weightUnit}` : "—"}
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
                    <ReviewRow label="Address" value={formatAddress(addresses?.sender)} />
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
                <ReviewSection title="Schedule">
                    <ReviewRow label="Pickup Date" value={schedule?.pickupDate ?? "—"} />
                    <ReviewRow
                        label="Pickup Window"
                        value={formatTimeWindow(
                            schedule?.pickupTimeFrom,
                            schedule?.pickupTimeTo
                        )}
                    />
                    <Separator className="my-0" />
                    <ReviewRow label="Delivery Date" value={schedule?.deliveryDate ?? "—"} />
                    <ReviewRow
                        label="Delivery Window"
                        value={formatTimeWindow(
                            schedule?.deliveryTimeFrom,
                            schedule?.deliveryTimeTo
                        )}
                    />
                    {schedule?.deliveryNotes && (
                        <>
                            <Separator className="my-0" />
                            <ReviewRow label="Delivery Notes" value={schedule.deliveryNotes} />
                        </>
                    )}
                </ReviewSection>

                {/* Service Fees — itemised quote */}
                {quote && (
                    <ReviewSection title="Service Fees">
                        {quote.lines.map((line) => (
                            <ReviewRow
                                key={line.id}
                                label={lineLabel(line, quote.currency)}
                                value={formatCurrency(
                                    minorToMajor(line.amount_minor, quote.currency),
                                    quote.currency
                                )}
                            />
                        ))}
                        <div className="flex items-center justify-between gap-4 py-3 font-semibold">
                            <p className="text-sm">Total</p>
                            <p className="text-base text-right">
                                {formatCurrency(quote.total, quote.currency)}
                            </p>
                        </div>
                    </ReviewSection>
                )}
            </div>

            <div className="flex justify-between pt-6 border-t">
                <Button type="button" variant="outline" onClick={onPrev}>
                    Previous
                </Button>
                <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Booking
                </Button>
            </div>
        </div>
    )
}
