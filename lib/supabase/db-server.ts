import { PackageStatus, STATUS_OPTIONS } from "@/app/models/package-status"
import { createServiceAreaFeatureCollection, emptyServiceAreaFeatureCollection } from "@/lib/maps/service-area-geometry"
import { Tables } from "./supabase"
import { createClient } from "./server"
import { PackageOptimisation, Location } from "@/app/models/package-optimisation"
import type { ServiceRateOption } from "@/app/booking/booking-schema"
import { listCustomersAction, getCustomerAction } from "@/lib/actions/customers"

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
    return listCustomersAction(page, pageSize)
}

export async function getCustomer(customerId: string) {
    return getCustomerAction(customerId)
}

export async function getWarehousesPaginated(page: number, pageSize: number) {
    const supabase = await createClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
        .from('warehouse')
        .select('*', { count: 'exact' })
        .order('warehouse_name', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)

    if (error) {
        console.error(error)
        return { data: [], total: 0 }
    }

    return { data: data as Tables<'warehouse'>[] ?? [], total: count ?? 0 }
}

// Page size for the warehouse list (SSR first page + client endless scroll).
export const WAREHOUSE_PAGE_SIZE = 15

// Fields the warehouse list cards need — kept narrow so the load-more action
// ships only what it renders (no PostGIS geometry over the wire).
export type WarehouseCardData = Pick<
    Tables<'warehouse'>,
    'id' | 'warehouse_name' | 'warehouse_address'
>

export type WarehousePin = {
    id: string
    warehouse_name: string
    warehouse_address: string
    lng: number
    lat: number
}

// All warehouses the caller can see, as lightweight pins for the map.
// warehouse_location comes back as a GeoJSON Point ({ coordinates: [lng, lat] }),
// matching how it's read elsewhere (warehouse detail page, package locations).
// Org isolation is enforced by RLS.
export async function getWarehouseLocations(): Promise<WarehousePin[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('warehouse')
        .select('id, warehouse_name, warehouse_address, warehouse_location')
        .order('warehouse_name', { ascending: true })

    if (error) {
        console.error(error)
        return []
    }

    return (data ?? []).flatMap((warehouse) => {
        const coordinates = (warehouse.warehouse_location as Point | null)?.coordinates
        if (!coordinates || coordinates.length < 2) {
            return []
        }
        return [{
            id: warehouse.id,
            warehouse_name: warehouse.warehouse_name,
            warehouse_address: warehouse.warehouse_address,
            lng: coordinates[0],
            lat: coordinates[1],
        }]
    })
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

// Minimal organisation shape the public booking page needs (id to scope rates,
// name for headings/empty state, slug to forward to the payments API).
export type BookingOrganisation = {
    id: string
    name: string | null
    slug: string
}

// Resolve an organisation by its public slug. Used by the unauthenticated
// booking page (<slug>.hikyaku.org/booking), so it runs under the anon client —
// organisations has no RLS and anon holds the table grant. Returns null when no
// org matches the slug.
export async function getOrganisationBySlug(slug: string): Promise<BookingOrganisation | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("organisations")
        .select("id, name, slug")
        .eq("slug", slug)
        .maybeSingle()

    if (error) {
        console.error(error)
        return null
    }
    return data
}

export async function getServiceRates(organisationId: string): Promise<ServiceRateOption[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("service_rates")
        .select("id, name, delivery_type, distance_unit")
        .eq("organisation_id", organisationId)
        .order("name", { ascending: true })

    if (error) {
        console.error(error)
        return []
    }

    return (data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        delivery_type: r.delivery_type === "on_demand" ? "on_demand" : "scheduled",
        distance_unit: r.distance_unit,
    }))
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


export async function getAppRoles() {
    const supabase = await createClient()
    const { data, error } = await supabase.from("app_roles").select("id, name")
    if (error) throw error
    return data ?? []
}

export async function getAppPermissions() {
    const supabase = await createClient()
    const { data, error } = await supabase.from("app_permission").select("id, permission")
    if (error) throw error
    return data ?? []
}

