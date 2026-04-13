import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import PhoneInput, { getCountries } from "react-phone-number-input"
import "react-phone-number-input/style.css"
import flags from "react-phone-number-input/flags"

import { cn } from "@/lib/utils"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { customerSchema } from "./add-customer-schema"

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import z from "zod/v4"
import { createCustomer } from "@/lib/supabase/db"
import { geocodeAddress } from "@/lib/maps/geo"
import { useState } from "react"
import { toast } from "sonner"

interface AddCustomerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCustomerAdded: (customer: Customer) => void
}

export function AddCustomerDialog({ open, onOpenChange, onCustomerAdded }: AddCustomerDialogProps) {

    const [isLoading, setIsLoading] = useState(false)

    const form = useForm({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            customerName: "",
            customerPhone: "",
            customerCountry: "",
            customerAddress: "",
            customerSuburb: "",
            customerState: "",
            customerPostcode: "",
        },
    })

    function getCountryName(locale = "en") {
        const countries = getCountries()
        const regionNames = new Intl.DisplayNames([locale], { type: "region" })

        return countries
            .map((c) => regionNames.of(c))
            .filter(Boolean) as string[]
    }

    const onSubmit = async () => {
        setIsLoading(true)
        try {
            const values = form.getValues()
            const geocode = await geocodeAddress({
                street: values.customerAddress,
                suburb: values.customerSuburb,
                state: values.customerState,
                country: values.customerCountry,
                postcode: values.customerPostcode
            })
            const lat = geocode?.lat
            const lng = geocode?.lon
            if (!lat || !lng) {
                throw new Error("Geocode not found")
            }
            const location: Point = {
                type: "Point",
                coordinates: [geocode.lon, geocode.lat],
            }

            const customer = await createCustomer({
                id: "",
                customer_name: values.customerName,
                customer_phone: values.customerPhone,
                customer_country: values.customerCountry,
                customer_address: values.customerAddress,
                customer_suburb: values.customerSuburb,
                customer_state: values.customerState,
                customer_postcode: values.customerPostcode,
                customer_location: location
            })
            onCustomerAdded(customer)
            toast.success("Customer created successfully")
            onOpenChange(false)
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setIsLoading(false)
        }
    }


    return (
        <>
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
                        <p className="text-sm text-muted-foreground">
                            Creating customer...
                        </p>
                    </div>
                </div>
            )}
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create Customer</DialogTitle>
                        <DialogDescription>
                            Create a new customer and add them to your customer list
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="-mx-4 max-h-[50vh] overflow-y-auto px-4">
                            <div className="space-y-6">

                                <Field className="space-y-2">
                                    <FieldLabel htmlFor="customer-name">
                                        Customer Name
                                    </FieldLabel>

                                    <Input
                                        id="customer-name"
                                        placeholder="Enter customer name"
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
                                                onChange={field.onChange}
                                                flags={flags}
                                                defaultCountry="AU"
                                                className={cn(
                                                    "dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-10 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] placeholder:text-muted-foreground w-full outline-none"
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
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select a country" />
                                                </SelectTrigger>

                                                <SelectContent className="w-[--radix-select-trigger-width]">
                                                    <SelectGroup>
                                                        <SelectLabel>Country</SelectLabel>

                                                        {getCountryName().map((country) => (
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
                                        {...form.register("customerSuburb")}
                                    />

                                    {form.formState.errors.customerSuburb && (
                                        <FieldError>
                                            {form.formState.errors.customerSuburb.message}
                                        </FieldError>
                                    )}
                                </Field>


                                <Field className="space-y-2">
                                    <FieldLabel htmlFor="customer-state">
                                        Customer State
                                    </FieldLabel>

                                    <Input
                                        id="customer-state"
                                        placeholder="Enter customer state"
                                        {...form.register("customerState")}
                                    />

                                    {form.formState.errors.customerState && (
                                        <FieldError>
                                            {form.formState.errors.customerState.message}
                                        </FieldError>
                                    )}
                                </Field>


                                <Field className="space-y-2">
                                    <FieldLabel htmlFor="customer-state">
                                        Customer Postcode
                                    </FieldLabel>

                                    <Input
                                        id="customer-postcode"
                                        placeholder="Enter customer postcode"
                                        {...form.register("customerPostcode")}
                                    />

                                    {form.formState.errors.customerPostcode && (
                                        <FieldError>
                                            {form.formState.errors.customerPostcode.message}
                                        </FieldError>
                                    )}
                                </Field>

                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <DialogClose>
                                <Button variant="outline">
                                    Cancel
                                </Button>
                            </DialogClose>

                            <Button type="submit">
                                Create Customer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}