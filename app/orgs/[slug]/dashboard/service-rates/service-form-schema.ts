import { z } from "zod/v4"
import type { PricingUnit } from "@/lib/pricing"

// `satisfies` ties the form's options to the generated API union, so a unit the
// backend drops or renames fails the build instead of erroring at request time.
export const PRICING_UNITS = [
    "per_delivery",
    "per_km",
    "per_mi",
    "per_kg",
    "per_lb",
    "per_recipient",
] as const satisfies readonly PricingUnit[]

// Services and add-ons share the same admin form (name + amount + billed-per).
export const catalogItemSchema = z.object({
    name: z.string().min(1, "Name is required"),
    amount: z.number().min(0.01, "Amount must be greater than 0"),
    pricingUnit: z.enum(PRICING_UNITS),
})

export type CatalogItemFormValues = z.infer<typeof catalogItemSchema>

// A service also has a description (shown with the rate at storefront checkout)
// and amounts in other currencies (Stripe `currency_options`).
export const serviceSchema = catalogItemSchema.extend({
    description: z.string().max(500, "Keep the description under 500 characters"),
    currencyOptions: z
        .array(
            z.object({
                currency: z.string().regex(/^[a-z]{3}$/, "Pick a currency"),
                amount: z.number().min(0.01, "Amount must be greater than 0"),
            }),
        )
        .superRefine((options, ctx) => {
            const seen = new Set<string>()
            options.forEach((option, index) => {
                if (seen.has(option.currency)) {
                    ctx.addIssue({
                        code: "custom",
                        message: "This currency is already listed",
                        path: [index, "currency"],
                    })
                }
                seen.add(option.currency)
            })
        }),
})

export type ServiceFormValues = z.infer<typeof serviceSchema>
