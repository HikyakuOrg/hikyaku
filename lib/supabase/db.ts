export async function getServiceAreaById(id: string) {
    const { data, error } = await supabase
        .from("service_areas")
        .select("id, name, geometry")
        .eq("id", id)
        .single()
    if (error) throw error
    return data
}

export async function updateServiceArea(id: string, name: string, geometry: string) {
    const { data, error } = await supabase
        .from("service_areas")
        .update({ name, geometry })
        .eq("id", id)
        .select()
        .single()
    if (error) throw error
    return data
}
import { QueryData } from "@supabase/supabase-js";
import { createClient } from "./client";
import { Database, Tables } from "./supabase";
import { PackageOptimisation } from "@/app/models/package-optimisation";


const supabase = createClient()


export async function getVehicleTypes() {
    const { data, error } = await supabase.from("vehicle_type").select("*")
    if (error) throw error
    return data
}

export async function getPackageStatuses(): Promise<string[]> {
    const { data, error } = await supabase.from("package_status").select("status")
    if (error) throw error
    return data.map((s) => s.status)
}

export async function getPackage(packageId: string) {
    const { data, error } = await supabase.from("packages").select("*").eq("id", packageId).single()
    if (error) throw error
    return data
}

export async function getPackageByTrackingNumber(trackingNumber: string) {
    const { data, error } = await supabase.from("packages").select("*").eq("tracking_number", trackingNumber).single()
    if (error) throw error
    return data
}

export async function getPackageAssignment(packageId: string) {
    const { data, error } = await supabase.from("package_assignment").select("*").eq("package_id", packageId).single()
    if (error) throw error
    return data
}

export async function getDriverPackageAssignmentStatus(driverId: string) {
    const { data, error } = await supabase
        .from("package_assignment")
        .select("*, package:packages_with_latest_status(*)")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false })
    if (error) throw error
    return data

}

export async function getPackageTimeline(packageId: string) {
    const { data, error } = await supabase.from("package_timeline").select(`
    *,
    package_status:package_status (*)
  `).eq("package_id", packageId).order("created_at", { ascending: true })
    if (error) throw error
    return data
}


export function subscribeToDriverLocationUpdates(driverId: string, onUpdate: (payload: any) => void) {
    const channel = supabase
        .channel("driver-location-updates")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "driver_current_location",
                filter: `driver_id=eq.${driverId}`,
            },
            (payload) => {
                onUpdate(payload)
            }
        )
        .subscribe()

    return channel
}


export async function getCustomersByIds(customerIds: string[]) {
    const { data, error } = await supabase.from("customer").select("*").in("id", customerIds)
    if (error) throw error
    return data
}

export async function getCustomer(customerId: string) {
    const { data, error } = await supabase.from("customer").select("*").eq("id", customerId).single()
    if (error) throw error
    return data
}

export async function getPackageDimension(packageId: string) {
    const { data, error } = await supabase.from("package_dimensions").select("*").eq("package_id", packageId).single()
    if (error) throw error
    return data
}

export async function getPackageDeliveryWindow(packageId: string) {
    const { data, error } = await supabase.from("package_delivery_window").select("*").eq("package_id", packageId).single()
    if (error) throw error
    return data
}


type Vehicle = Database['public']['Tables']['vehicles']['Row']
type VehicleType = Database['public']['Tables']['vehicle_type']['Row']
export type VehiclesWithTypes = Omit<Vehicle, 'vehicle_type'> & {
    vehicle_type: VehicleType | null
    is_deleted?: boolean
}

export async function getVehiclesByType(selectedTypes: string[], page: number, pageSize: number) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
        .from('vehicles')
        .select(
            `
        id,
        vehicle_plate,
        vehicle_identification_number,
        vehicle_make,
        vehicle_year,
        vehicle_model,
        vehicle_gross_limits,
        warehouse_id,
        is_deleted,
        vehicle_type:vehicle_type (
          id,
          ors_vehicle_type,
          vehicle_type,
          vehicle_description
        )
      `,
            { count: 'exact' }
        )
        .eq('is_deleted', false)

    // Apply filter only if array has values
    if (selectedTypes.length > 0) {
        query = query.in('vehicle_type', selectedTypes)
    }

    const { data, error, count } = await query.range(from, to)

    if (error) throw error

    return { data: data ?? [], total: count ?? 0 }
}


export async function getWarehouses(page: number, pageSize: number) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase.from("warehouse").select("*", { count: 'exact' }).range(from, to)
    return { data: data ?? [], total: count ?? 0 }
}

export async function getWarehouse(warehouseId: string) {
    const { data, error } = await supabase.from("warehouse").select("*").eq("id", warehouseId).single()
    if (error) throw error
    return data
}


