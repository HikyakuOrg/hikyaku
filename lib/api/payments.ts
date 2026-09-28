import type { BookingFormData } from "@/app/booking/booking-stepper"
import type { CheckoutResultDto, QuoteLineDto, QuoteResultDto } from "./generated"

const API_URL = process.env.NEXT_PUBLIC_HIKYAKU_API_URL ?? "http://localhost:3002"

export type CreateCheckoutResult = CheckoutResultDto

/** One line in a quote: name, quantity, rate and amount. */
export type QuoteLine = QuoteLineDto

export type QuoteResult = QuoteResultDto

function toKg(weight: number, unit: string): number {
    return unit === "lb" ? weight * 0.453592 : weight
}

/** The request body for /quote and /pay. Weight is sent in kg. */
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
                unit: sender.unit ?? "",
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
                unit: r.unit ?? "",
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

/** A quote for the review step. The server calculates the distance. No charge. */
export async function getQuote(
    formData: BookingFormData,
    orgSlug: string,
): Promise<QuoteResult> {
    return postOrThrow<QuoteResult>("/api/v1/services/quote", orgSlug, buildBody(formData))
}

/**
 * Start a Stripe Checkout for the booking and return its URL. The server
 * calculates the price. The Stripe webhook creates the customer and package.
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
