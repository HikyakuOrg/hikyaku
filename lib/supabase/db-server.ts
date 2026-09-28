import { PackageStatus } from "@/app/models/package-status"
import {
    createServiceAreaFeatureCollection,
    emptyServiceAreaFeatureCollection,
    getServiceAreaFeatureCollectionBounds,
    type ServiceAreaBounds,
    type ServiceAreaFeatureCollection,
} from "@/lib/maps/service-area-geometry"
import { Tables } from "./supabase"
import { VrpOptimizationStatus } from "@/app/models/vrp-optimization-status"
import { createClient } from "./server"
import type { DrivingLimitProfile } from "@/lib/driving-limits"
import { toDispatchSettings, type DispatchSettings } from "@/lib/dispatch-settings"
import { PackageOptimisation, Location } from "@/app/models/package-optimisation"
import { listCustomersAction, getCustomerAction } from "@/lib/actions/customers"
import { TrackingDetails } from "@/app/models/tracking"
import { headers } from "next/headers"
import { cache } from "react"

type ServiceAreaViewportBounds = {
    minLat: number
    minLng: number
    maxLat: number
    maxLng: number
}

/**
 * The organisation id for this request, from the `x-org-slug` header that
 * middleware sets. Cached per request.
 *
 * Every list, count and picker read below filters on it. RLS alone admits every
 * organisation the caller belongs to.
 */
export const getActiveOrganisationId = cache(async (): Promise<string> => {
    const slug = (await headers()).get("x-org-slug")
    if (!slug) throw new Error("No active organisation.")

    const supabase = await createClient()
    const { data, error } = await supabase
        .from("organisations")
        .select("id")
        .eq("slug", slug)
        .maybeSingle()

    if (error) throw error
    if (!data) throw new Error("No active organisation.")
    return data.id
})

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
    const organisationId = await getActiveOrganisationId()
    // The view has no organisation_id, so filter through the warehouse.
    // Package creation always sets warehouse_id.
    const { count, error } = await supabase
        .from('packages_with_latest_status')
        .select('id, warehouse!inner(organisation_id)', { count: 'exact', head: true })
        .eq('warehouse.organisation_id', organisationId)
        .in('current_status', status)
    if (error) {
        console.error(error)
        return 0
    }
    return count
}

export async function getDriversCount() {
    const supabase = await createClient()
    const organisationId = await getActiveOrganisationId()
    const { count, error } = await supabase
        .from("drivers")
        .select("*", { count: 'exact', head: true })
        .eq("organisation_id", organisationId)
    if (error) throw error
    return count
}

export async function getFleetSize() {
    const supabase = await createClient()
    const organisationId = await getActiveOrganisationId()
    const { count, error } = await supabase
        .from("vehicles")
        .select("*", { count: 'exact', head: true })
        .eq("organisation_id", organisationId)
        .eq("is_deleted", false)
    if (error) throw error
    return count
}

