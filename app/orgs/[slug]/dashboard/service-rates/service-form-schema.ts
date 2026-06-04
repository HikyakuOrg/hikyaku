import { z } from "zod/v4"

export const PRICING_UNITS = [
    "per_delivery",
    "per_km",
    "per_mi",
    "per_kg",
    "per_lb",
    "per_recipient",
] as const

// Services and add-ons share the same admin form (name + amount + billed-per).
export const catalogItemSchema = z.object({
    name: z.string().min(1, "Name is required"),
    amount: z.number().min(0.01, "Amount must be greater than 0"),
    pricingUnit: z.enum(PRICING_UNITS),
})

export type CatalogItemFormValues = z.infer<typeof catalogItemSchema>