export async function getVehicleTypes() {
    const supabase = await createClient()
    const { data, error } = await supabase.from("vehicle_type").select("id, vehicle_type")
    if (error) throw error
    return data ?? []
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

export interface DriverVehiclePair {
    dvaId: string
    driverId: string
    vehicleId: string
    driverName: string
    licenseType: string
    licenseExpiry: string | null
    driverUnderProbation: boolean
    vehiclePlate: string
    vehicleMake: string
    vehicleModel: string
    vehicleYear: number | null
    vehicleGrossLimits: number | null
    orsVehicleType: string
}

export async function getAvailableDriverVehiclePairs(warehouseId: string, date: string): Promise<DriverVehiclePair[]> {
    const supabase = await createClient()

    // All driver-vehicle assignments in this warehouse
    const { data: allPairs, error: pairsError } = await supabase
        .from("driver_vehicle_assignment")
        .select(`
            id,
            driver_id,
            vehicle_id,
            drivers:drivers!driver_vehicle_assignment_driver_fkey(
                id,
                driver_license,
                license_expiry,
                license_type,
                driver_under_probation
            ),
            vehicles:vehicles(
                id,
                vehicle_plate,
                vehicle_make,
                vehicle_model,
                vehicle_year,
                vehicle_gross_limits,
                is_deleted,
                warehouse_id,
                vehicle_type:vehicle_type!vehicles_vehicle_type_fkey(
                    ors_vehicle_type
                )
            )
        `)
        .eq("vehicles.warehouse_id", warehouseId)
        .eq("vehicles.is_deleted", false)

    if (pairsError) throw pairsError

    const validPairs = (allPairs ?? []).filter(
        (p) => p.vehicles && !p.vehicles.is_deleted && p.vehicles.warehouse_id === warehouseId
    )

    // Find busy driver/vehicle IDs on that date
    const dayStart = `${date}T00:00:00`
    const dayEnd = `${date}T23:59:59`

    const { data: busyAssignments, error: busyError } = await supabase
        .from("package_assignment")
        .select(`
            driver_id,
            vehicle_id,
            package_delivery_window:package_delivery_window!package_delivery_window_package_id_fkey(
                scheduled_departure
            )
        `)
        .gte("package_delivery_window.scheduled_departure", dayStart)
        .lte("package_delivery_window.scheduled_departure", dayEnd)

    if (busyError) throw busyError

    const busyDriverIds = new Set<string>()
    const busyVehicleIds = new Set<string>()
    for (const a of busyAssignments ?? []) {
        if (a.package_delivery_window) {
            if (a.driver_id) busyDriverIds.add(a.driver_id)
            if (a.vehicle_id) busyVehicleIds.add(a.vehicle_id)
        }
    }

    const filteredPairs = validPairs.filter(
        (p) => !busyDriverIds.has(p.driver_id) && !busyVehicleIds.has(p.vehicle_id)
    )

    // Enrich with display names from auth profile
    const driverIds = [...new Set(filteredPairs.map((p) => p.driver_id))]
    let displayNameMap: Record<string, string> = {}
    if (driverIds.length > 0) {
        const { data: driverProfiles } = await supabase.rpc("get_drivers_by_ids", {
            p_driver_ids: driverIds
        })
        if (driverProfiles) {
            for (const profile of driverProfiles as any[]) {
                displayNameMap[profile.id] = profile.display_name ?? profile.email ?? profile.id
            }
        }
    }

    return filteredPairs.map((p) => {
        const driver = p.drivers as any
        const vehicle = p.vehicles as any
        return {
            dvaId: p.id,
            driverId: p.driver_id,
            vehicleId: p.vehicle_id,
            driverName: displayNameMap[p.driver_id] ?? driver?.driver_license ?? p.driver_id,
            licenseType: driver?.license_type ?? "",
            licenseExpiry: driver?.license_expiry ?? null,
            driverUnderProbation: driver?.driver_under_probation ?? false,
            vehiclePlate: vehicle?.vehicle_plate ?? "",
            vehicleMake: vehicle?.vehicle_make ?? "",
            vehicleModel: vehicle?.vehicle_model ?? "",
            vehicleYear: vehicle?.vehicle_year ?? null,
            vehicleGrossLimits: vehicle?.vehicle_gross_limits ?? null,
            orsVehicleType: vehicle?.vehicle_type?.ors_vehicle_type ?? "driving-car",
        }
    })
}

export interface UnassignedPackage {
    id: string
    tracking_number: string | null
    weight_kg: number | null
    length_cm: number | null
    width_cm: number | null
    height_cm: number | null
    customer_name: string | null
    customer_address: string | null
    customer_suburb: string | null
    customer_state: string | null
    customer_postcode: string | null
    customer_lng: number | null
    customer_lat: number | null
    scheduled_arrival: string | null
}

export async function getUnassignedPackagesByWarehouse(warehouseId: string): Promise<UnassignedPackage[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("packages")
        .select(`
            id,
            tracking_number,
            package_dimensions:package_dimensions!package_dimensions_package_id_fkey(
                weight_kg, length_cm, width_cm, height_cm
            ),
            to_customer:customer!packages_to_customer_fkey(
                customer_name,
                customer_address,
                customer_suburb,
                customer_state,
                customer_postcode,
                customer_location
            ),
            package_delivery_window:package_delivery_window!package_delivery_window_package_id_fkey(
                scheduled_arrival
            ),
            package_assignment!left(
                package_id
            )
        `)
        .eq("warehouse_id", warehouseId)
        .is("package_assignment.package_id", null)

    if (error) throw error

    const rows = data ?? []

    return rows.map((p) => {
        const dims = p.package_dimensions as any
        const cust = p.to_customer as any
        const pdw = p.package_delivery_window as any
        const loc = cust?.customer_location as Location | null
        return {
            id: p.id,
            tracking_number: p.tracking_number ?? null,
            weight_kg: dims?.weight_kg ?? null,
            length_cm: dims?.length_cm ?? null,
            width_cm: dims?.width_cm ?? null,
            height_cm: dims?.height_cm ?? null,
            customer_name: cust?.customer_name ?? null,
            customer_address: cust?.customer_address ?? null,
            customer_suburb: cust?.customer_suburb ?? null,
            customer_state: cust?.customer_state ?? null,
            customer_postcode: cust?.customer_postcode ?? null,
            customer_lng: loc?.coordinates?.[0] ?? null,
            customer_lat: loc?.coordinates?.[1] ?? null,
            scheduled_arrival: pdw?.scheduled_arrival ?? null,
        }
    })
}