"use server"

import { createDecoder } from "@cardog/corgi";

export async function decodeVin(vin: string) {
    if (!vin || vin.length !== 17) {
        throw new Error('Invalid VIN length');
    }

    try {
        const decoder = await createDecoder();
        const result = await decoder.decode(vin);
        const vehicle = result.components.vehicle;
        const wmi = result.components.wmi;
        if (result.valid && vehicle && wmi) {
            return {
                success: true,
                vehicle: vehicle,
                wmi: wmi
            };
        } else {
            return {
                success: false,
                error: 'Could not decode VIN'
            };
        }
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Internal server error during VIN decoding'
        };
    }
}
