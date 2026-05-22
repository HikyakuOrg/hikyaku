"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ReactNode, useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { PhoneInput } from "@/components/reui/phone-input"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { customerSchema, type CustomerFormValues } from "./customer-schema"

const defaultValues: CustomerFormValues = {
    customerName: "",
    customerPhone: "",
    customerCountry: "",
    customerAddress: "",
    customerSuburb: "",
    customerState: "",
    customerPostcode: "",
    customerLat: 0,
    customerLon: 0
}

type CustomerFormProps = {
    onSubmit: (values: CustomerFormValues) => Promise<void>
    isSubmitting: boolean
    footer?: ReactNode
    className?: string
    initialValues?: Partial<CustomerFormValues>
}

export function CustomerForm({
    onSubmit,
    isSubmitting,
    footer,
    className,
    initialValues,
}: CustomerFormProps) {
    const form = useForm<CustomerFormValues>({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            ...defaultValues,
            ...initialValues,
        },
    })

    useEffect(() => {
        form.reset({
            ...defaultValues,
            ...initialValues,
        })
    }, [form, initialValues])

    const { errors } = form.formState
    const hasMissingAddressDetails = Boolean(
        errors.customerSuburb ||
        errors.customerState ||
        errors.customerCountry ||
        errors.customerLat ||
        errors.customerLon
    )

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
            <div className="space-y-6">
                <Field className="space-y-2">
                    <FieldLabel htmlFor="customer-name">Name</FieldLabel>

                    <Input
                        id="customer-name"
                        placeholder="Enter customer name"
                        disabled={isSubmitting}
                        {...form.register("customerName")}
                    />

                    {form.formState.errors.customerName && (
                        <FieldError>
                            {form.formState.errors.customerName.message}
                        </FieldError>
                    )}
                </Field>

                <Controller
                    name="customerPhone"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field className="space-y-2">
                            <FieldLabel htmlFor="customer-phone">
                                Phone Number
                            </FieldLabel>

                            <PhoneInput
                                id="customer-phone"
                                placeholder="Enter phone number"
                                defaultCountry="AU"
                                value={field.value}
                                disabled={isSubmitting}
                                onChange={(value) => field.onChange(value ?? "")}
                            />

                            {fieldState.error && (
                                <FieldError>{fieldState.error.message}</FieldError>
                            )}
                        </Field>
                    )}
                />

                <Controller
                    name="customerAddress"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field className="space-y-2">
                            <FieldLabel htmlFor="customer-address">
                                Address
                            </FieldLabel>

                            <AddressAutocomplete
                                id="customer-address"
                                value={field.value}
                                onChange={field.onChange}
                                onSuggestionSelect={(s) => {
                                    form.setValue("customerSuburb", s.suburb)
                                    form.setValue("customerState", s.state)
                                    form.setValue("customerCountry", s.country)
                                    form.setValue("customerPostcode", s.postcode)
                                    form.setValue("customerLat", s.lat)
                                    form.setValue("customerLon", s.lon)
                                }}
                                placeholder="Enter customer address"
                                aria-invalid={fieldState.invalid}
                            />

                            {fieldState.error ? (
                                <FieldError>{fieldState.error.message}</FieldError>
                            ) : hasMissingAddressDetails ? (
                                <FieldError>
                                    Select an address from the suggestions.
                                </FieldError>
                            ) : null}
                        </Field>
                    )}
                />
            </div>

            {footer}
        </form>
    )
}