export async function getWarehousesCount() {
    const supabase = await createClient()
    const organisationId = await getActiveOrganisationId()
    const { count, error } = await supabase
        .from("warehouse")
        .select("*", { count: 'exact', head: true })
        .eq("organisation_id", organisationId)
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

    const organisationId = await getActiveOrganisationId()
    const { data, error, count } = await supabase
        .from('warehouse')
        .select('*', { count: 'exact' })
        .eq('organisation_id', organisationId)
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

// Only the fields the warehouse cards show, so load-more sends no geometry.
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

// The active organisation's warehouses as map pins. warehouse_location is a
// GeoJSON Point ({ coordinates: [lng, lat] }).
export async function getWarehouseLocations(): Promise<WarehousePin[]> {
    const supabase = await createClient()
    const organisationId = await getActiveOrganisationId()
    const { data, error } = await supabase
        .from('warehouse')
        .select('id, warehouse_name, warehouse_address, warehouse_location')
        .eq('organisation_id', organisationId)
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

/** One row of the service area list, with bounds for the map camera. */
export type ServiceAreaListItem = {
    id: string
    name: string
    created_at: string
    /**
     * Bounding box for map.fitBounds, so the polygon is not sent to the
     * browser. Null when the geometry cannot be read; the row still shows.
     */
    bounds: ServiceAreaBounds | null
}

/** `status` tells "no areas" apart from "the read failed". */
export type ServiceAreaListResult =
    | { status: "ok"; areas: ServiceAreaListItem[] }
    | { status: "error" }

/**
 * Every service area in the active organisation, for the service areas list.
 *
 * Not limited to the map viewport, so a dispatcher can find an area drawn in
 * the wrong place. The table pages on the client; organisations draw few areas.
 */
export async function getServiceAreas(): Promise<ServiceAreaListResult> {
    const supabase = await createClient()
    const organisationId = await getActiveOrganisationId()
    const { data, error } = await supabase
        .from("service_areas")
        .select("id, name, geometry, created_at")
        .eq("organisation_id", organisationId)
        // RLS does not filter soft deletes.
        .eq("is_deleted", false)
        .order("name", { ascending: true })

    if (error) {
        console.error(error)
        return { status: "error" }
    }

    return {
        status: "ok",
        areas: (data ?? []).map((serviceArea) => ({
            id: serviceArea.id,
            name: serviceArea.name,
            created_at: serviceArea.created_at,
            bounds: getServiceAreaFeatureCollectionBounds(
                createServiceAreaFeatureCollection([serviceArea])
            ),
        })),
    }
}

/** One service area, with its polygon already prepared for a map. */
export type ServiceAreaDetail = {
    id: string
    name: string
    created_at: string
    /** The area geometry as a one-feature collection. Empty when it cannot be read. */
    featureCollection: ServiceAreaFeatureCollection
    bounds: ServiceAreaBounds | null
}

export type ServiceAreaDetailResult =
    | { status: "ok"; area: ServiceAreaDetail }
    /** No live area with this id is visible to this user. */
    | { status: "not-found" }
    | { status: "error" }

/**
 * One service area by id, for its detail page. A failed read and a missing area
 * are different results.
 *
 * "not-found" also covers an area in another organisation, so the page does
 * not confirm that the id exists.
 */
export async function getServiceAreaDetail(id: string): Promise<ServiceAreaDetailResult> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("service_areas")
        .select("id, name, geometry, created_at")
        // RLS does not filter soft deletes.
        .eq("is_deleted", false)
        .eq("id", id)
        .maybeSingle()

    if (error) {
        console.error(error)
        return { status: "error" }
    }

    if (!data) {
        return { status: "not-found" }
    }

    const featureCollection = createServiceAreaFeatureCollection([data])

    return {
        status: "ok",
        area: {
            id: data.id,
            name: data.name,
            created_at: data.created_at,
            featureCollection,
            bounds: getServiceAreaFeatureCollectionBounds(featureCollection),
        },
    }
}

// The organisation fields the public booking page needs.
export type BookingOrganisation = {
    id: string
    name: string | null
    slug: string
}

// Find an organisation by slug for the public booking page. Anon cannot read
// `organisations`, so this uses the get_booking_organisation RPC, which returns
// only id, name and slug. Returns null when no organisation matches.
export async function getOrganisationBySlug(slug: string): Promise<BookingOrganisation | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .rpc("get_booking_organisation", { p_slug: slug })
        .maybeSingle()

    if (error) {
        console.error(error)
        return null
    }
    return data
}

export async function getServiceAreasInBounds(bounds: ServiceAreaViewportBounds) {
    const supabase = await createClient()
    const organisationId = await getActiveOrganisationId()
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

    // The RPC returns areas from every organisation RLS allows. Keep the active one.
    return createServiceAreaFeatureCollection(
        (data ?? []).filter((area) => area.organisation_id === organisationId)
    )
}

