import { z } from "zod/v4";

export const setupSchema = z.object({
    name: z.string().min(1, "Name is required"),
    currency: z.string().min(1, "Currency is required"),
    deliveryType: z.enum(["on_demand", "scheduled"]),
});

export const pricingSchema = z.object({
    baseRate: z.number().min(0, "Base rate must be 0 or more"),
    distanceUnit: z.enum(["km", "mi"]),
    ratePerDistance: z.number().min(0, "Rate must be 0 or more"),
    storagePerDay: z.number().min(0, "Storage rate must be 0 or more").optional(),
});

export const coverageSchema = z.object({
    serviceAreaIds: z.array(z.string()).min(1, "Select at least one service area"),
    hasSignatureCharge: z.boolean(),
    signatureCharge: z.number().min(0).optional(),
    hasOutOfAreaSurcharge: z.boolean(),
    outOfAreaType: z.enum(["flat", "per_distance"]).optional(),
    outOfAreaRate: z.number().min(0).optional(),
});

export type SetupFormValues = z.infer<typeof setupSchema>;
export type PricingFormValues = z.infer<typeof pricingSchema>;
export type CoverageFormValues = z.infer<typeof coverageSchema>;
