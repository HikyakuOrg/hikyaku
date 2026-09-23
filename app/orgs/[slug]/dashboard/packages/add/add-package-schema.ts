import { z } from "zod/v4";


/**
 * No `files` field: the photo dropzone in package-info-step uploads straight to
 * Supabase Storage under `<packageId>/images/received`, so the File objects
 * never need to reach this form's value or the submit step.
 */
export const packageSchema = z.object({
    packageId: z.uuid(),
    weight: z.number().min(0.1),
    length: z.number().min(0.1),
    width: z.number().min(0.1),
    height: z.number().min(0.1),
    skillIds: z.array(z.uuid()),
})


export const customerSchema = z.object({
    senderId: z.uuid("Invalid Sender"),
    receiverId: z.uuid("Invalid Receiver"),
})


export const logisticsAssignmentSchema = z.object({
    trackingNumber: z.string().optional(),
    // Optional: an empty value means "no deadline", so "" maps to undefined
    // instead of failing the datetime check and silently blocking the step.
    scheduledArrival: z
        .union([z.iso.datetime("Invalid delivery date and time"), z.literal("").transform(() => undefined)])
        .optional(),
    deliveryNotes: z.string().optional(),
    warehouseId: z.uuid("Invalid Warehouse"),
})


export type PackageFormValues = z.infer<typeof packageSchema>;
export type CustomerFormValues = z.infer<typeof customerSchema>;
export type LogisticsAssignmentFormValues = z.infer<typeof logisticsAssignmentSchema>;
