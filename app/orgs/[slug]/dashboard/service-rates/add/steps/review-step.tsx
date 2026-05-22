"use client"

import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SetupFormValues, PricingFormValues, CoverageFormValues } from "../service-rate-schema"
import { SelectedServiceArea } from "../service-rate-stepper"

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

export function ReviewStep({
    formData,
    selectedServiceAreas,
    onPrev,
    onSubmit,
    isSubmitting = false,
}: {
    formData: {
        setup?: SetupFormValues
        pricing?: PricingFormValues
        coverage?: CoverageFormValues
    }
    selectedServiceAreas: SelectedServiceArea[]
    onPrev: () => void
    onSubmit: () => void | Promise<void>
    isSubmitting?: boolean
}) {
    const { setup, pricing, coverage } = formData

    const currency = setup?.currency ?? "—"
    const deliveryTypeLabel =
        setup?.deliveryType === "on_demand" ? "On Demand" : "Scheduled"

    const distanceUnit = pricing?.distanceUnit ?? "km"
    const distanceUnitLabel = distanceUnit === "km" ? "Kilometre" : "Mile"

    const outOfAreaTypeLabel =
        coverage?.outOfAreaType === "flat"
            ? "Flat Rate"
            : `Per ${distanceUnitLabel}`

    const displayAreas = selectedServiceAreas.filter((a) =>
        coverage?.serviceAreaIds?.includes(a.id)
    )

    return (
        <div className="space-y-8 p-4">
            <div>
                <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                    Review
                </h3>
                <p className="text-muted-foreground mt-2 leading-7">
                    Review the service rate details before saving.
                </p>
            </div>

            <div className="space-y-6">
                <ReviewSection title="Service Setup">
                    <ReviewRow
                        label="Currency"
                        value={<Badge variant="secondary">{currency}</Badge>}
                    />
                    <ReviewRow label="Name" value={setup?.name ?? "—"} />
                    <ReviewRow label="Delivery Type" value={deliveryTypeLabel} />
                </ReviewSection>

                <ReviewSection title="Pricing">
                    <ReviewRow
                        label="Base Rate"
                        value={`${currency} ${pricing?.baseRate?.toFixed(2) ?? "0.00"}`}
                    />
                    <ReviewRow
                        label="Distance Unit"
                        value={distanceUnit === "km" ? "Kilometres" : "Miles"}
                    />
                    <ReviewRow
                        label={`Rate per ${distanceUnitLabel}`}
                        value={`${currency} ${pricing?.ratePerDistance?.toFixed(2) ?? "0.00"} / ${distanceUnit}`}
                    />
                    {setup?.deliveryType === "scheduled" && (
                        <ReviewRow
                            label="Storage per Day"
                            value={
                                pricing?.storagePerDay != null
                                    ? `${currency} ${pricing.storagePerDay.toFixed(2)} / day`
                                    : "—"
                            }
                        />
                    )}
                </ReviewSection>

                <ReviewSection title="Coverage">
                    <ReviewRow
                        label="Service Areas"
                        value={
                            displayAreas.length > 0 ? (
                                <div className="flex flex-wrap gap-1 justify-end">
                                    {displayAreas.map((a) => (
                                        <Badge key={a.id} variant="outline">
                                            {a.name}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                "—"
                            )
                        }
                    />
                </ReviewSection>

                <ReviewSection title="Add-ons">
                    {coverage?.hasSignatureCharge ? (
                        <ReviewRow
                            label="Signature on Delivery"
                            value={
                                coverage.signatureCharge != null
                                    ? `${currency} ${coverage.signatureCharge.toFixed(2)}`
                                    : "Enabled"
                            }
                        />
                    ) : (
                        <ReviewRow label="Signature on Delivery" value="Not applied" />
                    )}

                    <Separator className="my-0" />

                    {coverage?.hasOutOfAreaSurcharge ? (
                        <>
                            <ReviewRow
                                label="Out of Area Surcharge"
                                value={outOfAreaTypeLabel}
                            />
                            <ReviewRow
                                label="Surcharge Rate"
                                value={
                                    coverage.outOfAreaRate != null
                                        ? coverage.outOfAreaType === "per_distance"
                                            ? `${currency} ${coverage.outOfAreaRate.toFixed(2)} / ${distanceUnit}`
                                            : `${currency} ${coverage.outOfAreaRate.toFixed(2)}`
                                        : "—"
                                }
                            />
                        </>
                    ) : (
                        <ReviewRow label="Out of Area Surcharge" value="Not applied" />
                    )}
                </ReviewSection>
            </div>

            <div className="flex justify-between pt-6 border-t">
                <Button type="button" variant="outline" onClick={onPrev}>
                    Previous
                </Button>
                <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Service Rate
                </Button>
            </div>
        </div>
    )
}
