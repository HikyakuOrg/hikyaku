"use client"

import { useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { PackageIcon, CalendarIcon } from "@phosphor-icons/react"

import { SetupFormValues, setupSchema } from "../service-rate-schema"
import { CurrencyIsoCodes, isoCodes } from "@/lib/currency"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupInput } from "@/components/ui/input-group"
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"

const DELIVERY_TYPES = [
    {
        value: "on_demand" as const,
        label: "On Demand",
        description: "Same-day delivery from Point A to Point B at specific times.",
        icon: PackageIcon,
    },
    {
        value: "scheduled" as const,
        label: "Scheduled",
        description: "Pick up, warehouse storage, and delivery at a future date.",
        icon: CalendarIcon,
    },
]

export function SetupStep({
    defaultValues,
    onNext,
}: {
    defaultValues?: SetupFormValues
    onNext: (data: SetupFormValues) => void
}) {
    const initial = useMemo(
        () =>
            defaultValues ?? {
                name: "",
                currency: "",
                deliveryType: "on_demand" as const,
            },
        [defaultValues]
    )

    const form = useForm<SetupFormValues>({
        resolver: zodResolver(setupSchema),
        defaultValues: initial,
    })

    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCurrency, setSelectedCurrency] = useState<string>(
        initial.currency ?? ""
    )

    const filteredCurrencies = useMemo(
        () =>
            CurrencyIsoCodes.filter((code) => {
                const lower = searchTerm.toLowerCase()
                return (
                    code.toLowerCase().includes(lower) ||
                    (isoCodes[code as keyof typeof isoCodes] ?? "").toLowerCase().includes(lower)
                )
            }),
        [searchTerm]
    )

    return (
        <form
            id="setup"
            onSubmit={form.handleSubmit(onNext)}
            className="space-y-8 p-4"
        >
            <div>
                <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                    Service Setup
                </h3>
                <p className="text-muted-foreground mt-2 leading-7">
                    Name your service rate, choose a billing currency, and select the
                    delivery type.
                </p>
            </div>

            <FieldGroup>
                <Controller
                    name="currency"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>
                                Currency
                            </FieldLabel>
                            <Combobox
                                value={selectedCurrency || null}
                                onValueChange={(code) => {
                                    const val = code ?? ""
                                    setSelectedCurrency(val)
                                    field.onChange(val)
                                    if (code) setSearchTerm("")
                                }}
                                items={filteredCurrencies}
                                itemToStringValue={(item) => item}
                            >
                                <ComboboxInput
                                    placeholder="Search currency code…"
                                    value={selectedCurrency ? `${isoCodes[selectedCurrency as keyof typeof isoCodes]} (${selectedCurrency})` : searchTerm}
                                    onChange={(e) => {
                                        const v = e.target.value
                                        setSearchTerm(v)
                                        if (selectedCurrency) {
                                            setSelectedCurrency("")
                                            field.onChange("")
                                        }
                                    }}
                                    aria-invalid={fieldState.invalid}
                                    showClear={!!selectedCurrency}
                                />
                                <ComboboxContent>
                                    <ComboboxEmpty>No currency found.</ComboboxEmpty>
                                    <ComboboxList>
                                        {(item: string) => (
                                            <ComboboxItem key={item} value={item}>
                                                {isoCodes[item as keyof typeof isoCodes]} ({item})
                                            </ComboboxItem>
                                        )}
                                    </ComboboxList>
                                </ComboboxContent>
                            </Combobox>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />

                {/* Name */}
                <Controller
                    name="name"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="service-rate-name">
                                Name
                            </FieldLabel>
                            <InputGroup>
                                <InputGroupInput
                                    {...field}
                                    id="service-rate-name"
                                    placeholder="e.g. Standard City Delivery"
                                    aria-invalid={fieldState.invalid}
                                />
                            </InputGroup>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />

                {/* Delivery Type */}
                <Controller
                    name="deliveryType"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>
                                Delivery Type
                            </FieldLabel>
                            <div className="grid grid-cols-2 gap-4">
                                {DELIVERY_TYPES.map(
                                    ({ value, label, description, icon: Icon }) => (
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
                                    )
                                )}
                            </div>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
            </FieldGroup>

            <div className="flex justify-end pt-6 border-t">
                <Button type="submit">Next</Button>
            </div>
        </form>
    )
}
