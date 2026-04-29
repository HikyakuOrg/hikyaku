import { PackageStatus, STATUS_OPTIONS } from "@/app/models/package-status"
import { createServiceAreaFeatureCollection, emptyServiceAreaFeatureCollection } from "@/lib/maps/service-area-geometry"
import { Tables } from "./supabase"
import { createClient } from "./server"
import { PackageOptimisation } from "@/app/models/package-optimisation"

type ServiceAreaViewportBounds = {
    minLat: number
    minLng: number
    maxLat: number
    maxLng: number
}

type ServiceAreaExtentRow = {
    min_lat: number
    min_lng: number
    max_lat: number
    max_lng: number
}

export async function getWarehouse(warehouseId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('warehouse')
        .select('*')
        .eq('id', warehouseId).single()
    if (error) {
        console.error(error)
        return null
    }
    return data
}

export async function getPackagesCountInWarehouse(warehouseId: string, status: PackageStatus[]) {
    const supabase = await createClient()
    const { count, error } = await supabase
        .from('packages')
        .select("*, package_status!inner(enums)", { count: 'exact' })
        .in("package_status.enums", status)
        .eq('warehouse_id', warehouseId)
    if (error) {
        console.error(error)
        return 0
    }
    return count
}

export async function getWarehouseDriversCount(warehouseId: string) {
    const supabase = await createClient()
    const { count, error } = await supabase.from("drivers").select("*", { count: 'exact', head: true }).eq("warehouse_id", warehouseId)
    if (error) throw error
    return count
}

export async function getWarehouseVehicleCount(warehouseId: string) {
    const supabase = await createClient()
    const { count, error } = await supabase.from("vehicles").select("*", { count: 'exact', head: true }).eq("warehouse_id", warehouseId)
    if (error) throw error
    return count
}

export async function getPackagesCount(status: PackageStatus[]) {
    const supabase = await createClient()
    const { count, error } = await supabase
        .from('packages_with_latest_status')
        .select('*', { count: 'exact', head: true })
        .in('current_status', status)
    if (error) {
        console.error(error)
        return 0
    }
    return count
}

export async function getDriversCount() {
    const supabase = await createClient()
    const { count, error } = await supabase.from("drivers").select("*", { count: 'exact', head: true })
    if (error) throw error
    return count
}

export async function getFleetSize() {
    const supabase = await createClient()
    const { count, error } = await supabase.from("vehicles").select("*", { count: 'exact', head: true })
    if (error) throw error
    return count
}

export async function getWarehousesCount() {
    const supabase = await createClient()
    const { count, error } = await supabase.from("warehouse").select("*", { count: 'exact', head: true })
    if (error) throw error
    return count
}

export async function getCustomers(page: number, pageSize: number) {
    const supabase = await createClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
        .from('customer')
        .select('*', { count: 'exact' })
        .range(from, to)

    if (error) {
        console.error(error)
        return { data: [], total: 0 }
    }
    return { data: data as Customer[] ?? [], total: count ?? 0 }
}

export async function getCustomer(customerId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("customer")
        .select("*")
        .eq("id", customerId)
        .single()

    if (error) {
        throw error
    }

    return data as Customer
}

export async function getWarehousesPaginated(page: number, pageSize: number) {
    const supabase = await createClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
        .from('warehouse')
        .select('*', { count: 'exact' })
        .range(from, to)

    if (error) {
        console.error(error)
        return { data: [], total: 0 }
    }

    return { data: data as Tables<'warehouse'>[] ?? [], total: count ?? 0 }
}

export async function getServiceAreas() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("service_areas")
        .select("id, name, geometry")
        .order("name", { ascending: true })

    if (error) {
        console.error(error)
        return emptyServiceAreaFeatureCollection
    }

    return createServiceAreaFeatureCollection(data ?? [])
}

export async function getServiceAreaExtent() {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("get_service_area_extent")

    if (error) {
        console.error(error)
        return null
    }

    const extent = (data as ServiceAreaExtentRow[] | null)?.[0]

    if (!extent) {
        return null
    }

    return {
        minLat: extent.min_lat,
        minLng: extent.min_lng,
        maxLat: extent.max_lat,
        maxLng: extent.max_lng,
    }
}

export async function getServiceAreasInBounds(bounds: ServiceAreaViewportBounds) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("get_service_areas_in_bounds", {
        p_min_lng: bounds.minLng,
        p_min_lat: bounds.minLat,
        p_max_lng: bounds.maxLng,
        p_max_lat: bounds.maxLat,
    })

    if (error) {
        console.error(error)
        return emptyServiceAreaFeatureCollection
    }

    return createServiceAreaFeatureCollection(data ?? [])
}

export async function getWarehouseSummaries() {
    const supabase = await createClient()

    const { data: warehouses, error: wError } = await supabase
        .from('warehouse')
        .select('id, warehouse_name')

    if (wError) {
        console.error(wError)
        return []
    }

    const summaries = await Promise.all(warehouses.map(async (w) => {
        const { count, error } = await supabase
            .from('packages_with_latest_status')
            .select('*', { count: 'exact', head: true })
            .eq('warehouse_id', w.id)
            .in('current_status', ['PENDING'])
        return {
            id: w.id,
            warehouse_name: w.warehouse_name,
            package_count: count ?? 0
        }
    }))
    return summaries
}


export async function getRouteSteps(routeId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("vrp_route_step")
        .select(`
            *,
            package_assignment(
                package_id,
                driver:drivers(
                    id,
                    warehouse_id
                ),
                vehicle:vehicles(
                    id,
                    vehicle_plate,
                    vehicle_make,
                    vehicle_model,
                    vehicle_type:vehicle_type!vehicles_vehicle_type_fkey(
                        ors_vehicle_type
                    )
                ),
                package:packages_with_latest_status!package_assignment_package_id_fkey(
                    current_status,
                    to_customer:customer!packages_to_customer_fkey(
                        id,
                        customer_name,
                        customer_address,
                        customer_suburb,
                        customer_state,
                        customer_postcode
                    ),
                    warehouse:warehouse!packages_warehouse_id_fkey(
                        id,
                        warehouse_name,
                        warehouse_address
                    ),
                    package_delivery_window:package_delivery_window!package_delivery_window_package_id_fkey(
                        scheduled_arrival,
                        actual_arrival
                    )
                )
            )
        `)
        .eq("route_id", routeId)
        .order("step_index", { ascending: true })

    if (error) throw error
    return data as PackageOptimisation[]
}