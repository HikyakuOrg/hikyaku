import { z } from "zod/v4";


export const packageSchema = z.object({
    packageId: z.uuid(),
    weight: z.number().min(0.1),
    length: z.number().min(0.1),
    width: z.number().min(0.1),
    height: z.number().min(0.1),
    files: z.array(z.instanceof(File)).optional(),
})


export const customerSchema = z.object({
    senderId: z.uuid("Invalid Sender"),
    receiverId: z.uuid("Invalid Receiver"),
})


export const logisticsAssignmentSchema = z.object({
    trackingNumber: z.string().optional(),
    scheduledArrival: z.iso.datetime().optional(),
    deliveryNotes: z.string().optional(),
    warehouseId: z.uuid("Invalid Warehouse"),
})


export type PackageFormValues = z.infer<typeof packageSchema>;
export type CustomerFormValues = z.infer<typeof customerSchema>;
export type LogisticsAssignmentFormValues = z.infer<typeof logisticsAssignmentSchema>;
