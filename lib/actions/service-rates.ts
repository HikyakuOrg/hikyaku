import { createServiceRate, createServiceRateCoverage } from "@/lib/supabase/db"

export interface CreateServiceRateInput {
    name: string
    currency: string
    deliveryType: "on_demand" | "scheduled"
    baseRate: number
    distanceUnit: "km" | "mi"
    ratePerDistance: number
    storagePerDay?: number
    hasSignatureCharge: boolean
    signatureCharge?: number
    hasOutOfAreaSurcharge: boolean
    outOfAreaType?: "flat" | "per_distance"
    outOfAreaRate?: number
    serviceAreaIds: string[]
}

export async function createServiceRateAction(input: CreateServiceRateInput) {
    const rate = await createServiceRate({
        name: input.name,
        currency: input.currency,
        delivery_type: input.deliveryType,
        base_rate: input.baseRate,
        distance_unit: input.distanceUnit,
        rate_per_distance: input.ratePerDistance,
        storage_per_day: input.storagePerDay,
        has_signature_charge: input.hasSignatureCharge,
        signature_charge: input.signatureCharge,
        has_out_of_area_surcharge: input.hasOutOfAreaSurcharge,
        out_of_area_type: input.outOfAreaType,
        out_of_area_rate: input.outOfAreaRate,
    })

    await createServiceRateCoverage(rate.id, input.serviceAreaIds)

    return rate
}
