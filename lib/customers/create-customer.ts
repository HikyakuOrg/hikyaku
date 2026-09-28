import type { CustomerFormValues } from "@/components/customers/customer-schema"
import { getCoverageForPoint } from "@/lib/actions/coverage"
import { createCustomerAction, updateCustomerAction } from "@/lib/actions/customers"

export type PreparedCustomerCreation = {
    customer: Customer
    isWithinServiceArea: boolean
}

export function customerToFormValues(customer: Customer): CustomerFormValues {
    return {
        customerName: customer.customer_name ?? "",
        customerPhone: customer.customer_phone ?? "",
        customerEmail: customer.customer_email ?? "",
        customerCountry: customer.customer_country ?? "",
        customerAddress: customer.customer_address ?? "",
        customerUnit: customer.customer_unit ?? "",
        customerSuburb: customer.customer_suburb ?? "",
        customerState: customer.customer_state ?? "",
        customerPostcode: customer.customer_postcode ?? "",
        customerLat: customer.customer_location?.coordinates[1] ?? 0,
        customerLon: customer.customer_location?.coordinates[0] ?? 0,
        customerConfidence: customer.geocode_confidence ?? undefined,
        customerPeliasGid: customer.pelias_gid ?? undefined,
        customerPeliasRaw: customer.pelias_raw ?? undefined,
    }
}

export async function prepareCustomerFromForm(
    values: CustomerFormValues,
    customerId = ""
): Promise<PreparedCustomerCreation> {
    const location: Point = {
        type: "Point",
        coordinates: [values.customerLon, values.customerLat],
    }

    const customer: Customer = {
        id: customerId,
        organisation_id: "",
        created_at: "",
        customer_name: values.customerName,
        customer_phone: values.customerPhone,
        customer_email: values.customerEmail,
        customer_country: values.customerCountry,
        customer_address: values.customerAddress,
        customer_unit: values.customerUnit,
        customer_suburb: values.customerSuburb,
        customer_state: values.customerState,
        customer_postcode: values.customerPostcode,
        customer_location: location,
        geocode_confidence: values.customerConfidence ?? null,
        pelias_gid: values.customerPeliasGid ?? null,
        pelias_raw: values.customerPeliasRaw ?? null,
        // The backend sets these: the Stripe id when payments are on, and the
        // external ids for orders imported from a store such as Shopify.
        stripe_customer_id: null,
        external_customer_id: null,
        external_platform: null,
    }

    return {
        customer,
        isWithinServiceArea: await isPointCovered(values.customerLon, values.customerLat),
    }
}

/**
 * Whether a service area covers the point (see `getCoverageForPoint`). Returns
 * true when the organisation has no areas or the lookup fails, so the warning
 * shows only for a real gap.
 */
async function isPointCovered(lon: number, lat: number): Promise<boolean> {
    const result = await getCoverageForPoint(lon, lat)

    if (result.status !== "ok") {
        return true
    }

    return result.diagnostic.organisationAreaCount === 0 || result.diagnostic.anyAreaCovers
}


export async function createPreparedCustomer(prepared: PreparedCustomerCreation) {
    const values = customerToFormValues(prepared.customer)
    return createCustomerAction(values)
}

export async function updatePreparedCustomer(
    customerId: string,
    prepared: PreparedCustomerCreation
) {
    const values = customerToFormValues(prepared.customer)
    return updateCustomerAction(customerId, values)
}