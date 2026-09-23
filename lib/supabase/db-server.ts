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
 * The id of the organisation this request is for, resolved from the slug that
 * middleware forwards as `x-org-slug` (the `/orgs/<slug>/…` path segment).
 *
 * Every list, count and picker read below filters on it explicitly. RLS alone is
 * not enough: it admits every organisation the caller belongs to, so a member of
 * two organisations would otherwise see both organisations' rows in each one's
 * dashboard. Memoised per request, since one page runs several of these reads.
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
    // The view carries no organisation_id, so the organisation comes from the
    // package's warehouse. packages.warehouse_id is nullable in the schema, but
    // package creation always sets it.
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

// The active organisation's warehouses, as lightweight pins for the map.
// warehouse_location comes back as a GeoJSON Point ({ coordinates: [lng, lat] }),
// matching how it's read elsewhere (warehouse detail page, package locations).
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

/** One row of the service area list: what the table shows, plus where to point the camera. */
export type ServiceAreaListItem = {
    id: string
    name: string
    created_at: string
    /**
     * Bounding box of this area's geometry, so a row can drive map.fitBounds
     * without the polygon itself crossing to the browser. Null when the stored
     * geometry is not something we can read (nothing this app writes is, but a
     * direct SQL insert could be), in which case the row still lists and only
     * the focus-on-map gesture is unavailable.
     */
    bounds: ServiceAreaBounds | null
}

/**
 * Reads that can legitimately come back with nothing. "No rows" and "the read
 * failed" used to be the same empty value, which let a broken backend render as
 * a healthy org that had simply never drawn an area. Callers branch on `status`
 * to tell those apart.
 */
export type ServiceAreaListResult =
    | { status: "ok"; areas: ServiceAreaListItem[] }
    | { status: "error" }

/**
 * Every service area in the active organisation, for the list on the service areas page.
 *
 * Deliberately unscoped by viewport: the map next to this list fetches only what
 * is on screen (a city's worth of polygons is too much to draw at once), but an
 * area drawn in the wrong place is exactly the one the dispatcher needs to find,
 * and it is never in view. There is no pagination either; the table pages
 * client-side. That is fine at the number of areas an organisation draws by
 * hand, and is a known limit rather than an oversight.
 */
export async function getServiceAreas(): Promise<ServiceAreaListResult> {
    const supabase = await createClient()
    const organisationId = await getActiveOrganisationId()
    const { data, error } = await supabase
        .from("service_areas")
        .select("id, name, geometry, created_at")
        .eq("organisation_id", organisationId)
        // Soft deletes on this table are filtered here rather than in RLS, so a
        // read without this predicate would keep showing retired territories.
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
    /**
     * The area's own geometry as a one-feature collection, so the detail map can
     * draw it without a second fetch. Empty when the stored geometry is not
     * something we can read, which the map reports rather than rendering blank.
     */
    featureCollection: ServiceAreaFeatureCollection
    bounds: ServiceAreaBounds | null
}

export type ServiceAreaDetailResult =
    | { status: "ok"; area: ServiceAreaDetail }
    /** No live area with this id is visible to this user. */
    | { status: "not-found" }
    | { status: "error" }

/**
 * One service area by id, for its detail page.
 *
 * Three outcomes rather than a nullable row, for the same reason getServiceAreas()
 * returns a status: a failed read and a retired-or-missing area are different
 * things to say to a dispatcher, and collapsing them means a broken backend
 * renders as "this area does not exist".
 *
 * "not-found" also covers an area belonging to another organisation. RLS filters
 * it out of the select rather than raising, which is the behaviour to want:
 * confirming that an id exists somewhere else would be a small tenancy leak.
 */
export async function getServiceAreaDetail(id: string): Promise<ServiceAreaDetailResult> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("service_areas")
        .select("id, name, geometry, created_at")
        // The soft delete on this table is filtered in the query layer, never in
        // RLS, so a retired area is only "not found" because of this line.
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

// Minimal organisation shape the public booking page needs (id to scope rates,
// name for headings/empty state, slug to forward to the payments API).
export type BookingOrganisation = {
    id: string
    name: string | null
    slug: string
}

// Resolve an organisation by its public slug. Used by the unauthenticated
// booking page (<slug>.hikyaku.org/booking), so it runs under the anon client.
// organisations has RLS with an authenticated-only SELECT policy, so anon can't
// read the table directly; the get_booking_organisation RPC is SECURITY DEFINER
// and granted to anon, exposing only id/name/slug. Returns null when no org
// matches the slug.
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

/**
 * The bounding box around a list of areas, used to point the map somewhere
 * useful on first paint. Null when there is nothing to frame.
 *
 * Built from the rows getServiceAreas() already read rather than from the
 * get_service_area_extent RPC, which takes no organisation and so framed every
 * organisation the caller belongs to. Reading the list also means the box only
 * covers live areas, where the RPC included retired ones.
 */
export function getServiceAreaListBounds(areas: ServiceAreaListItem[]): ServiceAreaBounds | null {
    const boxes = areas.flatMap((area) => (area.bounds ? [area.bounds] : []))
    if (boxes.length === 0) return null

    return [
        [Math.min(...boxes.map(([min]) => min[0])), Math.min(...boxes.map(([min]) => min[1]))],
        [Math.max(...boxes.map(([, max]) => max[0])), Math.max(...boxes.map(([, max]) => max[1]))],
    ]
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

    // The RPC takes no organisation and returns every area RLS admits, but it
    // does return each row's organisation_id, so the active one is kept here.
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
    /** vrp_optimization.id — what the /api/v1/shifts endpoints are keyed on. */
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
 * The shift behind a route. A shift with no packages has no package_assignment
 * rows, so its driver/vehicle/warehouse/date can only come from here.
 *
 * These used to live in a `request->_meta` JSON blob that the web manual-shift
 * action stuffed by hand; AddShiftLifecycleColumns made them real, indexed
 * columns and backfilled the historical blobs, so this reads them directly.
 * Returns null for an unknown route.
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

/**
 * A route's planned distance and where it came from. `distance_m` stays in
 * metres: the shift page converts at the render and nowhere before it.
 */
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
 * Every live driving limit profile in one organisation, by name, for the
 * profiles page and the organisation default picker. Soft deletes are filtered
 * here, never in RLS, so a retired profile only disappears because of the
 * `is_deleted` predicate. The organisation is filtered here too: RLS lets a
 * member of two organisations read both organisations' profiles.
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

/**
 * One live profile of this organisation. Any other organisation's profile is
 * "not-found", including one the caller could read as a member of both.
 */
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

/** The organisation's default profile pointer. It can still name a retired profile, which callers treat as no default. */
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

/**
 * How many drivers point at each profile, keyed by profile id. Needs
 * `drivers.view`; without it the counts come back empty rather than failing the
 * page, since they only inform the delete confirmation.
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
 * Public package tracking. Backed by the `get_tracking_details` SECURITY DEFINER
 * RPC (migration 0025), scoped to the organisation slug. Returns null when the
 * tracking number doesn't belong to that org. Driver name/vehicle/location are
 * only present while the package is IN_TRANSIT.
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

    // package_assignment has no direct FK to package_delivery_window (both relate
    // only through packages), so PostgREST cannot embed one into the other. Resolve
    // the busy set in two steps: which packages depart that day, then who carries them.
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
 * All non-deleted driver–vehicle pairs in a warehouse, for the on-demand
 * optimisation set-off dialog. Unlike getAvailableDriverVehiclePairs this does
 * NOT drop "busy" pairs: the optimiser plans a next wave for vehicles that are
 * currently out, so the dispatcher may want to set their departure too.
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