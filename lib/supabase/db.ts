// service_areas.is_deleted is a soft delete. RLS does not filter it, so every
// read must exclude deleted rows.
export async function getServiceAreaById(id: string) {
    const { data, error } = await supabase
        .from("service_areas")
        .select("id, name, geometry")
        .eq("id", id)
        .eq("is_deleted", false)
        .single()
    if (error) throw error
    return data
}

export async function updateServiceArea(id: string, name: string, geometry: string) {
    const { data, error } = await supabase
        .from("service_areas")
        .update({ name, geometry })
        .eq("id", id)
        // A deleted area cannot be edited. Zero matched rows give PGRST116,
        // which describeWriteError() reports.
        .eq("is_deleted", false)
        .select()
        .single()
    if (error) throw error
    return data
}

/**
 * Soft-delete service areas in one write, like deleteVehicle(). Existing
 * packages and shifts do not change: coverage is decided once, when a package
 * is created.
 *
 * Returns the deleted ids. An RLS refusal matches zero rows without an error,
 * so the caller must compare this with the ids it sent.
 */
export async function deleteServiceAreas(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return []

    const { data, error } = await supabase
        .from("service_areas")
        .update({ is_deleted: true })
        .in("id", ids)
        .eq("is_deleted", false)
        .select("id")
    if (error) throw error
    return data.map((row) => row.id)
}

/**
 * A driver row for the service area detail page (attached and attachable
 * tables). Both tables use `components/driver/driver-table`.
 *
 * Dispatch gives a driver work only from their own warehouse, so the tables
 * show `warehouse_name`. See `service-area-driver-sheet.tsx` for why the picker
 * shows this column and does not filter on it.
 */
export type ServiceAreaDriver = ListDriverDto & {
    warehouse_id: string | null
    /** Null when the driver has no warehouse, or when the caller cannot read it. */
    warehouse_name: string | null
}

/** One page of drivers that are not yet attached to an area. */
export type AttachableDriverPage = {
    drivers: ServiceAreaDriver[]
    total: number
    totalPages: number
}

/**
 * Driver ids attached to an area. `driver_service_area` has no `is_deleted`;
 * every caller already has a live area id.
 */
async function getServiceAreaDriverIds(areaId: string): Promise<string[]> {
    const { data, error } = await supabase
        .from("driver_service_area")
        .select("driver_id")
        .eq("service_area_id", areaId)
    if (error) throw error
    return (data ?? []).map((link) => link.driver_id)
}

/**
 * Warehouse id and name for each driver. Two queries, not a PostgREST embed:
 * `warehouse` needs `warehouse.view`, and `drivers` needs `drivers.view`. A
 * caller without `warehouse.view` gets an empty warehouse column, not an error.
 */
async function getDriverWarehouses(driverIds: string[]) {
    if (driverIds.length === 0) {
        return new Map<string, { warehouseId: string | null; warehouseName: string | null }>()
    }

    const { data: driverRows, error: driverError } = await supabase
        .from("drivers")
        .select("id, warehouse_id")
        .in("id", driverIds)
    if (driverError) throw driverError

    const warehouseIds = Array.from(
        new Set((driverRows ?? []).map((row) => row.warehouse_id).filter((id): id is string => Boolean(id)))
    )

    const warehouseNames = new Map<string, string>()

    if (warehouseIds.length > 0) {
        const { data: warehouseRows, error: warehouseError } = await supabase
            .from("warehouse")
            .select("id, warehouse_name")
            .in("id", warehouseIds)

        // Not fatal: without warehouse.view the warehouse column stays empty.
        if (warehouseError) {
            console.error(warehouseError)
        }

        for (const warehouse of warehouseRows ?? []) {
            warehouseNames.set(warehouse.id, warehouse.warehouse_name)
        }
    }

    return new Map(
        (driverRows ?? []).map((row) => [
            row.id,
            {
                warehouseId: row.warehouse_id,
                warehouseName: row.warehouse_id ? warehouseNames.get(row.warehouse_id) ?? null : null,
            },
        ])
    )
}

/**
 * Merge driver ids with profiles and warehouses into display rows. A driver
 * with no profile (its `auth.users` row is gone) keeps its row, so page counts
 * match the screen.
 */
function toServiceAreaDrivers(
    driverIds: string[],
    profiles: ListDriverDto[],
    warehouses: Map<string, { warehouseId: string | null; warehouseName: string | null }>,
): ServiceAreaDriver[] {
    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))

    return driverIds.map((driverId) => {
        const profile = profilesById.get(driverId)
        const warehouse = warehouses.get(driverId)

        return {
            id: driverId,
            email: profile?.email ?? "",
            phone_number: profile?.phone_number ?? "",
            display_name: profile?.display_name ?? "Unnamed driver",
            avatar_url: profile?.avatar_url ?? null,
            driver_license: profile?.driver_license ?? null,
            license_expiry: profile?.license_expiry ?? null,
            warehouse_id: warehouse?.warehouseId ?? null,
            warehouse_name: warehouse?.warehouseName ?? null,
        }
    })
}

