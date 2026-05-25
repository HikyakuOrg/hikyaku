'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useOrgSlug } from '@/lib/use-org'
import { createWarehouse } from '@/lib/supabase/db'
import { getOrganisationIdBySlug } from '@/lib/supabase/db'

const warehouseSchema = z.object({
    warehouseName: z.string().min(1, 'Warehouse name is required'),
    warehouseAddress: z.string().min(1, 'Warehouse address is required'),
    warehouseCity: z.string().min(1, 'City is required'),
    warehouseState: z.string().min(1, 'State is required'),
    warehouseCountry: z.string().min(1, 'Country is required'),
    warehousePostcode: z.string().min(1, 'Postcode is required'),
    warehouseLat: z.number(),
    warehouseLon: z.number(),
})

type WarehouseFormValues = z.infer<typeof warehouseSchema>

const defaultValues: WarehouseFormValues = {
    warehouseName: '',
    warehouseAddress: '',
    warehouseCity: '',
    warehouseState: '',
    warehouseCountry: '',
    warehousePostcode: '',
    warehouseLat: 0,
    warehouseLon: 0,
}

export default function AddWarehousePage() {
    const router = useRouter()
    const slug = useOrgSlug()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<WarehouseFormValues>({
        resolver: zodResolver(warehouseSchema),
        defaultValues,
    })

    const { errors } = form.formState
    const hasMissingAddressDetails = Boolean(
        errors.warehouseCity ||
        errors.warehouseState ||
        errors.warehouseCountry ||
        errors.warehouseLat ||
        errors.warehouseLon
    )

    async function handleSubmit(values: WarehouseFormValues) {
        setIsSubmitting(true)
        try {
            const organisationId = await getOrganisationIdBySlug(slug)
            const warehouse = await createWarehouse({
                organisation_id: organisationId,
                warehouse_name: values.warehouseName,
                warehouse_address: values.warehouseAddress,
                warehouse_location: {
                    type: 'Point',
                    coordinates: [values.warehouseLon, values.warehouseLat],
                },
                warehouse_country: values.warehouseCountry,
                warehouse_zipcode: values.warehousePostcode,
                warehouse_state: values.warehouseState,
                warehouse_city: values.warehouseCity,
            })
            toast.success('Warehouse added successfully')
            router.push(`/orgs/${slug}/dashboard/service/warehouse/${warehouse!.id}`)
        } catch (error: any) {
            toast.error(error.message || 'Failed to add warehouse')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Add Warehouse</h1>
                <p className="text-muted-foreground">
                    Register a new warehouse for your logistics operations.
                </p>
            </div>

            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <Field className="space-y-2">
                    <FieldLabel htmlFor="warehouse-name">Warehouse Name</FieldLabel>
                    <Input
                        id="warehouse-name"
                        placeholder="Enter warehouse name"
                        disabled={isSubmitting}
                        {...form.register('warehouseName')}
                    />
                    {errors.warehouseName && (
                        <FieldError>{errors.warehouseName.message}</FieldError>
                    )}
                </Field>

                <Controller
                    name="warehouseAddress"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field className="space-y-2">
                            <FieldLabel htmlFor="warehouse-address">Address</FieldLabel>
                            <AddressAutocomplete
                                id="warehouse-address"
                                value={field.value}
                                onChange={field.onChange}
                                onSuggestionSelect={(s) => {
                                    form.setValue('warehouseCity', s.suburb)
                                    form.setValue('warehouseState', s.state)
                                    form.setValue('warehouseCountry', s.country)
                                    form.setValue('warehousePostcode', s.postcode)
                                    form.setValue('warehouseLat', s.lat)
                                    form.setValue('warehouseLon', s.lon)
                                }}
                                placeholder="Enter warehouse address"
                                aria-invalid={fieldState.invalid}
                            />
                            {fieldState.error ? (
                                <FieldError>{fieldState.error.message}</FieldError>
                            ) : hasMissingAddressDetails ? (
                                <FieldError>Select an address from the suggestions.</FieldError>
                            ) : null}
                        </Field>
                    )}
                />

                <div className="flex items-center justify-end gap-2 pt-6">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => router.push(`/orgs/${slug}/dashboard/service/warehouse`)}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        Add Warehouse
                    </Button>
                </div>
            </form>
        </div>
    )
}
