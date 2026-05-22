"use client"

import { useMemo, useRef, useState } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon, TrashIcon } from "@phosphor-icons/react"

import { fetchAddressSuggestions, type AddressSuggestion } from "@/lib/maps/geocode-autocomplete"
import { AddressesFormValues, addressesSchema } from "../booking-schema"
import { Button } from "@/components/ui/button"
import { PhoneInput } from "@/components/reui/phone-input"
import {
    Combobox,
    ComboboxContent,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupInput } from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"

const ADDRESS_FIELDS = [
    { name: "fullName" as const, label: "Full Name", placeholder: "Jane Smith" },
    { name: "email" as const, label: "Email", placeholder: "jane@hikyaku.com", type: "email" },
    { name: "phone" as const, label: "Phone", placeholder: "+81 90 0000 0000" },
    { name: "address" as const, label: "Address", placeholder: "1-1 Chiyoda" }
]

function AddressAutocomplete({
    value,
    onChange,
    onSuggestionSelect,
    id,
    placeholder,
    "aria-invalid": ariaInvalid,
}: {
    value: string
    onChange: (value: string) => void
    onSuggestionSelect?: (suggestion: AddressSuggestion) => void
    id?: string
    placeholder?: string
    "aria-invalid"?: boolean
}) {
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
    const [loading, setLoading] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    function handleInputChange(text: string) {
        if (timerRef.current) clearTimeout(timerRef.current)
        if (!text.trim()) {
            setSuggestions([])
            return
        }
        timerRef.current = setTimeout(async () => {
            setLoading(true)
            try {
                setSuggestions(await fetchAddressSuggestions(text))
            } catch {
                setSuggestions([])
            } finally {
                setLoading(false)
            }
        }, 450)
    }

    return (
        <Combobox
            value={value}
            onValueChange={(v) => {
                const match = suggestions.find((s) => s.label === v)
                onChange(v as string)
                if (match) onSuggestionSelect?.(match)
                setSuggestions([])
            }}
        >
            <ComboboxInput
                id={id}
                placeholder={placeholder}
                aria-invalid={ariaInvalid}
                loading={loading}
                showTrigger={false}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    onChange(e.target.value)
                    handleInputChange(e.target.value)
                }}
            />
            {suggestions.length > 0 && (
                <ComboboxContent>
                    <ComboboxList>
                        {suggestions.map((s) => (
                            <ComboboxItem key={s.label} value={s.label}>
                                {s.label}
                            </ComboboxItem>
                        ))}
                    </ComboboxList>
                </ComboboxContent>
            )}
        </Combobox>
    )
}

function AddressSection({
    title,
    prefix,
    form,
}: {
    title: string
    prefix: "sender"
    form: ReturnType<typeof useForm<AddressesFormValues>>
}) {
    return (
        <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {title}
            </p>
            <FieldGroup>
                {ADDRESS_FIELDS.map(({ name, label, placeholder, type }) => (
                    <Controller
                        key={name}
                        name={`${prefix}.${name}`}
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel htmlFor={`${prefix}-${name}`}>{label}</FieldLabel>
                                {name === "phone" ? (
                                    <PhoneInput
                                        id={`${prefix}-${name}`}
                                        value={field.value}
                                        onChange={(value) => field.onChange(value ?? "")}
                                        defaultCountry="AU"
                                        aria-invalid={fieldState.invalid}
                                    />
                                ) : name === "address" ? (
                                    <AddressAutocomplete
                                        value={field.value}
                                        onChange={field.onChange}
                                        onSuggestionSelect={(s) => {
                                            form.setValue("sender.lat", s.lat)
                                            form.setValue("sender.lon", s.lon)
                                            form.setValue("sender.street", s.street)
                                            form.setValue("sender.suburb", s.suburb)
                                            form.setValue("sender.state", s.state)
                                            form.setValue("sender.country", s.country)
                                        }}
                                        id={`${prefix}-${name}`}
                                        placeholder={placeholder}
                                        aria-invalid={fieldState.invalid}
                                    />
                                ) : (
                                    <InputGroup>
                                        <InputGroupInput
                                            {...field}
                                            id={`${prefix}-${name}`}
                                            type={type ?? "text"}
                                            placeholder={placeholder}
                                            aria-invalid={fieldState.invalid}
                                        />
                                    </InputGroup>
                                )}
                                {fieldState.invalid && (
                                    <FieldError errors={[fieldState.error]} />
                                )}
                            </Field>
                        )}
                    />
                ))}
            </FieldGroup>
        </div>
    )
}

