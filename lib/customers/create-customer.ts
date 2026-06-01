import type { CustomerFormValues } from "@/components/customers/customer-schema"
import { isPointWithinServiceAreas } from "@/lib/maps/service-area-geometry"
import { createClient } from "@/lib/supabase/client"
import { createCustomerAction, updateCustomerAction } from "@/lib/actions/customers"

type ServiceAreaRecord = {
    id: string
    name: string
    geometry: unknown
}

export type PreparedCustomerCreation = {
    customer: Customer
    isWithinServiceArea: boolean
}

export function customerToFormValues(customer: Customer): CustomerFormValues {
    return {
        customerName: customer.customer_name ?? "",
        customerPhone: customer.customer_phone ?? "",
        customerCountry: customer.customer_country ?? "",
        customerAddress: customer.customer_address ?? "",
        customerSuburb: customer.customer_suburb ?? "",
        customerState: customer.customer_state ?? "",
        customerPostcode: customer.customer_postcode ?? "",
        customerLat: customer.customer_location?.coordinates[1] ?? 0,
        customerLon: customer.customer_location?.coordinates[0] ?? 0,
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
        customer_country: values.customerCountry,
        customer_address: values.customerAddress,
        customer_suburb: values.customerSuburb,
        customer_state: values.customerState,
        customer_postcode: values.customerPostcode,
        customer_location: location,
    }

    const serviceAreas = await getServiceAreas()

    return {
        customer,
        isWithinServiceArea: isPointWithinServiceAreas(serviceAreas, [values.customerLon, values.customerLat]),
    }
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

async function getServiceAreas(): Promise<ServiceAreaRecord[]> {
    const supabase = createClient()
    const { data, error } = await supabase
        .from("service_areas")
        .select("id, name, geometry")

    if (error) {
        throw error
    }

    return data ?? []
}