export async function getWarehouseSummaries() {
    const supabase = await createClient()
    const organisationId = await getActiveOrganisationId()

    const { data: warehouses, error: wError } = await supabase
        .from('warehouse')
        .select('id, warehouse_name')
        .eq('organisation_id', organisationId)
        .order('warehouse_name', { ascending: true })

    if (wError) {
        console.error(wError)
        return []
    }

    const summaries = await Promise.all(warehouses.map(async (w) => {
        const { count } = await supabase
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
                coverage_outcome,
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
                        customer_unit,
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

/** The shift (`vrp_optimization` row) a route belongs to. */
export interface ShiftMeta {
    /** vrp_optimization.id, used by the /api/v1/shifts endpoints. */
    optimisation_id: string
    driver_id: string | null
    vehicle_id: string | null
    warehouse_id: string | null
    /** Warehouse-local service day, YYYY-MM-DD. */
    shift_date: string | null
    status: VrpOptimizationStatus
    scheduled_start: string | null
    revision: number
}

/**
 * The shift of a route, or null for an unknown route. A shift with no packages
 * has no package_assignment rows, so its driver, vehicle, warehouse and date
 * come only from here.
 */
export async function getShiftMeta(routeId: string): Promise<ShiftMeta | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("vrp_route")
        .select(`
            vrp_solution:vrp_solution!vrp_route_solution_id_fkey(
                vrp_optimization:vrp_optimization!vrp_solution_optimization_id_fkey(
                    id,
                    driver_id,
                    vehicle_id,
                    warehouse_id,
                    shift_date,
                    status,
                    scheduled_start,
                    revision
                )
            )
        `)
        .eq("id", routeId)
        .maybeSingle()

    if (error || !data) return null

    const optimisation = data.vrp_solution?.vrp_optimization
    if (!optimisation) return null

    return {
        optimisation_id: optimisation.id,
        driver_id: optimisation.driver_id,
        vehicle_id: optimisation.vehicle_id,
        warehouse_id: optimisation.warehouse_id,
        shift_date: optimisation.shift_date,
        status: optimisation.status as VrpOptimizationStatus,
        scheduled_start: optimisation.scheduled_start,
        revision: optimisation.revision,
    }
}

/** Server-side vehicle fetch for the shift detail card (satisfies VehicleCardData). */
export async function getVehicleById(vehicleId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", vehicleId)
        .maybeSingle()
    if (error) {
        console.error(error)
        return null
    }
    return data
}

/** A route's planned distance in metres, and its source. */
export async function getRouteDistance(
    routeId: string,
): Promise<{ distance_m: number | null; distance_source: string | null } | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("vrp_route")
        .select("distance_m, distance_source")
        .eq("id", routeId)
        .maybeSingle()
    if (error) {
        console.error(error)
        return null
    }
    return data
}

export type DrivingLimitProfileListResult =
    | { status: "ok"; profiles: DrivingLimitProfile[] }
    | { status: "error" }

/**
 * Live driving limit profiles in one organisation, by name. RLS filters
 * neither soft deletes nor the organisation, so this does.
 */
export async function listDrivingLimitProfiles(organisationId: string): Promise<DrivingLimitProfileListResult> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("driving_limit_profile")
        .select("id, name, max_working_seconds, max_driving_seconds, max_distance_m, max_stops")
        .eq("organisation_id", organisationId)
        .eq("is_deleted", false)
        .order("name", { ascending: true })

    if (error) {
        console.error(error)
        return { status: "error" }
    }

    return { status: "ok", profiles: data ?? [] }
}

export type DrivingLimitProfileDetailResult =
    | { status: "ok"; profile: DrivingLimitProfile }
    | { status: "not-found" }
    | { status: "error" }

/** One live profile of this organisation. A profile from another organisation is "not-found". */
export async function getDrivingLimitProfileDetail(
    organisationId: string,
    id: string,
): Promise<DrivingLimitProfileDetailResult> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("driving_limit_profile")
        .select("id, name, max_working_seconds, max_driving_seconds, max_distance_m, max_stops")
        .eq("id", id)
        .eq("organisation_id", organisationId)
        .eq("is_deleted", false)
        .maybeSingle()

    if (error) {
        console.error(error)
        return { status: "error" }
    }

    return data ? { status: "ok", profile: data } : { status: "not-found" }
}

export type OrganisationDrivingLimitSettingsResult =
    | { status: "ok"; organisationId: string; defaultProfileId: string | null }
    | { status: "error" }

/** The organisation's default profile id. A deleted profile counts as no default. */
export async function getOrganisationDrivingLimitSettings(slug: string): Promise<OrganisationDrivingLimitSettingsResult> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("organisations")
        .select("id, default_driving_limit_profile_id")
        .eq("slug", slug)
        .maybeSingle()

    if (error || !data) {
        if (error) console.error(error)
        return { status: "error" }
    }

    return { status: "ok", organisationId: data.id, defaultProfileId: data.default_driving_limit_profile_id }
}

export type OrganisationDispatchSettingsResult =
    | { status: "ok"; organisationId: string; settings: DispatchSettings }
    | { status: "error" }

/** The organisation's dispatch settings, or the defaults before the first save. */
export async function getOrganisationDispatchSettings(slug: string): Promise<OrganisationDispatchSettingsResult> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("organisations")
        .select("id, organisation_dispatch_settings(assignment_mode, load_spread_enabled, service_area_matching)")
        .eq("slug", slug)
        .maybeSingle()

    if (error || !data) {
        if (error) console.error(error)
        return { status: "error" }
    }

    return {
        status: "ok",
        organisationId: data.id,
        settings: toDispatchSettings(data.organisation_dispatch_settings),
    }
}

/**
 * Driver count per profile id, for the delete confirmation. Needs
 * `drivers.view`; without it the result is empty.
 */
export async function countDriversByDrivingLimitProfile(): Promise<Record<string, number>> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("drivers")
        .select("driving_limit_profile_id")
        .not("driving_limit_profile_id", "is", null)

    if (error) {
        console.error(error)
        return {}
    }

    const counts: Record<string, number> = {}
    for (const row of data ?? []) {
        if (row.driving_limit_profile_id) {
            counts[row.driving_limit_profile_id] = (counts[row.driving_limit_profile_id] ?? 0) + 1
        }
    }
    return counts
}

