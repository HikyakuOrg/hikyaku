import { createClient } from "@/lib/supabase/client"
import type { BookingFormData } from "@/app/booking/booking-stepper"

const API_URL = process.env.NEXT_PUBLIC_HIKYAKU_API_URL ?? "http://localhost:3002"

export type CreateCheckoutResult = {
    checkoutUrl: string
    sessionId: string
}

function toKg(weight: number, unit: string): number {
    return unit === "lb" ? weight * 0.453592 : weight
}

/**
 * Starts a Stripe-hosted Checkout for the booking. The backend recomputes the
 * price (never trusts the client) and returns a hosted Checkout URL — the
 * caller should redirect the browser to it. Fulfillment (customer + package
 * creation) happens server-side via the Stripe webhook, not here.
 */
export async function createCheckout(
    formData: BookingFormData,
    serviceRateId: string,
): Promise<CreateCheckoutResult> {
    const { package: pkg, addresses, schedule } = formData

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const sender = addresses!.sender
    const body = {
        serviceRateId,
        sender: {
            name: sender.fullName,
            phoneNumber: sender.phone,
            email: sender.email,
            address: {
                country: sender.country ?? "",
                state: sender.state ?? "",
                suburb: sender.suburb ?? "",
                street: sender.street ?? "",
                lat: sender.lat ?? 0,
                lon: sender.lon ?? 0,
            },
            parcel: {
                weight: toKg(pkg!.weight, pkg!.weightUnit),
                height: pkg!.height,
                width: pkg!.width,
                length: pkg!.length,
            },
            collectionDate: schedule!.pickupDate,
        },
        receiver: addresses!.recipients.map((r) => ({
            name: r.fullName,
            phoneNumber: r.phone,
            email: r.email,
            address: {
                country: r.country ?? "",
                state: r.state ?? "",
                suburb: r.suburb ?? "",
                street: r.street ?? "",
                lat: r.lat ?? 0,
                lon: r.lon ?? 0,
            },
            deliveryDate: schedule!.deliveryDate,
        })),
        deliveryNotes: schedule?.deliveryNotes,
    }

    const res = await fetch(`${API_URL}/api/v1/service-fees/pay`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { "x-whendan": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    })

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
        throw new Error(error.message ?? `HTTP ${res.status}`)
    }

    return res.json()
}
