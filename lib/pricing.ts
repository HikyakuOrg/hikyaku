import { formatCurrency } from "@/lib/currency"

export type PricingUnit =
    | "per_delivery"
    | "per_km"
    | "per_mi"
    | "per_kg"
    | "per_lb"
    | "per_recipient"

/** Options for the "Billed per" selector, in menu order. */
export const PRICING_UNIT_OPTIONS: { value: PricingUnit; label: string }[] = [
    { value: "per_delivery", label: "Per delivery" },
    { value: "per_km", label: "Per km" },
    { value: "per_mi", label: "Per mile" },
    { value: "per_kg", label: "Per kg" },
    { value: "per_lb", label: "Per lb" },
    { value: "per_recipient", label: "Per recipient" },
]

/** Short unit suffix for display, e.g. "km". Empty for the flat per_delivery. */
export function unitSuffix(unit: string): string {
    switch (unit) {
        case "per_km":
            return "km"
        case "per_mi":
            return "mi"
        case "per_kg":
            return "kg"
        case "per_lb":
            return "lb"
        case "per_recipient":
            return "recipient"
        default:
            return ""
    }
}

/**
 * Convert Stripe integer minor units to a major-unit number for display. Uses
 * the currency's own fraction-digit count, which matches Stripe for every
 * currency this product can charge in (usd/gbp/eur are all two-decimal).
 */
export function minorToMajor(amountMinor: number, currency: string): number {
    const digits =
        new Intl.NumberFormat("default", { style: "currency", currency })
            .resolvedOptions().maximumFractionDigits ?? 2
    return amountMinor / Math.pow(10, digits)
}

/** e.g. "$0.50 / km", or "$5.00" for a flat per_delivery rate. */
export function formatRate(amountMinor: number, currency: string, unit: string): string {
    const base = formatCurrency(minorToMajor(amountMinor, currency), currency)
    const suffix = unitSuffix(unit)
    return suffix ? `${base} / ${suffix}` : base
}
