import type { BookingFormData } from "@/app/booking/booking-stepper"

const API_URL = process.env.NEXT_PUBLIC_HIKYAKU_API_URL ?? "http://localhost:3002"

export type CreateCheckoutResult = {
    checkoutUrl: string
    sessionId: string
}

/** One itemised line in a quote (name + quantity × rate + amount). */
export type QuoteLine = {
    id: string
    name: string
    pricing_unit: string
    rate: number
    quantity: number
    amount_minor: number
}

export type QuoteResult = {
    currency: string
    lines: QuoteLine[]
    total_minor: number
    total: number
}

function toKg(weight: number, unit: string): number {
    return unit === "lb" ? weight * 0.453592 : weight
}

/**
 * Build the request body shared by /quote and /pay. The org is resolved by the
 * backend from the x-org-slug header. Weight is canonicalised to kg here; the
 * backend converts to lb for per_lb items.
 */
function buildBody(formData: BookingFormData) {
    const { package: pkg, addresses, schedule } = formData
    const sender = addresses!.sender
    return {
        serviceId: pkg!.serviceId,
        addonIds: pkg!.addonIds ?? [],
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
            deliveryDate: schedule!.deliveryDate || schedule!.pickupDate,
        })),
    }
}

async function postOrThrow<T>(path: string, slug: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-org-slug": slug },
        body: JSON.stringify(body),
    })
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
        const message = Array.isArray(error?.message)
            ? error.message.join(", ")
            : error?.message
        throw new Error(message ?? `HTTP ${res.status}`)
    }
    return res.json()
}

/**
 * Itemised quote for the review step. Distance can't be computed client-side, so
 * the server measures it (ORS) and returns the per-line breakdown. No charge.
 */
export async function getQuote(
    formData: BookingFormData,
    orgSlug: string,
): Promise<QuoteResult> {
    return postOrThrow<QuoteResult>("/api/v1/services/quote", orgSlug, buildBody(formData))
}

/**
 * Starts a Stripe-hosted Checkout for the booking on the org's connected account.
 * The backend recomputes the price (never trusts the client) and returns a hosted
 * Checkout URL — the caller redirects the browser to it. Fulfillment (customer +
 * package creation) happens server-side via the Stripe webhook, not here.
 */
export async function createCheckout(
    formData: BookingFormData,
    orgSlug: string,
): Promise<CreateCheckoutResult> {
    return postOrThrow<CreateCheckoutResult>("/api/v1/services/pay", orgSlug, {
        ...buildBody(formData),
        deliveryNotes: formData.schedule?.deliveryNotes,
    })
}