function RecipientSection({
    index,
    form,
}: {
    index: number
    form: ReturnType<typeof useForm<AddressesFormValues>>
}) {
    return (
        <FieldGroup>
            {ADDRESS_FIELDS.map(({ name, label, placeholder, type }) => (
                <Controller
                    key={name}
                    name={`recipients.${index}.${name}`}
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={`recipient-${index}-${name}`}>{label}</FieldLabel>
                            {name === "phone" ? (
                                <PhoneInput
                                    id={`recipient-${index}-${name}`}
                                    value={field.value}
                                    onChange={(value) => field.onChange(value ?? "")}
                                    aria-invalid={fieldState.invalid}
                                    defaultCountry="AU"
                                />
                            ) : name === "address" ? (
                                <AddressAutocomplete
                                    value={field.value}
                                    onChange={field.onChange}
                                    onSuggestionSelect={(s) => {
                                        form.setValue(`recipients.${index}.lat` as `recipients.${number}.lat`, s.lat)
                                        form.setValue(`recipients.${index}.lon` as `recipients.${number}.lon`, s.lon)
                                        form.setValue(`recipients.${index}.street` as `recipients.${number}.street`, s.street)
                                        form.setValue(`recipients.${index}.suburb` as `recipients.${number}.suburb`, s.suburb)
                                        form.setValue(`recipients.${index}.state` as `recipients.${number}.state`, s.state)
                                        form.setValue(`recipients.${index}.country` as `recipients.${number}.country`, s.country)
                                    }}
                                    id={`recipient-${index}-${name}`}
                                    placeholder={placeholder}
                                    aria-invalid={fieldState.invalid}
                                />
                            ) : (
                                <InputGroup>
                                    <InputGroupInput
                                        {...field}
                                        id={`recipient-${index}-${name}`}
                                        type={type ?? "text"}
                                        placeholder={placeholder}
                                        aria-invalid={fieldState.invalid}
                                    />
                                </InputGroup>
                            )}
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
            ))}
        </FieldGroup>
    )
}

export function AddressesStep({
    defaultValues,
    onNext,
    onPrev,
}: {
    defaultValues?: AddressesFormValues
    onNext: (data: AddressesFormValues) => void
    onPrev: () => void
}) {
    const emptyAddress = {
        fullName: "",
        email: "",
        phone: "",
        address: ""
    }

    const initial = useMemo(
        () =>
            defaultValues ?? {
                sender: emptyAddress,
                recipients: [emptyAddress],
            },
        [defaultValues]
    )

    const form = useForm<AddressesFormValues>({
        resolver: zodResolver(addressesSchema),
        defaultValues: initial,
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "recipients",
    })

    return (
        <form
            id="addresses"
            onSubmit={form.handleSubmit(onNext)}
            className="space-y-8 p-4"
        >
            <div>
                <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                    Addresses
                </h3>
                <p className="text-muted-foreground mt-2 leading-7">
                    Enter the pickup and delivery contact details.
                </p>
            </div>

            <AddressSection title="Sender" prefix="sender" form={form} />

            <Separator />

            <div className="space-y-6">
                {fields.map((fieldItem, index) => (
                    <div key={fieldItem.id} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {fields.length === 1 ? "Recipient" : `Recipient ${index + 1}`}
                            </p>
                            {fields.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1 text-destructive hover:text-destructive"
                                    onClick={() => remove(index)}
                                >
                                    <TrashIcon className="size-3.5" />
                                    Remove
                                </Button>
                            )}
                        </div>
                        <RecipientSection index={index} form={form} />
                        {index < fields.length - 1 && <Separator />}
                    </div>
                ))}

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => append(emptyAddress)}
                >
                    <PlusIcon className="size-4" />
                    Add Another Recipient
                </Button>
            </div>

            <div className="flex justify-between pt-6 border-t">
                <Button type="button" variant="outline" onClick={onPrev}>
                    Previous
                </Button>
                <Button type="submit">Next</Button>
            </div>
        </form>
    )
}
