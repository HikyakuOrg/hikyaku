"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ReactNode } from "react"
import { Controller, useForm } from "react-hook-form"
import PhoneInput, { getCountries } from "react-phone-number-input"
import "react-phone-number-input/style.css"
import flags from "react-phone-number-input/flags"

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { customerSchema, type CustomerFormValues } from "./customer-schema"

const defaultValues: CustomerFormValues = {
    customerName: "",
    customerPhone: "",
    customerCountry: "",
    customerAddress: "",
    customerSuburb: "",
    customerState: "",
    customerPostcode: "",
}

function getCountryNames(locale = "en") {
    const regionNames = new Intl.DisplayNames([locale], { type: "region" })

    return getCountries()
        .map((countryCode) => regionNames.of(countryCode))
        .filter(Boolean) as string[]
}

type CustomerFormProps = {
    onSubmit: (values: CustomerFormValues) => Promise<void>
    isSubmitting: boolean
    footer?: ReactNode
    className?: string
}

export function CustomerForm({
    onSubmit,
    isSubmitting,
    footer,
    className,
}: CustomerFormProps) {
    const form = useForm<CustomerFormValues>({
        resolver: zodResolver(customerSchema),
        defaultValues,
    })

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
            <div className="space-y-6">
                <Field className="space-y-2">
                    <FieldLabel htmlFor="customer-name">Customer Name</FieldLabel>

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
                                Customer Phone Number
                            </FieldLabel>

                            <PhoneInput
                                id="customer-phone"
                                placeholder="Enter phone number"
                                value={field.value}
                                onChange={(value) => field.onChange(value ?? "")}
                                flags={flags}
                                defaultCountry="AU"
                                disabled={isSubmitting}
                                className={cn(
                                    "dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground"
                                )}
                            />

                            {fieldState.error && (
                                <FieldError>{fieldState.error.message}</FieldError>
                            )}
                        </Field>
                    )}
                />

                <Controller
                    name="customerCountry"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field className="space-y-2">
                            <FieldLabel>Customer Country</FieldLabel>

                            <Select
                                value={field.value}
                                onValueChange={field.onChange}
                                disabled={isSubmitting}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a country" />
                                </SelectTrigger>

                                <SelectContent className="w-[--radix-select-trigger-width]">
                                    <SelectGroup>
                                        <SelectLabel>Country</SelectLabel>

                                        {getCountryNames().map((country) => (
                                            <SelectItem key={country} value={country}>
                                                {country}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>

                            {fieldState.error && (
                                <FieldError>{fieldState.error.message}</FieldError>
                            )}
                        </Field>
                    )}
                />

                <Field className="space-y-2">
                    <FieldLabel htmlFor="customer-address">
                        Customer Address
                    </FieldLabel>

                    <Input
                        id="customer-address"
                        placeholder="Enter customer address"
                        disabled={isSubmitting}
                        {...form.register("customerAddress")}
                    />

                    {form.formState.errors.customerAddress && (
                        <FieldError>
                            {form.formState.errors.customerAddress.message}
                        </FieldError>
                    )}
                </Field>

                <Field className="space-y-2">
                    <FieldLabel htmlFor="customer-suburb">
                        Customer Suburb
                    </FieldLabel>

                    <Input
                        id="customer-suburb"
                        placeholder="Enter customer suburb"
                        disabled={isSubmitting}
                        {...form.register("customerSuburb")}
                    />

                    {form.formState.errors.customerSuburb && (
                        <FieldError>
                            {form.formState.errors.customerSuburb.message}
                        </FieldError>
                    )}
                </Field>

                <Field className="space-y-2">
                    <FieldLabel htmlFor="customer-state">Customer State</FieldLabel>

                    <Input
                        id="customer-state"
                        placeholder="Enter customer state"
                        disabled={isSubmitting}
                        {...form.register("customerState")}
                    />

                    {form.formState.errors.customerState && (
                        <FieldError>
                            {form.formState.errors.customerState.message}
                        </FieldError>
                    )}
                </Field>

                <Field className="space-y-2">
                    <FieldLabel htmlFor="customer-postcode">
                        Customer Postcode
                    </FieldLabel>

                    <Input
                        id="customer-postcode"
                        placeholder="Enter customer postcode"
                        disabled={isSubmitting}
                        {...form.register("customerPostcode")}
                    />

                    {form.formState.errors.customerPostcode && (
                        <FieldError>
                            {form.formState.errors.customerPostcode.message}
                        </FieldError>
                    )}
                </Field>
            </div>

            {footer}
        </form>
    )
}