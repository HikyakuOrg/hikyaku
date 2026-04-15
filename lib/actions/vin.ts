"use server"

import { createDecoder } from "@cardog/corgi";

export async function decodeVin(vin: string) {
    if (!vin || vin.length !== 17) {
        throw new Error('Invalid VIN length');
    }

    try {
        const decoder = await createDecoder();
        const result = await decoder.decode(vin);
        
        if (result.valid && result.components.vehicle) {
            return {
                success: true,
                data: result.components.vehicle
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
