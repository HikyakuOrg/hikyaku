"use server"

import { createClient } from "@/lib/supabase/server"
import type { BookingFormData } from "@/app/booking/booking-stepper"

export async function createBooking(formData: BookingFormData, orgId: string, serviceResult: unknown) {
    const supabase = await createClient()

    const { data: claimsData } = await supabase.auth.getClaims()
    const userId = claimsData?.claims?.sub

    if (!userId || !formData.package || !formData.addresses || !formData.schedule) {
        throw new Error("Missing required booking data")
    }

    const { package: pkg, addresses, schedule } = formData

    // Create package record
    const { data: packageData, error: packageError } = await supabase
        .from("packages")
        .insert([
            {
                from_customer: userId,
                to_customer: userId,
                organisation_id: orgId,
                tracking_number: `PKG-${Date.now()}`,
                delivery_notes: pkg.description || null,
                warehouse_id: null,
            },
        ])
        .select()
        .single()

    if (packageError) {
        throw new Error(`Failed to create package: ${packageError.message}`)
    }

    // Create package dimensions
    const { error: dimensionsError } = await supabase
        .from("package_dimensions")
        .insert([
            {
                package_id: packageData.id,
                weight_kg: pkg.weight,
                length_cm: pkg.length,
                width_cm: pkg.width,
                height_cm: pkg.height,
            },
        ])

    if (dimensionsError) {
        throw new Error(`Failed to create package dimensions: ${dimensionsError.message}`)
    }

    // Create delivery window
    const { error: windowError } = await supabase
        .from("package_delivery_window")
        .insert([
            {
                package_id: packageData.id,
                scheduled_departure: schedule.pickupDate,
                scheduled_arrival: schedule.deliveryDate || schedule.pickupDate,
                delivery_instructions: schedule.deliveryNotes || null,
            },
        ])

    if (windowError) {
        throw new Error(`Failed to create delivery window: ${windowError.message}`)
    }

    return {
        success: true,
        bookingId: packageData.id,
        serviceResult,
    }
}
