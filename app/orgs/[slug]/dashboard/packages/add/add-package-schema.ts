import { z } from "zod/v4";


/** No `files` field: the photo dropzone uploads directly to `<packageId>/images/received`. */
export const packageSchema = z.object({
    packageId: z.uuid(),
    weight: z.number().min(0.1),
    length: z.number().min(0.1),
    width: z.number().min(0.1),
    height: z.number().min(0.1),
    skillIds: z.array(z.uuid()),
})


export const customerSchema = z.object({
    senderId: z.uuid("Select a sender"),
    receiverId: z.uuid("Select a receiver"),
})


export const logisticsAssignmentSchema = z.object({
    trackingNumber: z.string().optional(),
    // Empty means no deadline, so "" becomes undefined.
    scheduledArrival: z
        .union([z.iso.datetime("Enter a valid date and time"), z.literal("").transform(() => undefined)])
        .optional(),
    deliveryNotes: z.string().optional(),
    warehouseId: z.uuid("Select a warehouse"),
})


export type PackageFormValues = z.infer<typeof packageSchema>;
export type CustomerFormValues = z.infer<typeof customerSchema>;
export type LogisticsAssignmentFormValues = z.infer<typeof logisticsAssignmentSchema>;
