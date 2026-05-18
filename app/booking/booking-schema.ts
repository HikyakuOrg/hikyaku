import { z } from "zod/v4"
import { isValidPhoneNumber } from "react-phone-number-input"

export const packageSchema = z.object({
    deliveryType: z.enum(["on_demand", "scheduled"]),
    description: z.string().min(1, "Description is required"),
    weight: z.number().min(0.01, "Weight must be greater than 0"),
    weightUnit: z.enum(["kg", "lb"]),
    length: z.number().min(0.1, "Length must be greater than 0"),
    width: z.number().min(0.1, "Width must be greater than 0"),
    height: z.number().min(0.1, "Height must be greater than 0")
})

export const addressSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.email("Enter a valid email"),
    phone: z.string().min(1, "Phone number is required").refine(isValidPhoneNumber, "Enter a valid phone number"),
    address: z.string().min(1, "Address is required"),
    // Populated when user selects from the address autocomplete dropdown
    lat: z.number().optional(),
    lon: z.number().optional(),
    street: z.string().optional(),
    suburb: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
})

export const addressesSchema = z.object({
    sender: addressSchema,
    recipients: z.array(addressSchema).min(1, "At least one recipient is required"),
})

export const scheduleSchema = z.object({
    pickupDate: z.string().min(1, "Pickup date is required"),
    pickupTimeFrom: z.string().optional(),
    pickupTimeTo: z.string().optional(),
    deliveryDate: z.string().min(1, "Delivery date is required"),
    deliveryTimeFrom: z.string().optional(),
    deliveryTimeTo: z.string().optional(),
    deliveryNotes: z.string().optional(),
    signatureRequired: z.boolean(),
})

export type PackageFormValues = z.infer<typeof packageSchema>
export type AddressesFormValues = z.infer<typeof addressesSchema>
export type ScheduleFormValues = z.infer<typeof scheduleSchema>
