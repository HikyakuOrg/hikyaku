"use client"

import { useMemo } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { PricingFormValues, pricingSchema } from "../service-rate-schema"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group"

export function PricingStep({
    defaultValues,
    onNext,
    onPrev,
    currency,
    deliveryType,
}: {
    defaultValues?: PricingFormValues
    onNext: (data: PricingFormValues) => void
    onPrev: () => void
    currency: string
    deliveryType: "on_demand" | "scheduled"
}) {
    const initial = useMemo(
        () =>
            defaultValues ?? {
                baseRate: 0,
                distanceUnit: "km" as const,
                ratePerDistance: 0,
                storagePerDay: undefined,
            },
        [defaultValues]
    )

    const form = useForm<PricingFormValues>({
        resolver: zodResolver(pricingSchema),
        defaultValues: initial,
    })

    const distanceUnit = form.watch("distanceUnit")
    const distanceUnitLabel = distanceUnit === "km" ? "Kilometre" : "Mile"

    return (
        <form
            id="pricing"
            onSubmit={form.handleSubmit(onNext)}
            className="space-y-8 p-4"
        >
            <div>
                <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                    Pricing
                </h3>
                <p className="text-muted-foreground mt-2 leading-7">
                    Set the base charge and distance-based rates. All amounts are in{" "}
                    {currency}.
                </p>
            </div>

            <FieldGroup>
                {/* Base Rate */}
                <Controller
                    name="baseRate"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="base-rate">
                                Base Rate
                            </FieldLabel>
                            <InputGroup>
                                <InputGroupAddon align="inline-start">{currency}</InputGroupAddon>
                                <InputGroupInput
                                    {...field}
                                    id="base-rate"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="0.00"
                                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                    aria-invalid={fieldState.invalid}
                                />
                            </InputGroup>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />

                {/* Distance Unit */}
                <Controller
                    name="distanceUnit"
                    control={form.control}
                    render={({ field }) => (
                        <Field>
                            <FieldLabel>Distance Unit</FieldLabel>
                            <div className="flex gap-2">
                                {(
                                    [
                                        { value: "km", label: "Kilometres" },
                                        { value: "mi", label: "Miles" },
                                    ] as const
                                ).map(({ value, label }) => (
                                    <Button
                                        key={value}
                                        type="button"
                                        variant={field.value === value ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => field.onChange(value)}
                                    >
                                        {label}
                                    </Button>
                                ))}
                            </div>
                        </Field>
                    )}
                />

                {/* Rate Per Distance */}
                <Controller
                    name="ratePerDistance"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="rate-per-distance">
                                Rate per {distanceUnitLabel}
                            </FieldLabel>
                            <InputGroup>
                                <InputGroupAddon align="inline-start">{currency}</InputGroupAddon>
                                <InputGroupInput
                                    {...field}
                                    id="rate-per-distance"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="0.00"
                                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                    aria-invalid={fieldState.invalid}
                                />
                                <InputGroupAddon align="inline-end">
                                    /{distanceUnit}
                                </InputGroupAddon>
                            </InputGroup>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />

                {/* Storage Per Day — Scheduled delivery only */}
                {deliveryType === "scheduled" && (
                    <Controller
                        name="storagePerDay"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor="storage-per-day">
                                    Storage per Day
                                </FieldLabel>
                                <InputGroup>
                                    <InputGroupAddon align="inline-start">
                                        {currency}
                                    </InputGroupAddon>
                                    <InputGroupInput
                                        {...field}
                                        id="storage-per-day"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        placeholder="0.00"
                                        value={field.value ?? ""}
                                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                        aria-invalid={fieldState.invalid}
                                    />
                                    <InputGroupAddon align="inline-end">/ day</InputGroupAddon>
                                </InputGroup>
                                {fieldState.invalid && (
                                    <FieldError errors={[fieldState.error]} />
                                )}
                            </Field>
                        )}
                    />
                )}
            </FieldGroup>

            <div className="flex justify-between pt-6 border-t">
                <Button type="button" variant="outline" onClick={onPrev}>
                    Previous
                </Button>
                <Button type="submit">Next</Button>
            </div>
        </form>
    )
}
