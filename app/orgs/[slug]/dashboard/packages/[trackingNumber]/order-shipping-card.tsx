import { Truck } from "lucide-react"

import type { Tables } from "@/lib/supabase/supabase"
import { formatCurrency } from "@/lib/currency"
import { minorToMajor } from "@/lib/pricing"

type ShippingFields = Pick<
    Tables<"packages">,
    | "shipping_service_name"
    | "shipping_price_minor"
    | "shipping_discounted_price_minor"
    | "shipping_currency"
>

/**
 * The Hikyaku rate the shopper chose at storefront checkout. It belongs to the
 * order, so every package split from that order shows the same line; don't add
 * them up across packages.
 */
export function OrderShippingCard({ pkg }: { pkg: ShippingFields }) {
    const {
        shipping_service_name: serviceName,
        shipping_price_minor: price,
        shipping_discounted_price_minor: discounted,
        shipping_currency: currency,
    } = pkg
    if (!serviceName && price == null) return null

    const format = (minor: number) =>
        currency ? formatCurrency(minorToMajor(minor, currency), currency) : String(minor)
    const hasDiscount = price != null && discounted != null && discounted !== price

    return (
        <div className="border rounded-xl p-6 bg-muted/30" data-testid="order-shipping">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold text-lg">Order Shipping</h3>
                    <p className="text-sm text-muted-foreground">
                        The rate the shopper chose at checkout, for the whole order
                    </p>
                </div>
            </div>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <dt className="text-sm text-muted-foreground">Service</dt>
                    <dd className="font-medium">{serviceName ?? "Hikyaku rate"}</dd>
                </div>
                {price != null && (
                    <div className="space-y-1">
                        <dt className="text-sm text-muted-foreground">Shipping charged</dt>
                        <dd className="font-medium tabular-nums">
                            {format(hasDiscount ? discounted : price)}
                        </dd>
                        {hasDiscount && (
                            <dd className="text-sm text-muted-foreground tabular-nums">
                                {format(price)} before discounts
                            </dd>
                        )}
                    </div>
                )}
            </dl>
        </div>
    )
}
