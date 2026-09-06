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
        // The form does not capture a unit yet (HIK-46); "" is the DTO's
        // "unset" until then.
        customer_unit: "",
        customer_suburb: values.customerSuburb,
        customer_state: values.customerState,
        customer_postcode: values.customerPostcode,
        customer_location: location,
        geocode_confidence: values.customerConfidence ?? null,
        pelias_gid: values.customerPeliasGid ?? null,
        pelias_raw: values.customerPeliasRaw ?? null,
        // Assigned by the backend after the row exists: Stripe on create when
        // payments are enabled, Shopify only for orders imported from Shopify.
        stripe_customer_id: null,
        shopify_customer_id: null,
    }

    return {
        customer,
        isWithinServiceArea: await isPointCovered(values.customerLon, values.customerLat),
    }
}

/**
 * Whether a point is covered by at least one live territory, via the same
 * PostGIS containment the assignment engine and the areas page's coverage
 * debugger use (see `getCoverageForPoint`). Fails open: an organisation with no
 * territories drawn yet, or a coverage lookup that errored, both report
 * "covered" so this warning stays silent until there is something real to warn
 * about, exactly as it did when it read `service_areas` directly.
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