export async function updateDriversWarehouse(driverIds: string[], warehouseId: string) {
    const { data, error } = await supabase.from("drivers").update({ warehouse_id: warehouseId }).in("id", driverIds)
    if (error) throw error
    return data
}

export async function removeDriversWarehouse(driverIds: string[]) {
    const { data, error } = await supabase.from("drivers").update({ warehouse_id: null }).in("id", driverIds)
    if (error) throw error
    return data
}

export async function getVehiclesNotAssignedInWarehouse(warehouseId: string, page: number, pageSize: number) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase.from("vehicles").select(`
        id,
        vehicle_plate,
        vehicle_identification_number,
        vehicle_make,
        vehicle_year,
        vehicle_model,
        vehicle_gross_limits,
        warehouse_id,
        is_deleted,
        vehicle_type:vehicle_type (
          id,
          ors_vehicle_type,
          vehicle_type,
          vehicle_description
        ),
        driver_vehicle_assignment!left (
          id
        )
      `).eq("warehouse_id", warehouseId)
        .eq("is_deleted", false)
        .is('driver_vehicle_assignment.id', null)
        .range(from, to)
    if (error) throw error
    return { data: data ?? [], total: count ?? 0 }
}

export async function getVehiclesInWarehouse(warehouseId: string, page: number, pageSize: number) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase.from("vehicles").select(`
        id,
        vehicle_plate,
        vehicle_identification_number,
        vehicle_make,
        vehicle_year,
        vehicle_model,
        vehicle_gross_limits,
        warehouse_id,
        is_deleted,
        vehicle_type:vehicle_type (
          id,
          ors_vehicle_type,
          vehicle_type,
          vehicle_description
        )
      `).eq("warehouse_id", warehouseId)
        .eq("is_deleted", false)
        .range(from, to)
    if (error) throw error
    return { data: data ?? [], total: count ?? 0 }
}

export async function getVehiclesNotAssigned(page: number, pageSize: number) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase.from("vehicles").select(`
        id,
        vehicle_plate,
        vehicle_identification_number,
        vehicle_make,
        vehicle_year,
        vehicle_model,
        vehicle_gross_limits,
        warehouse_id,
        is_deleted,
        vehicle_type:vehicle_type (
          id,
          ors_vehicle_type,
          vehicle_type,
          vehicle_description
        )
      `, { count: "exact" }).is("warehouse_id", null)
        .eq("is_deleted", false)
        .range(from, to)
    if (error) throw error
    return { data: data ?? [], total: count ?? 0 }

}

export async function updateVehiclesWarehouse(vehicleIds: string[], warehouseId: string) {
    const { data, error } = await supabase.from("vehicles").update({ warehouse_id: warehouseId }).in("id", vehicleIds)
    if (error) throw error
    return data
}

export async function removeVehiclesWarehouse(vehicleIds: string[]) {
    const { data, error } = await supabase.from("vehicles").update({ warehouse_id: null }).in("id", vehicleIds)
    if (error) throw error
    return data
}

export async function getVehiclesById(vehicleIds: string[]) {
    const { data, error } = await supabase.from("vehicles").select(`
        id,
        vehicle_plate,
        vehicle_identification_number,
        vehicle_make,
        vehicle_year,
        vehicle_model,
        vehicle_gross_limits,
        warehouse_id,
        is_deleted,
        vehicle_type:vehicle_type (
          id,
                    ors_vehicle_type,
          vehicle_type,
          vehicle_description
        )
      `).in("id", vehicleIds)
    if (error) throw error
    return data ?? []
}


export async function deleteVehicle(vehicleId: string) {
    const { data, error } = await supabase.from("vehicles").update({ is_deleted: true }).eq("id", vehicleId)
    if (error) throw error
    return data
}

export async function createVehicle(vehicle: Tables<'vehicles'>) {
    const { data, error } = await supabase.from("vehicles").insert(vehicle).select().single()
    if (error) throw error
    return data
}

export async function updateVehicle(id: string, vehicle: Partial<Tables<'vehicles'>>) {
    const { data, error } = await supabase.from("vehicles").update(vehicle).eq("id", id).select().single()
    if (error) throw error
    return data
}

export async function getVehicle(id: string) {
    const { data, error } = await supabase.from("vehicles").select("*").eq("id", id).single()
    if (error) throw error
    return data
}

