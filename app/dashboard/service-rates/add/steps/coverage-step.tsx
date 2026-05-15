"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CaretDownIcon, XIcon } from "@phosphor-icons/react"

import { CoverageFormValues, coverageSchema } from "../service-rate-schema"
import { SelectedServiceArea } from "../service-rate-stepper"
import { searchServiceArea } from "@/lib/supabase/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export function CoverageStep({
    defaultValues,
    defaultSelectedServiceAreas,
    onNext,
    onPrev,
    currency,
    distanceUnit,
}: {
    defaultValues?: CoverageFormValues
    defaultSelectedServiceAreas?: SelectedServiceArea[]
    onNext: (data: CoverageFormValues, selectedAreas: SelectedServiceArea[]) => void
    onPrev: () => void
    currency: string
    distanceUnit: "km" | "mi"
}) {
    const initial = useMemo(
        () =>
            defaultValues ?? {
                serviceAreaIds: [],
                hasSignatureCharge: false,
                signatureCharge: undefined,
                hasOutOfAreaSurcharge: false,
                outOfAreaType: undefined,
                outOfAreaRate: undefined,
            },
        [defaultValues]
    )

    const form = useForm<CoverageFormValues>({
        resolver: zodResolver(coverageSchema),
        defaultValues: initial,
    })

    const [serviceAreaPopoverOpen, setServiceAreaPopoverOpen] = useState(false)
    const [serviceAreaSearch, setServiceAreaSearch] = useState("")
    const [serviceAreas, setServiceAreas] = useState<SelectedServiceArea[]>([])
    const [selectedServiceAreas, setSelectedServiceAreas] = useState<SelectedServiceArea[]>(
        defaultSelectedServiceAreas ?? []
    )
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
            const results = await searchServiceArea(serviceAreaSearch)
            setServiceAreas(results)
        }, 300)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [serviceAreaSearch])

    useEffect(() => {
        if (serviceAreaPopoverOpen && serviceAreas.length === 0) {
            searchServiceArea("").then(setServiceAreas)
        }
    }, [serviceAreaPopoverOpen])

    const hasSignatureCharge = form.watch("hasSignatureCharge")
    const hasOutOfAreaSurcharge = form.watch("hasOutOfAreaSurcharge")
    const outOfAreaType = form.watch("outOfAreaType")

    const distanceUnitLabel = distanceUnit === "km" ? "Kilometre" : "Mile"

    return (
        <form
            id="coverage"
            onSubmit={form.handleSubmit((data) => onNext(data, selectedServiceAreas))}
            className="space-y-8 p-4"
        >
            <div>
                <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                    Coverage & Add-ons
                </h3>
                <p className="text-muted-foreground mt-2 leading-7">
                    Select the service areas this rate applies to and configure optional
                    surcharges.
                </p>
            </div>

            <FieldGroup>
                {/* Service areas multi-select */}
                <Controller
                    name="serviceAreaIds"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>
                                Applicable Service Areas
                            </FieldLabel>

                            <Popover
                                open={serviceAreaPopoverOpen}
                                onOpenChange={setServiceAreaPopoverOpen}
                            >
                                <PopoverTrigger>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        role="combobox"
                                        aria-invalid={fieldState.invalid}
                                        className="w-full justify-between font-normal"
                                    >
                                        {field.value.length > 0
                                            ? field.value.length === 1
                                                ? (selectedServiceAreas.find((a) => a.id === field.value[0])?.name ?? "1 service area selected")
                                                : `${field.value.length} service areas selected`
                                            : "Select service areas…"}
                                        <CaretDownIcon className="text-muted-foreground size-4 shrink-0" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-[--radix-popover-trigger-width] p-2"
                                    align="start"
                                >
                                    <div className="pb-2">
                                        <Input
                                            placeholder="Search service areas…"
                                            value={serviceAreaSearch}
                                            onChange={(e) => setServiceAreaSearch(e.target.value)}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1 max-h-56 overflow-y-auto">
                                        {serviceAreas.length === 0 ? (
                                            <p className="text-muted-foreground px-2 py-3 text-sm">
                                                No service areas found.
                                            </p>
                                        ) : (
                                            serviceAreas.map((area) => {
                                                const isChecked = field.value.includes(area.id)
                                                return (
                                                    <label
                                                        key={area.id}
                                                        className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50"
                                                    >
                                                        <Checkbox
                                                            checked={isChecked}
                                                            onCheckedChange={(checked) => {
                                                                const next = checked
                                                                    ? [...field.value, area.id]
                                                                    : field.value.filter(
                                                                        (id) => id !== area.id
                                                                    )
                                                                field.onChange(next)
                                                                if (checked) {
                                                                    setSelectedServiceAreas((prev) =>
                                                                        prev.some((a) => a.id === area.id)
                                                                            ? prev
                                                                            : [...prev, area]
                                                                    )
                                                                } else {
                                                                    setSelectedServiceAreas((prev) =>
                                                                        prev.filter((a) => a.id !== area.id)
                                                                    )
                                                                }
                                                            }}
                                                        />
                                                        <p className="text-sm font-medium leading-none">
                                                            {area.name}
                                                        </p>
                                                    </label>
                                                )
                                            })
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Selected service area chips */}
                            {field.value.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {selectedServiceAreas
                                        .filter((a) => field.value.includes(a.id))
                                        .map((a) => (
                                            <Badge key={a.id} variant="secondary" className="gap-1">
                                                {a.name}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        field.onChange(
                                                            field.value.filter((id) => id !== a.id)
                                                        )
                                                        setSelectedServiceAreas((prev) =>
                                                            prev.filter((sa) => sa.id !== a.id)
                                                        )
                                                    }}
                                                    className="ml-0.5 rounded-full hover:text-destructive"
                                                    aria-label={`Remove ${a.name}`}
                                                >
                                                    <XIcon className="size-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                </div>
                            )}

                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />

                {/* Signature on Delivery Charge */}
                <Controller
                    name="hasSignatureCharge"
                    control={form.control}
                    render={({ field }) => (
                        <Field>
                            <label className="flex cursor-pointer items-center gap-3">
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                        field.onChange(!!checked)
                                        if (!checked) form.setValue("signatureCharge", undefined)
                                    }}
                                />
                                <div>
                                    <p className="text-sm font-medium">
                                        Signature on Delivery Charge
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                        Apply an additional fee when a signature is required upon
                                        delivery.
                                    </p>
                                </div>
                            </label>
                        </Field>
                    )}
                />

                {hasSignatureCharge && (
                    <Controller
                        name="signatureCharge"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} className="ml-7">
                                <FieldLabel htmlFor="signature-charge">
                                    Signature Charge
                                </FieldLabel>
                                <InputGroup>
                                    <InputGroupAddon align="inline-start">
                                        {currency}
                                    </InputGroupAddon>
                                    <InputGroupInput
                                        {...field}
                                        id="signature-charge"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        placeholder="0.00"
                                        value={field.value ?? ""}
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
                )}

                {/* Out of Service Area Surcharge */}
                <Controller
                    name="hasOutOfAreaSurcharge"
                    control={form.control}
                    render={({ field }) => (
                        <Field>
                            <label className="flex cursor-pointer items-center gap-3">
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                        field.onChange(!!checked)
                                        if (!checked) {
                                            form.setValue("outOfAreaType", undefined)
                                            form.setValue("outOfAreaRate", undefined)
                                        } else {
                                            form.setValue("outOfAreaType", "flat")
                                        }
                                    }}
                                />
                                <div>
                                    <p className="text-sm font-medium">
                                        Out of Service Area Surcharge
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                        Apply an additional charge for deliveries beyond your
                                        service zone boundary.
                                    </p>
                                </div>
                            </label>
                        </Field>
                    )}
                />

                {hasOutOfAreaSurcharge && (
                    <>
                        {/* Surcharge type toggle */}
                        <Controller
                            name="outOfAreaType"
                            control={form.control}
                            render={({ field }) => (
                                <Field className="ml-7">
                                    <FieldLabel>Surcharge Type</FieldLabel>
                                    <div className="flex gap-2">
                                        {(
                                            [
                                                { value: "flat", label: "Flat Rate" },
                                                {
                                                    value: "per_distance",
                                                    label: `Per ${distanceUnitLabel}`,
                                                },
                                            ] as const
                                        ).map(({ value, label }) => (
                                            <Button
                                                key={value}
                                                type="button"
                                                variant={
                                                    field.value === value ? "default" : "outline"
                                                }
                                                size="sm"
                                                onClick={() => {
                                                    field.onChange(value)
                                                    form.setValue("outOfAreaRate", undefined)
                                                }}
                                            >
                                                {label}
                                            </Button>
                                        ))}
                                    </div>
                                </Field>
                            )}
                        />

                        {/* Surcharge rate */}
                        <Controller
                            name="outOfAreaRate"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid} className="ml-7">
                                    <FieldLabel htmlFor="out-of-area-rate">
                                        {outOfAreaType === "per_distance"
                                            ? `Rate per ${distanceUnitLabel} (beyond service zone)`
                                            : "Flat Surcharge Amount"}
                                    </FieldLabel>
                                    <InputGroup>
                                        <InputGroupAddon align="inline-start">
                                            {currency}
                                        </InputGroupAddon>
                                        <InputGroupInput
                                            {...field}
                                            id="out-of-area-rate"
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            placeholder="0.00"
                                            value={field.value ?? ""}
                                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                            aria-invalid={fieldState.invalid}
                                        />
                                        {outOfAreaType === "per_distance" && (
                                            <InputGroupAddon align="inline-end">
                                                /{distanceUnit}
                                            </InputGroupAddon>
                                        )}
                                    </InputGroup>
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </Field>
                            )}
                        />
                    </>
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
