

import { z } from "zod"
import { isValidPhoneNumber } from "react-phone-number-input"

export const customerSchema = z.object({
    customerName: z.string().min(1, "Customer name is required"),

    customerPhone: z
        .string()
        .refine((value) => isValidPhoneNumber(value), {
            message: "Invalid phone number",
        }),

    customerCountry: z.string().min(1, "Customer country is required"),
    customerAddress: z.string().min(1, "Customer address is required"),
    customerSuburb: z.string().min(1, "Customer suburb is required"),
    customerState: z.string().min(1, "Customer state is required"),
    customerPostcode: z.string().min(1, "Customer postcode is required"),
})