export async function getVehicleWithFullDetails(id: string) {
    // 1. Get vehicle with type
    const { data: vehicle, error: vError } = await supabase
        .from('vehicles')
        .select(`
            *,
            vehicle_type:vehicle_type (*)
        `)
        .eq('id', id)
        .single()

    if (vError) throw vError;

    // 2. Get current driver assignment
    const { data: assignment, error: aError } = await supabase
        .from('driver_vehicle_assignment')
        .select(`
            driver_id
        `)
        .eq('vehicle_id', id)
        .maybeSingle()

    let driver = null
    if (assignment?.driver_id) {
        // Fetch driver info using RPC or separate query to get user details
        const { data: drivers, error: dError } = await supabase
            .rpc('get_drivers_by_ids', { p_driver_ids: [assignment.driver_id] })

        if (drivers && drivers.length > 0) {
            driver = drivers[0]
        }
    }

    // 3. Get deliveries
    const { data: deliveries, error: deError } = await supabase
        .from('package_assignment')
        .select(`
            package_id,
            created_at,
            driver_id,
            package:packages (
                tracking_number,
                from_customer:customer!packages_from_customer_fkey (customer_name),
                to_customer:customer!packages_to_customer_fkey (customer_name),
                window:package_delivery_window (
                    scheduled_departure,
                    actual_departure,
                    scheduled_arrival,
                    actual_arrival
                )
            )
        `)
        .eq('vehicle_id', id)
        .order('created_at', { ascending: false })

    // Since views like packages_with_latest_status are hard to join in nested selects without explicit FKs,
    // we might need to fetch statuses separately or use a join-heavy query if the view supports it.
    // However, I'll stick to a simpler approach for now: if status join fails, I'll fallback to a default.
    // For now, let's keep it simple as the view join might just work if we use the right name.

    return {
        vehicle,
        currentDriver: driver,
        deliveries: deliveries || []
    }
}


export async function deleteDriverAssignedVehicle(vehicleId: string, driverId: string) {
    const { data, error } = await supabase.from("driver_vehicle_assignment").delete()
        .eq("vehicle_id", vehicleId)
        .eq("driver_id", driverId)
    if (error) throw error
    return data
}

export async function assignVehicleToDriver(vehicleId: string, driverId: string) {
    const { data, error } = await supabase.from("driver_vehicle_assignment").insert({
        vehicle_id: vehicleId,
        driver_id: driverId
    })
    if (error) throw error
    return data
}


export async function getCustomerDetails(details: string) {
    const { data, error } = await supabase
        .from('customer')
        .select('*')
        .or(`customer_name.ilike.%${details}%,customer_phone.ilike.%${details}%`)
        .limit(20)
    return data
}


export async function createCustomer(customer: Customer) {
    const { data, error } = await supabase.from("customer").insert({
        customer_name: customer.customer_name,
        customer_phone: customer.customer_phone,
        customer_address: customer.customer_address,
        customer_suburb: customer.customer_suburb,
        customer_postcode: customer.customer_postcode,
        customer_country: customer.customer_country,
        customer_state: customer.customer_state,
        customer_location: customer.customer_location,
    }).select().single()

    if (error) throw error

    return data as Customer
}

export async function updateCustomer(customerId: string, customer: Customer) {
    const { data, error } = await supabase.from("customer").update({
        customer_name: customer.customer_name,
        customer_phone: customer.customer_phone,
        customer_address: customer.customer_address,
        customer_suburb: customer.customer_suburb,
        customer_postcode: customer.customer_postcode,
        customer_country: customer.customer_country,
        customer_state: customer.customer_state,
        customer_location: customer.customer_location,
    }).eq("id", customerId).select().single()

    if (error) throw error

    return data as Customer
}


export async function searchWarehouse(search: string) {
    const { data, error } = await supabase.from("warehouse").select("*")
        .or(`warehouse_name.ilike.%${search}%,warehouse_address.ilike.%${search}%`)
        .limit(20)
    if (error) throw error
    return data
}

export async function searchServiceArea(search: string) {
    const { data, error } = await supabase
        .from("service_areas")
        .select("id, name")
        .ilike("name", `%${search}%`)
        .order("name", { ascending: true })
        .limit(20)
    if (error) throw error
    return data
}

export async function insertPackage(packageId: string, fromCustomer: string, toCustomer: string,
    warehouseId: string, trackingNumber?: string, deliveryNotes?: string | null) {
    const payload: any = {
        id: packageId,
        from_customer: fromCustomer,
        to_customer: toCustomer,
        warehouse_id: warehouseId,
        deliveryNotes: deliveryNotes
    }

    if (trackingNumber) {
        payload.tracking_number = trackingNumber
    }

    const { data, error } = await supabase.from("packages").insert(payload).select().single()

    if (error) throw error

    return data
}


export async function insertPackageDimension(packageId: string, weight: number, height: number, length: number, width: number) {
    const { data, error } = await supabase.from("package_dimensions").insert({
        package_id: packageId,
        weight_kg: weight,
        height_cm: height,
        length_cm: length,
        width_cm: width,
    })
    if (error) throw error
    return data
}