/**
 * Public package tracking through the `get_tracking_details` RPC. Returns null
 * when the tracking number is not in that organisation. Driver, vehicle and
 * location are present only while the package is IN_TRANSIT.
 */
export async function getTrackingDetails(
    trackingNumber: string,
    slug: string
): Promise<TrackingDetails | null> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("get_tracking_details", {
        p_tracking_number: trackingNumber,
        p_slug: slug,
    })
    if (error) throw error
    return (data as unknown as TrackingDetails | null) ?? null
}

export async function getDriverCurrentLocation(driverId: string): Promise<[number, number] | null> {
    if (!driverId) return null

    const supabase = await createClient()
    const { data, error } = await supabase
        .from("driver_current_location")
        .select("location, speed, updated_at")
        .eq("driver_id", driverId)
        .maybeSingle()

    if (error) throw error

    const location = data?.location as Location | null
    if (!location?.coordinates) return null

    return [location.coordinates[0], location.coordinates[1]]
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

    // PostgREST cannot join package_assignment to package_delivery_window, so
    // find the packages that depart that day, then who carries them.
    const { data: scheduledWindows, error: windowsError } = await supabase
        .from("package_delivery_window")
        .select("package_id")
        .gte("scheduled_departure", dayStart)
        .lte("scheduled_departure", dayEnd)

    if (windowsError) throw windowsError

    const busyPackageIds = (scheduledWindows ?? [])
        .map((w) => w.package_id)
        .filter((id): id is string => !!id)

    const busyDriverIds = new Set<string>()
    const busyVehicleIds = new Set<string>()

    if (busyPackageIds.length > 0) {
        const { data: busyAssignments, error: busyError } = await supabase
            .from("package_assignment")
            .select("driver_id, vehicle_id")
            .in("package_id", busyPackageIds)

        if (busyError) throw busyError

        for (const a of busyAssignments ?? []) {
            if (a.driver_id) busyDriverIds.add(a.driver_id)
            if (a.vehicle_id) busyVehicleIds.add(a.vehicle_id)
        }
    }

    const filteredPairs = validPairs.filter(
        (p) => !busyDriverIds.has(p.driver_id) && !busyVehicleIds.has(p.vehicle_id)
    )

    // Enrich with display names from auth profile
    const driverIds = [...new Set(filteredPairs.map((p) => p.driver_id))]
    const displayNameMap: Record<string, string> = {}
    if (driverIds.length > 0) {
        const { data: driverProfiles } = await supabase.rpc("get_drivers_by_ids", {
            p_driver_ids: driverIds
        })
        if (driverProfiles) {
            for (const profile of driverProfiles) {
                displayNameMap[profile.id] = profile.display_name ?? profile.email ?? profile.id
            }
        }
    }

    return filteredPairs.map((p) => {
        const driver = p.drivers
        const vehicle = p.vehicles
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

export interface OptimisationVehicleOption {
    vehicleId: string
    driverId: string
    driverName: string
    vehiclePlate: string
}

/**
 * All driver and vehicle pairs in a warehouse, for the optimisation departure
 * dialog. Busy pairs stay in: the optimiser can plan a next wave for vehicles
 * that are out now.
 */
export async function getOptimisationVehicleOptions(warehouseId: string): Promise<OptimisationVehicleOption[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("driver_vehicle_assignment")
        .select(`
            driver_id,
            vehicle_id,
            vehicles:vehicles(
                id,
                vehicle_plate,
                is_deleted,
                warehouse_id
            )
        `)
        .eq("vehicles.warehouse_id", warehouseId)
        .eq("vehicles.is_deleted", false)

    if (error) throw error

    const validPairs = (data ?? []).filter(
        (p) => p.vehicles && !p.vehicles.is_deleted && p.vehicles.warehouse_id === warehouseId
    )

    const driverIds = [...new Set(validPairs.map((p) => p.driver_id))]
    const displayNameMap: Record<string, string> = {}
    if (driverIds.length > 0) {
        const { data: driverProfiles } = await supabase.rpc("get_drivers_by_ids", {
            p_driver_ids: driverIds,
        })
        if (driverProfiles) {
            for (const profile of driverProfiles) {
                displayNameMap[profile.id] = profile.display_name ?? profile.email ?? profile.id
            }
        }
    }

    return validPairs.map((p) => ({
        vehicleId: p.vehicle_id,
        driverId: p.driver_id,
        driverName: displayNameMap[p.driver_id] ?? p.driver_id,
        vehiclePlate: p.vehicles?.vehicle_plate ?? "",
    }))
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
        const dims = p.package_dimensions
        const cust = p.to_customer
        const pdw = p.package_delivery_window
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