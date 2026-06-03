import { isValidPhoneNumber } from "react-phone-number-input"
import { z } from "zod"

export const customerSchema = z.object({
    customerName: z.string().min(1, "Customer name is required"),
    customerPhone: z.string().refine((value) => isValidPhoneNumber(value), {
        message: "Invalid phone number",
    }),
    // Optional: blank is allowed, but a non-blank value must be a valid email.
    customerEmail: z.union([z.literal(""), z.email("Invalid email")]),
    customerCountry: z.string().min(1, "Customer country is required"),
    customerAddress: z.string().min(1, "Customer address is required"),
    customerSuburb: z.string().min(1, "Customer suburb is required"),
    customerState: z.string().min(1, "Customer state is required"),
    customerPostcode: z.string(),
    customerLat: z.number().min(-90).max(90),
    customerLon: z.number().min(-180).max(180),
    // Optional Pelias provenance, populated when an address suggestion is picked.
    customerConfidence: z.number().optional(),
    customerPeliasGid: z.string().optional(),
    customerPeliasRaw: z.unknown().optional(),
})

export type CustomerFormValues = z.infer<typeof customerSchema>