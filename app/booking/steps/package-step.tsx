"use client"

import { useMemo } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { PackageIcon } from "@phosphor-icons/react"

import {
    PackageFormValues,
    ServiceOption,
    packageSchema,
} from "../booking-schema"
import { cn } from "@/lib/utils"
import { formatRate } from "@/lib/pricing"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@/components/ui/input-group"

export function PackageStep({
    defaultValues,
    services,
    onNext,
}: {
    defaultValues?: PackageFormValues
    services: ServiceOption[]
    onNext: (data: PackageFormValues) => void
}) {
    const initial = useMemo(
        () =>
            defaultValues ?? {
                serviceId: "",
                addonIds: [] as string[],
                description: "",
                weight: undefined as unknown as number,
                weightUnit: "kg" as const,
                length: undefined as unknown as number,
                width: undefined as unknown as number,
                height: undefined as unknown as number,
            },
        [defaultValues]
    )

    const form = useForm<PackageFormValues>({
        resolver: zodResolver(packageSchema),
        defaultValues: initial,
    })

    const weightUnit = form.watch("weightUnit")
    const selectedServiceId = form.watch("serviceId")
    const hasServices = services.length > 0
    const selectedService = services.find((s) => s.id === selectedServiceId)

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
                    Choose a service, add any extras, and tell us about your shipment.
                </p>
            </div>

            <FieldGroup>
                {/* Service */}
                <Controller
                    name="serviceId"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Service</FieldLabel>
                            {hasServices ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {services.map((service) => {
                                        const selected = field.value === service.id
                                        return (
                                            <button
                                                key={service.id}
                                                type="button"
                                                onClick={() => {
                                                    form.setValue("serviceId", service.id, {
                                                        shouldValidate: true,
                                                    })
                                                    // Add-ons belong to a service — reset on change.
                                                    form.setValue("addonIds", [])
                                                }}
                                                className={cn(
                                                    "rounded-lg border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                                    selected
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                                                )}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <PackageIcon
                                                        size={20}
                                                        className={cn(
                                                            "mt-0.5 shrink-0",
                                                            selected
                                                                ? "text-primary"
                                                                : "text-muted-foreground"
                                                        )}
                                                    />
                                                    <div>
                                                        <p
                                                            className={cn(
                                                                "font-semibold",
                                                                selected
                                                                    ? "text-primary"
                                                                    : "text-foreground"
                                                            )}
                                                        >
                                                            {service.name}
                                                        </p>
                                                        <p className="text-muted-foreground mt-1 text-sm tabular-nums">
                                                            {formatRate(
                                                                service.amount_minor,
                                                                service.currency,
                                                                service.pricing_unit
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                                    No services are currently available. Please try again later.
                                </p>
                            )}
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />

                {/* Add-ons — only once a service with extras is selected */}
                {selectedService && selectedService.addons.length > 0 && (
                    <Controller
                        name="addonIds"
                        control={form.control}
                        render={({ field }) => {
                            const value = field.value ?? []
                            const toggle = (id: string, checked: boolean) =>
                                field.onChange(
                                    checked
                                        ? [...value, id]
                                        : value.filter((v) => v !== id)
                                )
                            return (
                                <Field>
                                    <FieldLabel>Add-ons</FieldLabel>
                                    <div className="space-y-2">
                                        {selectedService.addons.map((addon) => (
                                            <label
                                                key={addon.id}
                                                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/30"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={value.includes(addon.id)}
                                                        onCheckedChange={(checked) =>
                                                            toggle(addon.id, !!checked)
                                                        }
                                                    />
                                                    <span className="text-sm font-medium">
                                                        {addon.name}
                                                    </span>
                                                </div>
                                                <span className="text-muted-foreground text-sm tabular-nums">
                                                    {formatRate(
                                                        addon.amount_minor,
                                                        addon.currency,
                                                        addon.pricing_unit
                                                    )}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </Field>
                            )
                        }}
                    />
                )}

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
                            <InputGroup>
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
                                <InputGroupAddon align="inline-end">
                                    <InputGroupButton
                                        type="button"
                                        onClick={() =>
                                            form.setValue(
                                                "weightUnit",
                                                weightUnit === "kg" ? "lb" : "kg"
                                            )
                                        }
                                    >
                                        {weightUnit}
                                    </InputGroupButton>
                                </InputGroupAddon>
                            </InputGroup>
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
                <Button type="submit" disabled={!hasServices}>
                    Next
                </Button>
            </div>
        </form>
    )
}
