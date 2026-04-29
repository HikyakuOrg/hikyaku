import type { CustomerFormValues } from "@/components/customers/customer-schema"
import { geocodeAddress } from "@/lib/maps/geo"
import { isPointWithinServiceAreas } from "@/lib/maps/service-area-geometry"
import { createClient } from "@/lib/supabase/client"
import { createCustomer } from "@/lib/supabase/db"

type ServiceAreaRecord = {
    id: string
    name: string
    geometry: unknown
}

export type PreparedCustomerCreation = {
    customer: Customer
    isWithinServiceArea: boolean
}

export async function prepareCustomerFromForm(values: CustomerFormValues): Promise<PreparedCustomerCreation> {
    const geocode = await geocodeAddress({
        street: values.customerAddress,
        suburb: values.customerSuburb,
        state: values.customerState,
        country: values.customerCountry,
        postcode: values.customerPostcode,
    })

    if (!geocode?.lat || !geocode.lon) {
        throw new Error("Geocode not found")
    }

    const location: Point = {
        type: "Point",
        coordinates: [geocode.lon, geocode.lat],
    }

    const customer: Customer = {
        id: "",
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
        isWithinServiceArea: isPointWithinServiceAreas(serviceAreas, [geocode.lon, geocode.lat]),
    }
}

export async function createCustomerFromForm(values: CustomerFormValues) {
    const prepared = await prepareCustomerFromForm(values)
    return createPreparedCustomer(prepared)
}

export async function createPreparedCustomer(prepared: PreparedCustomerCreation) {
    return createCustomer(prepared.customer)
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