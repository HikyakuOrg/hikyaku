import { createClient } from "@/lib/supabase/client"
import type { BookingFormData } from "@/app/booking/booking-stepper"

const API_URL = process.env.NEXT_PUBLIC_HIKYAKU_API_URL ?? "http://localhost:3002"

export type ServiceFeeResult = {
    currency: string
    service_rate: { id: string; name: string }
    breakdown: {
        base_rate: number
        distance: {
            total: number
            unit: string
            rate_per_unit: number
            cost: number
        }
        signature: {
            applies: boolean
            charge_per_receiver: number
            receiver_count: number
            cost: number
        }
        storage: {
            applies: boolean
            rate_per_day: number
            receivers: { name: string; days: number; cost: number }[]
            cost: number
        }
    }
    total: number
}

function toKg(weight: number, unit: string): number {
    return unit === "lb" ? weight * 0.453592 : weight
}

export async function calculateServiceFee(
    formData: BookingFormData,
    serviceRateId: string,
): Promise<ServiceFeeResult> {
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
    }

    const res = await fetch(`${API_URL}/api/v1/service-fees/calculate`, {
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