/**
 * The drivers attached to one service area, sorted by name.
 *
 * Three reads, because PostgREST cannot join these sources: links in
 * `driver_service_area`, warehouse on `drivers`, and name, phone and avatar in
 * `auth.users` (through the `get_drivers_by_ids` RPC). A depot has few drivers,
 * so this costs less than a new database function.
 */
export async function getDriversByServiceArea(areaId: string): Promise<ServiceAreaDriver[]> {
    const driverIds = await getServiceAreaDriverIds(areaId)

    if (driverIds.length === 0) {
        return []
    }

    const [profiles, warehouses] = await Promise.all([
        getDriversByIds(driverIds),
        getDriverWarehouses(driverIds),
    ])

    return toServiceAreaDrivers(driverIds, profiles, warehouses)
        .sort((left, right) => left.display_name.localeCompare(right.display_name))
}

/**
 * One page of drivers not yet attached to an area.
 *
 * The exclusion runs in the database before paging, so every page is full. No
 * driver RPC takes a service area, so this pages `drivers` directly and loads
 * names after. Ordered by id descending, like `get_drivers_paginated`; the name
 * is not a column on this table.
 */
export async function getAttachableDriversForServiceArea(
    organisationId: string,
    areaId: string,
    page: number,
    pageSize: number,
): Promise<AttachableDriverPage> {
    const attachedIds = await getServiceAreaDriverIds(areaId)
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
        .from("drivers")
        .select("id", { count: "exact" })
        .eq("organisation_id", organisationId)
        .order("id", { ascending: false })
        .range(from, to)

    if (attachedIds.length > 0) {
        // PostgREST needs a parenthesised list. The ids are uuids from the
        // database, so they need no escaping.
        query = query.not("id", "in", `(${attachedIds.join(",")})`)
    }

    const { data, error, count } = await query
    if (error) throw error

    const driverIds = (data ?? []).map((row) => row.id)
    const total = count ?? 0

    if (driverIds.length === 0) {
        return { drivers: [], total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
    }

    const [profiles, warehouses] = await Promise.all([
        getDriversByIds(driverIds),
        getDriverWarehouses(driverIds),
    ])

    return {
        drivers: toServiceAreaDrivers(driverIds, profiles, warehouses),
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
    }
}

/** One page of an organisation's drivers. */
export type OrganisationDriverPage = {
    drivers: ListDriverDto[]
    total: number
    totalPages: number
}

/**
 * One page of the organisation's drivers, for the vehicle and warehouse
 * pickers. `unassignedOnly` keeps drivers with no warehouse.
 *
 * `get_drivers_paginated` and `list_unassigned_drivers` take no organisation
 * and return drivers from every organisation the caller belongs to, so this
 * pages `drivers` directly. The order matches those RPCs (id descending).
 */
export async function getOrganisationDrivers(
    organisationId: string,
    page: number,
    pageSize: number,
    options: { unassignedOnly?: boolean } = {},
): Promise<OrganisationDriverPage> {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
        .from("drivers")
        .select("id", { count: "exact" })
        .eq("organisation_id", organisationId)
        .order("id", { ascending: false })
        .range(from, to)

    if (options.unassignedOnly) {
        query = query.is("warehouse_id", null)
    }

    const { data, error, count } = await query
    if (error) throw error

    const driverIds = (data ?? []).map((row) => row.id)
    const total = count ?? 0
    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    if (driverIds.length === 0) {
        return { drivers: [], total, totalPages }
    }

    const profiles = await getDriversByIds(driverIds)

    return {
        drivers: toServiceAreaDrivers(driverIds, profiles, new Map()),
        total,
        totalPages,
    }
}

/**
 * Attach drivers to one service area in one insert, so the whole selection
 * succeeds or fails together.
 *
 * `ON CONFLICT DO NOTHING` skips drivers that are already attached. Filtering
 * first would race when two dispatchers staff the same area at the same time.
 *
 * `organisation_id` is required and comes from the area. Composite foreign keys
 * reject a value that does not match both the area and the driver.
 */
export async function attachDriversToServiceArea(areaId: string, driverIds: string[]) {
    if (driverIds.length === 0) {
        return []
    }

    const { data: area, error: areaError } = await supabase
        .from("service_areas")
        .select("organisation_id")
        .eq("id", areaId)
        .eq("is_deleted", false)
        .single()
    if (areaError) throw areaError

    const { data, error } = await supabase
        .from("driver_service_area")
        .upsert(
            driverIds.map((driverId) => ({
                driver_id: driverId,
                service_area_id: areaId,
                organisation_id: area.organisation_id,
            })),
            { onConflict: "driver_id,service_area_id", ignoreDuplicates: true }
        )
        .select()

    // A refused INSERT raises 42501 (a refused UPDATE does not), so empty
    // `data` means every driver was already attached.
    if (error) throw error
    return data ?? []
}

/**
 * Detach one driver from one service area. Stops already on the driver's route
 * stay there.
 *
 * An RLS refusal matches zero rows without an error. `.select().single()` turns
 * that into PGRST116, which describeWriteError() reports.
 */
export async function detachDriverFromServiceArea(areaId: string, driverId: string) {
    const { data, error } = await supabase
        .from("driver_service_area")
        .delete()
        .eq("service_area_id", areaId)
        .eq("driver_id", driverId)
        .select()
        .single()
    if (error) throw error
    return data
}

/** One area a driver covers. */
export type DriverServiceArea = {
    id: string
    name: string
}

/**
 * The areas one driver covers, sorted by name. Two queries, not an embed: the
 * foreign key into `service_areas` is composite, and the generated types treat
 * it as to-many.
 */
export async function getServiceAreasByDriver(driverId: string): Promise<DriverServiceArea[]> {
    const { data: links, error: linksError } = await supabase
        .from("driver_service_area")
        .select("service_area_id")
        .eq("driver_id", driverId)
    if (linksError) throw linksError

    const areaIds = (links ?? []).map((link) => link.service_area_id)
    if (areaIds.length === 0) return []

    const { data: areas, error: areasError } = await supabase
        .from("service_areas")
        .select("id, name")
        .in("id", areaIds)
        .eq("is_deleted", false)
    if (areasError) throw areasError

    return (areas ?? []).sort((left, right) => left.name.localeCompare(right.name))
}

/**
 * Live areas the driver does not cover yet, sorted by name. `search` matches
 * any part of the name. Used by the add-area combobox on the driver page.
 */
export async function searchAttachableServiceAreasForDriver(
    organisationId: string,
    driverId: string,
    search: string,
): Promise<DriverServiceArea[]> {
    const { data: links, error: linksError } = await supabase
        .from("driver_service_area")
        .select("service_area_id")
        .eq("driver_id", driverId)
    if (linksError) throw linksError
    const attachedIds = (links ?? []).map((link) => link.service_area_id)

    let query = supabase
        .from("service_areas")
        .select("id, name")
        .eq("organisation_id", organisationId)
        .eq("is_deleted", false)
        .order("name", { ascending: true })
        .limit(20)

    if (search.trim()) {
        query = query.ilike("name", `%${search.trim()}%`)
    }

    if (attachedIds.length > 0) {
        // PostgREST needs a parenthesised list; see getAttachableDriversForServiceArea.
        query = query.not("id", "in", `(${attachedIds.join(",")})`)
    }

    const { data, error } = await query
    if (error) throw error
    return data ?? []
}

/**
 * Attach a driver to several areas in one insert. `ON CONFLICT DO NOTHING`
 * skips areas that someone else attached a moment ago.
 */
export async function attachServiceAreasToDriver(driverId: string, areaIds: string[]) {
    if (areaIds.length === 0) {
        return []
    }

    const { data: driver, error: driverError } = await supabase
        .from("drivers")
        .select("organisation_id")
        .eq("id", driverId)
        .single()
    if (driverError) throw driverError

    const { data, error } = await supabase
        .from("driver_service_area")
        .upsert(
            areaIds.map((areaId) => ({
                driver_id: driverId,
                service_area_id: areaId,
                organisation_id: driver.organisation_id,
            })),
            { onConflict: "driver_id,service_area_id", ignoreDuplicates: true }
        )
        .select()

    if (error) throw error
    return data ?? []
}

/** Detach one area from one driver. See detachDriverFromServiceArea for `.select().single()`. */
export async function detachServiceAreaFromDriver(driverId: string, areaId: string) {
    const { data, error } = await supabase
        .from("driver_service_area")
        .delete()
        .eq("driver_id", driverId)
        .eq("service_area_id", areaId)
        .select()
        .single()
    if (error) throw error
    return data
}

/** A driver's own warehouse, for the Driver Profile card's Warehouse field. */
export async function getDriverWarehouse(driverId: string): Promise<{ id: string; name: string } | null> {
    const { data: driver, error: driverError } = await supabase
        .from("drivers")
        .select("warehouse_id")
        .eq("id", driverId)
        .single()
    if (driverError) throw driverError
    if (!driver.warehouse_id) return null

    const { data: warehouse, error: warehouseError } = await supabase
        .from("warehouse")
        .select("id, warehouse_name")
        .eq("id", driver.warehouse_id)
        .maybeSingle()
    // Not fatal; see getDriverWarehouses().
    if (warehouseError) {
        console.error(warehouseError)
        return null
    }

    return warehouse ? { id: warehouse.id, name: warehouse.warehouse_name } : null
}

import { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createLazyClient } from "./client";
import { Database, Tables, TablesInsert } from "./supabase";
import { VrpOptimizationStatus } from "@/app/models/vrp-optimization-status";
import { TrackingLocationBroadcast } from "@/app/models/tracking";
import { ListDriverDto } from "../api";
import { getDriversByIds } from "./supabase-rpc";
import type { DrivingLimitProfile, DrivingLimitValues } from "@/lib/driving-limits";
import { toDispatchSettings, toDispatchSettingsRow, type DispatchSettings } from "@/lib/dispatch-settings";


const supabase = createLazyClient()


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

// Null when the package has no assignment yet (unassigned or queued).
// .single() would log a PGRST116 406 for each of these.
export async function getPackageAssignment(packageId: string) {
    const { data, error } = await supabase.from("package_assignment").select("*").eq("package_id", packageId).maybeSingle()
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


type DriverCurrentLocationRow = Database["public"]["Tables"]["driver_current_location"]["Row"]

export function subscribeToDriverLocationUpdates(driverId: string, onUpdate: (payload: RealtimePostgresChangesPayload<DriverCurrentLocationRow>) => void) {
    const channel = supabase
        .channel("driver-location-updates")
        .on<DriverCurrentLocationRow>(
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

/**
 * Live location for the public tracking page, on the private Realtime channel
 * `tracking:<trackingNumber>`. The DB trigger and RLS allow this only while the
 * package is IN_TRANSIT. The payload has lng, lat and updated_at, and no
 * driver id.
 */
export function subscribeToTrackingLocation(
    trackingNumber: string,
    onLocation: (location: TrackingLocationBroadcast) => void
): RealtimeChannel {
    // Realtime Authorization needs a token. On the public page this is the
    // anon key the browser client already has.
    void supabase.realtime.setAuth()

    const channel = supabase
        .channel(`tracking:${trackingNumber}`, { config: { private: true } })
        .on(
            "broadcast",
            { event: "location" },
            (message) => onLocation(message.payload as TrackingLocationBroadcast)
        )
        .subscribe()

    return channel
}

export async function getDriverCurrentLocation(driverId: string): Promise<[number, number] | null> {
    if (!driverId) return null

    const { data, error } = await supabase
        .from("driver_current_location")
        .select("location")
        .eq("driver_id", driverId)
        .maybeSingle()

    if (error) throw error

    const location = data?.location as { coordinates?: [number, number] } | null
    if (!location?.coordinates) return null

    return [location.coordinates[0], location.coordinates[1]]
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

export async function getVehiclesByType(organisationId: string, selectedTypes: string[], page: number, pageSize: number) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
        .from('vehicles')
        .select(
            `
        id,
        organisation_id,
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
          valhalla_vehicle_type,
          vehicle_type,
          vehicle_description
        )
      `,
            { count: 'exact' }
        )
        .eq('organisation_id', organisationId)
        .eq('is_deleted', false)

    // Filter only when types are selected
    if (selectedTypes.length > 0) {
        query = query.in('vehicle_type', selectedTypes)
    }

    const { data, error, count } = await query.range(from, to)

    if (error) throw error

    return { data: data ?? [], total: count ?? 0 }
}


export async function getWarehouses(organisationId: string, page: number, pageSize: number) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count } = await supabase
        .from("warehouse")
        .select("*", { count: 'exact' })
        .eq("organisation_id", organisationId)
        .order("warehouse_name", { ascending: true })
        .range(from, to)
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
          valhalla_vehicle_type,
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
        organisation_id,
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
          valhalla_vehicle_type,
          vehicle_type,
          vehicle_description
        )
      `).eq("warehouse_id", warehouseId)
        .eq("is_deleted", false)
        .range(from, to)
    if (error) throw error
    return { data: data ?? [], total: count ?? 0 }
}

export async function getVehiclesNotAssigned(organisationId: string, page: number, pageSize: number) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase.from("vehicles").select(`
        id,
        organisation_id,
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
          valhalla_vehicle_type,
          vehicle_type,
          vehicle_description
        )
      `, { count: "exact" }).is("warehouse_id", null)
        .eq("organisation_id", organisationId)
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
        organisation_id,
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
          valhalla_vehicle_type,
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

export async function createVehicle(vehicle: TablesInsert<'vehicles'>) {
    const { data, error } = await supabase.from("vehicles").insert(vehicle).select().single()
    if (error) throw error
    return data
}

/**
 * Hard-delete a vehicle the add form just created, when saving its skills or
 * images fails. This frees the plate so the form can be sent again. The FK
 * cascade removes its vehicle_skills rows. Returns false when RLS skipped the
 * row (no vehicles.delete).
 */
export async function discardVehicle(vehicleId: string) {
    const { data, error } = await supabase.from("vehicles").delete().eq("id", vehicleId).select("id")
    if (error) throw error
    return (data ?? []).length > 0
}

export async function getVehicles(organisationId: string) {
    const { data, error } = await supabase
        .from("vehicles")
        .select("id, vehicle_plate, vehicle_make, vehicle_model, vehicle_year")
        .eq("organisation_id", organisationId)
        .eq("is_deleted", false)
    if (error) throw error
    return data
}

export async function createMaintenanceRecord(record: {
    organisation_id: string
    vehicle_id: string
    user_id: string | null
    odometer: number
    description: string
    date_serviced: string
}) {
    const { data, error } = await supabase
        .from("vehicle_maintenance")
        .insert(record)
        .select()
        .single()
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
    const { data: assignment } = await supabase
        .from('driver_vehicle_assignment')
        .select(`
            driver_id
        `)
        .eq('vehicle_id', id)
        .maybeSingle()

    let driver = null
    if (assignment?.driver_id) {
        // Fetch driver info using RPC or separate query to get user details
        const { data: drivers } = await supabase
            .rpc('get_drivers_by_ids', { p_driver_ids: [assignment.driver_id] })

        if (drivers && drivers.length > 0) {
            driver = drivers[0]
        }
    }

    // 3. Get maintenance records
    const { data: maintenance } = await supabase
        .from('vehicle_maintenance')
        .select('id, date_serviced, odometer, description, created_at')
        .eq('vehicle_id', id)
        .order('date_serviced', { ascending: false })

    return {
        vehicle,
        currentDriver: driver,
        maintenance: maintenance || []
    }
}

export async function getVehicleDeliveries(
    vehicleId: string,
    page: number = 1,
    pageSize: number = 10
) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data: assignments, error, count } = await supabase
        .from('package_assignment')
        .select(`
            package_id,
            created_at,
            driver_id,
            package:packages (
                tracking_number,
                from_customer:customer!packages_from_customer_fkey (customer_name),
                to_customer:customer!packages_to_customer_fkey (customer_name)
            )
        `, { count: 'exact' })
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .range(from, to)

    if (error) throw error

    const packageIds = (assignments || []).map(a => a.package_id)
    const statusMap: Record<string, string | null> = {}

    if (packageIds.length > 0) {
        const { data: statusRows } = await supabase
            .from('packages_with_latest_status')
            .select('id, current_status')
            .in('id', packageIds)

        for (const row of statusRows || []) {
            if (row.id) statusMap[row.id] = row.current_status
        }
    }

    return {
        deliveries: (assignments || []).map(a => ({
            ...a,
            current_status: statusMap[a.package_id] ?? null
        })),
        total: count ?? 0,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize))
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


export async function getOrganisationIdBySlug(slug: string) {
    const { data, error } = await supabase
        .from("organisations")
        .select("id")
        .eq("slug", slug)
        .single()
    if (error) throw error
    return data.id
}

// driving_limit_profile.is_deleted is a soft delete, like service_areas. RLS
// does not filter it, so every read below does. The hikyaku-api resolver also
// ignores deleted profiles.

const DRIVING_LIMIT_PROFILE_COLUMNS =
    "id, name, max_working_seconds, max_driving_seconds, max_distance_m, max_stops"

export type DrivingLimitProfileInput = DrivingLimitValues & { name: string }

/**
 * Live profiles in one organisation, by name. Filtered by organisation because
 * RLS shows a member the profiles of every organisation they belong to.
 */
export async function getDrivingLimitProfiles(organisationId: string): Promise<DrivingLimitProfile[]> {
    const { data, error } = await supabase
        .from("driving_limit_profile")
        .select(DRIVING_LIMIT_PROFILE_COLUMNS)
        .eq("organisation_id", organisationId)
        .eq("is_deleted", false)
        .order("name", { ascending: true })
    if (error) throw error
    return data ?? []
}

/** Save a new profile. Values are in seconds and metres; only the form converts units. */
export async function createDrivingLimitProfile(organisationId: string, input: DrivingLimitProfileInput) {
    const { data, error } = await supabase
        .from("driving_limit_profile")
        .insert({ ...input, organisation_id: organisationId })
        .select(DRIVING_LIMIT_PROFILE_COLUMNS)
        .single()
    if (error) throw error
    return data
}

/** A deleted row or an RLS refusal gives PGRST116, as in updateServiceArea. */
export async function updateDrivingLimitProfile(id: string, input: DrivingLimitProfileInput) {
    const { data, error } = await supabase
        .from("driving_limit_profile")
        .update(input)
        .eq("id", id)
        .eq("is_deleted", false)
        .select(DRIVING_LIMIT_PROFILE_COLUMNS)
        .single()
    if (error) throw error
    return data
}

/**
 * Soft-delete a profile. Drivers and the organisation default that point at it
 * do not change. The resolver ignores a deleted profile, so those drivers use
 * the organisation default, or no limit.
 */
export async function deleteDrivingLimitProfile(id: string) {
    const { data, error } = await supabase
        .from("driving_limit_profile")
        .update({ is_deleted: true })
        .eq("id", id)
        .eq("is_deleted", false)
        .select("id")
        .single()
    if (error) throw error
    return data
}

/**
 * The profile of a team member's driver row in this organisation. `isDriver` is
 * false when there is no driver row; limits do not apply to that member.
 *
 * Scoped to the organisation because RLS lets users read their own driver row
 * in any organisation.
 */
export async function getDriverDrivingLimitProfileId(
    driverId: string,
    organisationId: string,
): Promise<{ isDriver: boolean; profileId: string | null }> {
    const { data, error } = await supabase
        .from("drivers")
        .select("driving_limit_profile_id")
        .eq("id", driverId)
        .eq("organisation_id", organisationId)
        .maybeSingle()
    if (error) throw error
    return { isDriver: data !== null, profileId: data?.driving_limit_profile_id ?? null }
}

/** Set or clear a driver's profile. A composite foreign key rejects profiles from other organisations. */
export async function setDriverDrivingLimitProfile(driverId: string, organisationId: string, profileId: string | null) {
    const { data, error } = await supabase
        .from("drivers")
        .update({ driving_limit_profile_id: profileId })
        .eq("id", driverId)
        .eq("organisation_id", organisationId)
        .select("id, driving_limit_profile_id")
        .single()
    if (error) throw error
    return data
}

/** The organisation id and its default profile id. That profile can be deleted. */
export async function getOrganisationDrivingLimitDefault(
    slug: string,
): Promise<{ organisationId: string; defaultProfileId: string | null }> {
    const { data, error } = await supabase
        .from("organisations")
        .select("id, default_driving_limit_profile_id")
        .eq("slug", slug)
        .single()
    if (error) throw error
    return { organisationId: data.id, defaultProfileId: data.default_driving_limit_profile_id }
}

/** Set or clear the organisation default. Null means drivers without a profile have no limits. */
export async function setOrganisationDrivingLimitDefault(organisationId: string, profileId: string | null) {
    const { data, error } = await supabase
        .from("organisations")
        .update({ default_driving_limit_profile_id: profileId })
        .eq("id", organisationId)
        .select("id, default_driving_limit_profile_id")
        .single()
    if (error) throw error
    return data
}

/**
 * Save all dispatch settings. Upsert, because the row exists only after the
 * first save; until then the defaults apply. RLS requires `organisation.edit`.
 */
export async function saveOrganisationDispatchSettings(organisationId: string, settings: DispatchSettings) {
    const { data, error } = await supabase
        .from("organisation_dispatch_settings")
        .upsert(toDispatchSettingsRow(organisationId, settings), { onConflict: "organisation_id" })
        .select("assignment_mode, load_spread_enabled, service_area_matching")
        .single()
    if (error) throw error
    return toDispatchSettings(data)
}

export async function searchWarehouse(organisationId: string, search: string) {
    const { data, error } = await supabase.from("warehouse").select("*")
        .eq("organisation_id", organisationId)
        .or(`warehouse_name.ilike.%${search}%,warehouse_address.ilike.%${search}%`)
        .limit(20)
    if (error) throw error
    return data
}

export async function createWarehouse(warehouse: {
    organisation_id: string
    warehouse_name: string
    warehouse_address: string
    warehouse_location: unknown
    warehouse_country: string
    warehouse_zipcode: string
    warehouse_state: string
    warehouse_city: string
}) {
    const { data, error } = await supabase
        .from("warehouse")
        .insert(warehouse)
        .select()
        .single()
    if (error) throw error
    return data
}

export async function searchServiceArea(organisationId: string, search: string) {
    const { data, error } = await supabase
        .from("service_areas")
        .select("id, name")
        .eq("organisation_id", organisationId)
        .eq("is_deleted", false)
        .ilike("name", `%${search}%`)
        .order("name", { ascending: true })
        .limit(20)
    if (error) throw error
    return data
}

// Packages are created through POST /api/v1/packages (lib/actions/packages.ts),
// which writes all package tables in one transaction.

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


export async function getDeliveryRoutes(organisationId: string, page: number, pageSize: number) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const { data, error, count } = await supabase.from("vrp_route")
        .select(`
            id,
            vrp_route_step!inner(route_id, type, solution_id, duration),
            vrp_solution!inner(
                id, optimization_id,
                vrp_optimization!inner(id, created_at, organisation_id)
            )
        `, { count: "exact" })
        .eq("vrp_solution.vrp_optimization.organisation_id", organisationId)
        .range(from, to)
    if (error) throw error
    return { data: data ?? [], total: count ?? 0 }
}


/** One shift (a `vrp_optimization` row) as the calendars show it. */
export interface CalendarShift {
    /** vrp_optimization.id. */
    id: string;
    /** vrp_route.id, used by the shift detail page. Null when the shift has no route yet. */
    route_id: string | null;
    driver_id: string | null;
    /** Warehouse-local service day, YYYY-MM-DD. */
    shift_date: string;
    scheduled_start: string | null;
    status: VrpOptimizationStatus;
    /** Increases on every plan change. The calendar re-fetches when it changes. */
    revision: number;
    /** Packages on the shift. Can be zero. */
    stop_count: number;
    /** Planned route duration in seconds, or null while the shift is empty. */
    duration_seconds: number | null;
    /** `arrival` of the plan's start and end steps, seconds. Null while there is no plan. */
    start_arrival: number | null;
    end_arrival: number | null;
    /** Cumulative travel time on the end step. Only a full solve writes it. */
    end_travel_seconds: number | null;
    /** Planned distance in metres. Null for a plan written before distance was recorded. */
    distance_m: number | null;
    /** 'estimated' or 'measured'. */
    distance_source: string | null;
}

/** All statuses except cancelled. */
const CALENDAR_SHIFT_STATUSES: VrpOptimizationStatus[] = [
    "planned",
    "dispatched",
    "completed",
]

/**
 * Every shift, empty ones included, with a service day in [startDate,
 * endDate]. Only the date part is used: `shift_date` is warehouse-local and has
 * no time.
 */
export async function getShiftsByDates(
    organisationId: string,
    startDate: string,
    endDate: string,
    driverId?: string
): Promise<CalendarShift[]> {
    let query = supabase
        .from('vrp_optimization')
        .select(`
            id,
            driver_id,
            shift_date,
            scheduled_start,
            status,
            revision,
            vrp_solution:vrp_solution!vrp_solution_optimization_id_fkey (
                vrp_route:vrp_route!vrp_route_solution_id_fkey (
                    id,
                    duration,
                    distance_m,
                    distance_source,
                    vrp_route_step:vrp_route_step!vrp_route_step_route_id_fkey ( type, arrival, duration )
                )
            ),
            packages:packages!packages_optimisation_id_fkey ( id )
        `)
        .eq('organisation_id', organisationId)
        .gte('shift_date', startDate.slice(0, 10))
        .lte('shift_date', endDate.slice(0, 10))
        .in('status', CALENDAR_SHIFT_STATUSES)
        // The driving limit marker needs only the start and end steps.
        .in('vrp_solution.vrp_route.vrp_route_step.type', ['start', 'end'])
        .order('shift_date', { ascending: true })

    if (driverId) query = query.eq('driver_id', driverId)

    const { data, error } = await query
    if (error) throw error

    return (data ?? []).flatMap((row) => {
        // shift_date is nullable. A shift without one cannot go on the calendar.
        if (!row.shift_date) return []

        const route = row.vrp_solution.flatMap((solution) => solution.vrp_route)[0] ?? null
        const startStep = route?.vrp_route_step.find((step) => step.type === 'start') ?? null
        const endStep = route?.vrp_route_step.find((step) => step.type === 'end') ?? null

        return [{
            id: row.id,
            route_id: route?.id ?? null,
            driver_id: row.driver_id,
            shift_date: row.shift_date,
            scheduled_start: row.scheduled_start,
            status: row.status as VrpOptimizationStatus,
            revision: row.revision,
            stop_count: row.packages.length,
            duration_seconds: route?.duration ?? null,
            start_arrival: startStep?.arrival ?? null,
            end_arrival: endStep?.arrival ?? null,
            end_travel_seconds: endStep?.duration ?? null,
            distance_m: route?.distance_m ?? null,
            distance_source: route?.distance_source ?? null,
        }]
    })
}

/** Nominal block length for a shift with no planned route yet. */
const EMPTY_SHIFT_DURATION_SECONDS = 60 * 60

/**
 * The calendar position of a shift. It starts at `scheduled_start`, or at 08:00
 * local time on its service day when that is not set.
 */
export function getShiftStartEnd(shift: CalendarShift): { start: Date; end: Date } {
    const start = shift.scheduled_start
        ? new Date(shift.scheduled_start)
        : new Date(`${shift.shift_date}T08:00:00`)
    const seconds = shift.duration_seconds ?? EMPTY_SHIFT_DURATION_SECONDS
    return { start, end: new Date(start.getTime() + seconds * 1000) }
}


export async function createServiceArea(name: string, geometry: string, organisation_id: string) {
    const { data, error } = await supabase
        .from("service_areas")
        .insert({
            name,
            geometry,
            organisation_id,
        })
        .select()
        .single()

    if (error) {
        throw error
    }

    return data
}

// ── Skills catalog ───────────────────────────────────────────────────────────
//
// Organisation labels such as "Fragile Handling". Vehicles have skills and
// packages require them; VROOM enforces the match. The dashboard writes to
// Supabase directly (RLS allows members with `vehicles.update`) because
// hikyaku-api cannot rename skills.

/** A skill in the organisation's catalog, shaped for pickers and chips. */
export type Skill = {
    id: string
    name: string
}

/** Active skills, by name, for pickers. */
export async function getSkills(organisationId: string): Promise<Skill[]> {
    const { data, error } = await supabase
        .from("skills")
        .select("id, name")
        .eq("organisation_id", organisationId)
        .is("archived_at", null)
        .order("name", { ascending: true })
    if (error) throw error
    return data ?? []
}

/** All skills, archived included, newest first, for the Manage Skills dialog. */
export async function getSkillCatalog(organisationId: string): Promise<Tables<'skills'>[]> {
    const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("organisation_id", organisationId)
        .order("created_at", { ascending: false })
    if (error) throw error
    return data ?? []
}

/** Skills by id, to show names for `skillIds`. */
export async function getSkillsByIds(skillIds: string[]): Promise<Skill[]> {
    if (skillIds.length === 0) return []
    const { data, error } = await supabase
        .from("skills")
        .select("id, name")
        .in("id", skillIds)
    if (error) throw error
    return data ?? []
}

export async function createSkill(organisationId: string, name: string) {
    const { data, error } = await supabase
        .from("skills")
        .insert({ organisation_id: organisationId, name: name.trim() })
        .select()
        .single()
    if (error) throw error
    return data
}

export async function renameSkill(id: string, name: string) {
    const { data, error } = await supabase
        .from("skills")
        .update({ name: name.trim() })
        .eq("id", id)
        .select()
        .single()
    if (error) throw error
    return data
}

/**
 * Archive a skill. Archived skills leave `getSkills()` but still resolve by id
 * for old vehicle_skills and package_skills rows.
 */
export async function archiveSkill(id: string) {
    const { data, error } = await supabase
        .from("skills")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()
    if (error) throw error
    return data
}

/** The skills one vehicle holds, for the vehicle form's Capabilities card. */
export async function getSkillsByVehicle(vehicleId: string): Promise<Skill[]> {
    const { data: links, error: linksError } = await supabase
        .from("vehicle_skills")
        .select("skill_id")
        .eq("vehicle_id", vehicleId)
    if (linksError) throw linksError

    const skillIds = (links ?? []).map((link) => link.skill_id)
    if (skillIds.length === 0) return []

    const { data: skills, error: skillsError } = await supabase
        .from("skills")
        .select("id, name")
        .in("id", skillIds)
    if (skillsError) throw skillsError

    return (skills ?? []).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Replace a vehicle's skills with `skillIds`. The vehicle form sends the full
 * selection, so this adds and removes only the difference.
 */
export async function setVehicleSkills(vehicleId: string, skillIds: string[]) {
    const { data: vehicle, error: vehicleError } = await supabase
        .from("vehicles")
        .select("organisation_id")
        .eq("id", vehicleId)
        .single()
    if (vehicleError) throw vehicleError

    const { data: existing, error: existingError } = await supabase
        .from("vehicle_skills")
        .select("skill_id")
        .eq("vehicle_id", vehicleId)
    if (existingError) throw existingError

    const existingIds = new Set((existing ?? []).map((link) => link.skill_id))
    const nextIds = new Set(skillIds)
    const toAdd = skillIds.filter((id) => !existingIds.has(id))
    const toRemove = [...existingIds].filter((id) => !nextIds.has(id))

    if (toAdd.length > 0) {
        const { error } = await supabase
            .from("vehicle_skills")
            .upsert(
                toAdd.map((skillId) => ({
                    vehicle_id: vehicleId,
                    skill_id: skillId,
                    organisation_id: vehicle.organisation_id,
                })),
                { onConflict: "vehicle_id,skill_id", ignoreDuplicates: true }
            )
        if (error) throw error
    }

    if (toRemove.length > 0) {
        const { error } = await supabase
            .from("vehicle_skills")
            .delete()
            .eq("vehicle_id", vehicleId)
            .in("skill_id", toRemove)
        if (error) throw error
    }
}

/** The skills one package requires, for the package detail page. */
export async function getSkillsByPackage(packageId: string): Promise<Skill[]> {
    const { data: links, error: linksError } = await supabase
        .from("package_skills")
        .select("skill_id")
        .eq("package_id", packageId)
    if (linksError) throw linksError

    const skillIds = (links ?? []).map((link) => link.skill_id)
    if (skillIds.length === 0) return []

    const { data: skills, error: skillsError } = await supabase
        .from("skills")
        .select("id, name")
        .in("id", skillIds)
    if (skillsError) throw skillsError

    return (skills ?? []).sort((a, b) => a.name.localeCompare(b.name))
}