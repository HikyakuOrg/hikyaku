"use client"

import { useMemo } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { PackageIcon, CalendarIcon } from "@phosphor-icons/react"

import { PackageFormValues, packageSchema } from "../booking-schema"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group"

const DELIVERY_TYPES = [
    {
        value: "on_demand" as const,
        label: "On Demand",
        description: "Same-day pickup and delivery at specific times.",
        icon: PackageIcon,
    },
    {
        value: "scheduled" as const,
        label: "Scheduled",
        description: "Pick up on one day and deliver at a future date.",
        icon: CalendarIcon,
    },
]

export function PackageStep({
    defaultValues,
    onNext,
}: {
    defaultValues?: PackageFormValues
    onNext: (data: PackageFormValues) => void
}) {
    const initial = useMemo(
        () =>
            defaultValues ?? {
                deliveryType: "on_demand" as const,
                description: "",
                weight: undefined as unknown as number,
                weightUnit: "kg" as const,
                length: undefined as unknown as number,
                width: undefined as unknown as number,
                height: undefined as unknown as number,            },
        [defaultValues]
    )

    const form = useForm<PackageFormValues>({
        resolver: zodResolver(packageSchema),
        defaultValues: initial,
    })

    const weightUnit = form.watch("weightUnit")

    return (
        <form
            id="package"
            onSubmit={form.handleSubmit(onNext)}
            className="space-y-8 p-4"
        >
            <div>
                <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                    Package Details
                </h3>
                <p className="text-muted-foreground mt-2 leading-7">
                    Tell us about your shipment and how quickly you need it delivered.
                </p>
            </div>

            <FieldGroup>
                {/* Delivery Type */}
                <Controller
                    name="deliveryType"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Delivery Type</FieldLabel>
                            <div className="grid grid-cols-2 gap-4">
                                {DELIVERY_TYPES.map(({ value, label, description, icon: Icon }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => field.onChange(value)}
                                        className={cn(
                                            "rounded-lg border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                            field.value === value
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-primary/40 hover:bg-muted/30"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <Icon
                                                size={20}
                                                className={cn(
                                                    "mt-0.5 shrink-0",
                                                    field.value === value
                                                        ? "text-primary"
                                                        : "text-muted-foreground"
                                                )}
                                            />
                                            <div>
                                                <p
                                                    className={cn(
                                                        "font-semibold",
                                                        field.value === value
                                                            ? "text-primary"
                                                            : "text-foreground"
                                                    )}
                                                >
                                                    {label}
                                                </p>
                                                <p className="text-muted-foreground mt-1 text-sm">
                                                    {description}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />

                {/* Description */}
                <Controller
                    name="description"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="pkg-description">Description</FieldLabel>
                            <InputGroup>
                                <InputGroupInput
                                    {...field}
                                    id="pkg-description"
                                    placeholder="e.g. Electronic components, clothing, documents"
                                    aria-invalid={fieldState.invalid}
                                />
                            </InputGroup>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />

                {/* Weight */}
                <Controller
                    name="weight"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="pkg-weight">Weight</FieldLabel>
                            <div className="flex gap-2 items-start">
                                <InputGroup className="flex-1">
                                    <InputGroupInput
                                        {...field}
                                        id="pkg-weight"
                                        type="number"
                                        min={0.01}
                                        step="0.01"
                                        placeholder="0.00"
                                        value={field.value ?? ""}
                                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                        aria-invalid={fieldState.invalid}
                                    />
                                    <InputGroupAddon align="inline-end">{weightUnit}</InputGroupAddon>
                                </InputGroup>
                                <Controller
                                    name="weightUnit"
                                    control={form.control}
                                    render={({ field: unitField }) => (
                                        <div className="flex gap-1">
                                            {(["kg", "lb"] as const).map((unit) => (
                                                <Button
                                                    key={unit}
                                                    type="button"
                                                    variant={unitField.value === unit ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => unitField.onChange(unit)}
                                                >
                                                    {unit}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                />
                            </div>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />

                {/* Dimensions */}
                <Field>
                    <FieldLabel>Dimensions (cm)</FieldLabel>
                    <div className="grid grid-cols-3 gap-2">
                        {(
                            [
                                { name: "length" as const, placeholder: "Length" },
                                { name: "width" as const, placeholder: "Width" },
                                { name: "height" as const, placeholder: "Height" },
                            ] as const
                        ).map(({ name, placeholder }) => (
                            <Controller
                                key={name}
                                name={name}
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <div>
                                        <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                type="number"
                                                min={0.1}
                                                step="0.1"
                                                placeholder={placeholder}
                                                value={field.value ?? ""}
                                                onChange={(e) =>
                                                    field.onChange(e.target.valueAsNumber)
                                                }
                                                aria-label={placeholder}
                                                aria-invalid={fieldState.invalid}
                                            />
                                            <InputGroupAddon align="inline-end">cm</InputGroupAddon>
                                        </InputGroup>
                                        {fieldState.invalid && (
                                            <p className="text-destructive text-xs mt-1">
                                                {fieldState.error?.message}
                                            </p>
                                        )}
                                    </div>
                                )}
                            />
                        ))}
                    </div>
                </Field>
            </FieldGroup>

            <div className="flex justify-end pt-6 border-t">
                <Button type="submit">Next</Button>
            </div>
        </form>
    )
}