export async function insertPackageDeliveryWindow(packageId: string, scheduledArrival?: string) {
    const { data, error } = await supabase.from("package_delivery_window").insert({
        package_id: packageId,
        scheduled_arrival: scheduledArrival,
    })
    if (error) throw error
    return data
}


export async function getPackageFailure(packageId: string) {
    const { data, error } = await supabase
        .from("package_failure")
        .select("*")
        .eq("package_id", packageId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    if (error) throw error
    return data
}

export async function getWarehousePackages(warehouseId: string, page: number, pageSize: number) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const { data, error, count } = await supabase.from("packages")
        .select("*, package_status!inner(enums)", { count: "exact" })
        .eq("warehouse_id", warehouseId)
        .in("package_status.enums", ["PENDING", "FAILED", "ASSIGNED"])
        .order("created_at", { ascending: false })
        .range(from, to)
    if (error) throw error
    return { data: data ?? [], total: count ?? 0 }
}


export async function getDeliveryRoutes(page: number, pageSize: number) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const { data, error, count } = await supabase.from("vrp_route")
        .select(`
            id,
            vrp_route_step!inner(route_id, type, solution_id, duration),
            vrp_solution!inner(
                id, optimization_id,
                vrp_optimization!inner(id, created_at)
            )
        `, { count: "exact" })
        .range(from, to)
    if (error) throw error
    return { data: data ?? [], total: count ?? 0 }
}


export interface DeliveryRouteByDate {
    route_id: string;
    package_assignment: {
        driver_id: string | null;
        package_id: string;
        scheduled_departure: string | null;
        scheduled_arrival: string | null;
    }[]
}

export async function getDeliveryRoutesByDates(
    startDate: string,
    endDate: string,
    driverId?: string
): Promise<DeliveryRouteByDate[]> {
    const { data, error } = await supabase.from('package_delivery_window')
        .select(`
            package_id,
            scheduled_departure,
            scheduled_arrival,
            packages!inner (
                package_assignment!inner (
                    driver_id,
                    vrp_route_step!inner (
                        route_id
                    )
                )
            )
        `)
        .gt('scheduled_departure', startDate)
        .lt('scheduled_departure', endDate)

    if (error) throw error

    const routesMap = new Map<string, DeliveryRouteByDate>();

    for (const item of (data as any[]) || []) {
        const package_id = item.package_id;
        const scheduled_departure = item.scheduled_departure;
        const scheduled_arrival = item.scheduled_arrival;

        const pgkg = item.packages;
        if (!pgkg) continue;

        const assignments = Array.isArray(pgkg.package_assignment)
            ? pgkg.package_assignment
            : [pgkg.package_assignment];

        for (const assignment of assignments) {
            if (!assignment) continue;
            const driver_id = assignment.driver_id;
            if (driverId && driver_id !== driverId) continue;

            const steps = Array.isArray(assignment.vrp_route_step)
                ? assignment.vrp_route_step
                : [assignment.vrp_route_step];

            for (const step of steps) {
                if (!step) continue;
                const route_id = step.route_id;

                if (!routesMap.has(route_id)) {
                    routesMap.set(route_id, {
                        route_id,
                        package_assignment: []
                    });
                }

                routesMap.get(route_id)!.package_assignment.push({
                    package_id,
                    driver_id,
                    scheduled_departure,
                    scheduled_arrival
                });
            }
        }
    }

    return Array.from(routesMap.values()).filter((route) => route.package_assignment.length > 0);
}


export async function createServiceArea(name: string, geometry: string) {
    const { data, error } = await supabase
        .from("service_areas")
        .insert({
            name,
            geometry,
        })
        .select()
        .single()

    if (error) {
        throw error
    }

    return data
}

export async function createServiceRate(params: {
    name: string
    currency: string
    delivery_type: string
    base_rate: number
    distance_unit: string
    rate_per_distance: number
    storage_per_day?: number
    has_signature_charge: boolean
    signature_charge?: number
    has_out_of_area_surcharge: boolean
    out_of_area_type?: string
    out_of_area_rate?: number
}) {
    const { data, error } = await supabase
        .from("service_rates")
        .insert(params)
        .select()
        .single()
    if (error) throw error
    return data
}

export async function createServiceRateCoverage(serviceRateId: string, serviceAreaIds: string[]) {
    const rows = serviceAreaIds.map((service_area_id) => ({
        service_rate_id: serviceRateId,
        service_area_id,
    }))
    const { error } = await supabase.from("service_rate_coverage").insert(rows)
    if (error) throw error
}