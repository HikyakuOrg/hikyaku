// service_areas.is_deleted is a soft delete filtered in the query layer, never
// in RLS (the same convention vehicles.is_deleted follows), so every read of the
// table has to exclude retired rows itself. Nothing in the database will do it.
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
        // A retired area is not editable. Matching zero rows here surfaces as
        // PGRST116 from .single(), which describeWriteError already words for a
        // row that has gone out of reach since the page loaded.
        .eq("is_deleted", false)
        .select()
        .single()
    if (error) throw error
    return data
}

/**
 * Retire a service area. Soft delete, the same shape deleteVehicle() uses: the
 * row stays so anything already pointing at it keeps resolving, and every read
 * of this table filters `is_deleted` itself.
 *
 * Retiring an area does not re-route work that already exists. Coverage is
 * decided once, when a package is created, not continuously, so packages and
 * shifts already booked are untouched by this.
 *
 * `.select().single()` on purpose: an update the RLS policy refuses is not an
 * error in Postgres, it just matches zero rows, so without this it would return
 * quietly and look like a success. With it the refusal arrives as PGRST116,
 * which describeWriteError() turns into a sentence.
 */
export async function deleteServiceArea(id: string) {
    const { data, error } = await supabase
        .from("service_areas")
        .update({ is_deleted: true })
        .eq("id", id)
        .eq("is_deleted", false)
        .select()
        .single()
    if (error) throw error
    return data
}

/**
 * A driver, shaped for the two tables on the service area detail page: the ones
 * already covering the area, and the ones that could be attached to it.
 *
 * Extends the driver shape the rest of the app uses rather than inventing a
 * second one, because both tables render through `components/driver/driver-table`.
 *
 * `warehouse_name` is carried alongside because dispatch only ever offers a
 * driver work out of their own warehouse, so which depot a driver sits at is the
 * difference between coverage that does something and coverage that quietly does
 * nothing. See the note in `service-area-driver-sheet.tsx` for why the picker
 * shows the column instead of filtering on it.
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
 * Driver ids already attached to an area.
 *
 * `driver_service_area` has no `is_deleted`: retiring a territory keeps its
 * staffing so it can be un-retired, which means the soft delete lives entirely
 * on `service_areas`. Nothing here has to filter it, because every caller has
 * already resolved a live area to get its id.
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
 * Warehouse id and name for a set of drivers, as two plain lookups rather than a
 * PostgREST embed.
 *
 * Reading `warehouse` needs `warehouse.view`, which is a different permission
 * from the `drivers.view` that got us the driver rows, so a caller can
 * legitimately be allowed one and not the other. Keeping them separate means
 * that case degrades to an empty warehouse column instead of failing the whole
 * read.
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

        // Not fatal. A caller without warehouse.view sees the drivers and an
        // empty warehouse column, which is more useful than an error panel.
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
 * Merge driver ids with the profile and warehouse lookups into display rows.
 *
 * A driver whose profile does not come back keeps its row rather than
 * disappearing: dropping it would make the attachable page counts disagree with
 * what is on screen, and on the attached list it would hide a driver who really
 * is covering the area. It happens when the `auth.users` row behind a driver is
 * gone, which the RPC's join filters out.
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
 * The drivers currently covering one service area.
 *
 * Three reads rather than one join, because the pieces live in three places that
 * PostgREST cannot join across: the pairings are in `driver_service_area`, the
 * warehouse is on `drivers`, and display name, phone and avatar are in
 * `auth.users.raw_user_meta_data`, reachable only through the SECURITY DEFINER
 * `get_drivers_by_ids` RPC the rest of the app already uses for exactly this.
 * The row counts here are a depot's worth of drivers, not a page of packages, so
 * the extra round trips are cheaper than a new database function would be.
 *
 * Sorted by name, since the order drivers happened to be attached in is not
 * something a dispatcher is looking for.
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
 * One page of drivers that could still be attached to an area.
 *
 * The exclusion is applied in the database, not after paging, so page 2 is the
 * real second page of attachable drivers rather than the second page of all
 * drivers with some rows missing. None of the existing driver RPCs
 * (`get_drivers_paginated`, `list_unassigned_drivers`, `list_drivers_by_warehouse`)
 * takes a service-area argument, and this table is owned by the web app rather
 * than by the API, so this pages `drivers` directly and picks the names up
 * afterwards.
 *
 * Ordered by id descending to match `get_drivers_paginated`, so paging through
 * this picker behaves like paging through the other driver pickers. Sorting by
 * name is not available here: the name is not a column on this table.
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
        // PostgREST wants a parenthesised list here rather than an array. The
        // ids are uuids read back out of the database a moment ago, so there is
        // nothing in them to quote or escape.
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
 * One page of the organisation's drivers, for the pickers that pair a driver
 * with a vehicle or a warehouse. `unassignedOnly` keeps the drivers that have no
 * warehouse yet.
 *
 * This pages `drivers` directly instead of calling `get_drivers_paginated` or
 * `list_unassigned_drivers`, because neither RPC takes an organisation: they
 * return every driver in every organisation the caller belongs to, so a member
 * of two organisations was offered the other organisation's drivers. The order
 * matches those RPCs (id descending), and the names come from
 * `get_drivers_by_ids` afterwards, as they do for the service area picker.
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
 * Attach a whole selection of drivers to one service area.
 *
 * ONE INSERT FOR THE WHOLE SELECTION. Forty drivers is forty rows in one
 * request, never forty requests, which is also what makes the whole selection
 * land or not land together.
 *
 * Already-attached drivers are a no-op rather than an error, resolved by
 * `ON CONFLICT (driver_id, service_area_id) DO NOTHING` (the table's primary
 * key) rather than by filtering them out here first. The filter version is a
 * read followed by a write, so two dispatchers staffing the same area at the
 * same time can both read "not attached yet" and the second insert then fails
 * on the primary key with nothing having gone wrong. `ON CONFLICT` is decided
 * inside the one statement, where that race has nowhere to happen. The picker
 * hides attached drivers anyway, so a duplicate reaching here means a sheet that
 * has been open a while, which is exactly the case that should stay quiet.
 *
 * `organisation_id` is NOT NULL with no default, so the insert has to carry it,
 * and it is read off the area rather than off the session: composite foreign
 * keys pin it to both parents, so a value disagreeing with either the area or
 * the driver cannot be inserted by any role. Reading it here just means sending
 * the value the database is going to insist on.
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

    // Unlike a refused UPDATE, a refused INSERT does raise: an RLS WITH CHECK
    // failure comes back as 42501, which describeWriteError() words. So an empty
    // `data` here means every row was already attached, not that the write was
    // turned away.
    if (error) throw error
    return data ?? []
}

/**
 * Detach one driver from one service area.
 *
 * A plain delete of the single link row. It does not touch work that already
 * exists: coverage is decided once, when a package is created, so stops already
 * on a driver's route stay there.
 *
 * `.select().single()` for the same reason `deleteServiceArea` uses it. A delete
 * the RLS policy refuses is not an error in Postgres, it simply matches zero
 * rows, so without this it would return quietly and look like a success. With
 * it the refusal arrives as PGRST116, which describeWriteError() turns into a
 * sentence covering both readings (the row is gone, or the permission is).
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

/** One area a driver covers, for the "where does this driver work" card on their detail page (HIK-16). */
export type DriverServiceArea = {
    id: string
    name: string
}

/**
 * The areas one driver covers, for the driver detail page's Service Areas
 * card. The reverse direction of `getDriversByServiceArea`: same link table,
 * read from the driver side instead of the area side.
 *
 * Two reads rather than one embedded select: `driver_service_area`'s foreign
 * key into `service_areas` is composite (`service_area_id, organisation_id`,
 * see `driver_service_area_area_org_fkey`), which Supabase's generated types
 * treat as a to-many relationship regardless of actual cardinality. Reading it
 * as two plain queries, the same shape `getServiceAreaDriverIds` already uses
 * on the other side of this table, sidesteps that rather than fighting it.
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
 * Live areas this driver does not already cover, newest first, optionally
 * narrowed by name. Powers the search box in the card's add-area combobox;
 * `search` is matched with `ilike` so it works the moment a dispatcher starts
 * typing rather than only on a prefix.
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
        // Same parenthesised-list requirement `getAttachableDriversForServiceArea` notes: PostgREST
        // wants `(id1,id2)` here, not an array, and these ids came back from the database a moment
        // ago so there is nothing in them that needs escaping.
        query = query.not("id", "in", `(${attachedIds.join(",")})`)
    }

    const { data, error } = await query
    if (error) throw error
    return data ?? []
}

/**
 * Attach a driver to a whole selection of areas in one bulk write, the same
 * shape `attachDriversToServiceArea` uses in the other direction: one insert
 * for every area picked, `ON CONFLICT DO NOTHING` on the table's own primary
 * key so an area the picker already excluded cannot fail the request if it was
 * attached moments ago by someone else.
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

/**
 * Detach one area from one driver. `.select().single()` for the same reason
 * `detachDriverFromServiceArea` uses it: a delete RLS refuses matches zero
 * rows rather than raising, and without this it would look identical to a
 * success.
 */
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
    // Not fatal, same reasoning getDriverWarehouses() documents: a caller
    // without warehouse.view still gets the rest of the driver page.
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

// Null, not an error, when the package has no assignment row yet: every
// unassigned or queued package is in that state, and .single() would log a
// PGRST116 406 for each of them.
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
 * Public live-tracking subscription for the customer tracking page.
 *
 * Listens on the private Realtime channel `tracking:<trackingNumber>`. The DB
 * trigger (migration 0025) only broadcasts to this topic while the package is
 * IN_TRANSIT, and the realtime.messages RLS policy only lets `anon` join it
 * while IN_TRANSIT — so this never leaks location for other states, and the
 * payload carries lng/lat/updated_at only (never the driver id).
 */
export function subscribeToTrackingLocation(
    trackingNumber: string,
    onLocation: (location: TrackingLocationBroadcast) => void
): RealtimeChannel {
    // Realtime Authorization needs an auth token; for the anon page this is the
    // publishable/anon key the browser client already carries.
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

    // Apply filter only if array has values
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
 * Hard delete a vehicle the add form has only just inserted, when a follow-up
 * write for it (its skills, its images) fails. Unlike deleteVehicle() this
 * frees the plate, so the form can be resubmitted as is; its vehicle_skills
 * rows go with it through the FK cascade. RLS silently skips the row for
 * anyone without vehicles.delete, so the result says whether it really went.
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

// driving_limit_profile.is_deleted is a soft delete filtered in the query layer,
// never in RLS, exactly like service_areas.is_deleted. Every read below excludes
// retired profiles itself, and hikyaku-api's resolver skips them the same way, so
// a driver still pointing at one is planned as if it were not there.

const DRIVING_LIMIT_PROFILE_COLUMNS =
    "id, name, max_working_seconds, max_driving_seconds, max_distance_m, max_stops"

export type DrivingLimitProfileInput = DrivingLimitValues & { name: string }

/**
 * Every live profile in one organisation, by name.
 *
 * Filtered on the organisation explicitly rather than left to RLS: RLS lets a
 * member of two organisations read both organisations' profiles, and offering
 * the other one's in a picker only earns a foreign key refusal on save.
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

/**
 * Save a new profile. The limit values arrive already in seconds and metres:
 * the form is the one place hours and kilometres are converted, and nothing
 * between it and the table converts again.
 */
export async function createDrivingLimitProfile(organisationId: string, input: DrivingLimitProfileInput) {
    const { data, error } = await supabase
        .from("driving_limit_profile")
        .insert({ ...input, organisation_id: organisationId })
        .select(DRIVING_LIMIT_PROFILE_COLUMNS)
        .single()
    if (error) throw error
    return data
}

/**
 * `.eq("is_deleted", false).select().single()` for the reason `updateServiceArea`
 * gives: a retired row, or an update RLS refuses, matches zero rows instead of
 * raising, and PGRST116 is what lets describeWriteError() say so.
 */
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
 * Retire a profile. A soft delete, so the drivers and the organisation default
 * pointing at it are left alone rather than rewritten: the resolver already
 * treats a retired profile as absent, so those drivers fall through to the
 * organisation default (or to no limit) without a second write that could fail
 * halfway.
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
 * Which profile a team member's driver row in this organisation points at.
 * `isDriver` is false when there is no such row, which is a team member the
 * limits do not apply to rather than a driver with no profile.
 *
 * Scoped to the organisation on purpose. RLS lets a user read their own driver
 * row whichever organisation it belongs to, so an admin who drives for another
 * organisation would otherwise look like a driver here, and pointing that row at
 * this organisation's profile is refused by the composite foreign key.
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

/**
 * Point a driver at a profile, or at none. The composite foreign key pins the
 * profile to the driver's own organisation, so a profile from another tenant is
 * refused by the database whatever this is sent.
 */
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

/** The organisation's id and its default profile pointer, which may name a retired profile. */
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
 * Save every dispatch setting at once. An upsert because the row only exists
 * once somebody has saved: until then the organisation runs on the defaults.
 * Needs `organisation.edit`; RLS refuses anyone else.
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

// Package creation lives behind POST /api/v1/packages (lib/actions/packages.ts).
// insertPackage / insertPackageDimension / insertPackageDeliveryWindow used to
// write those three tables from the browser, one round trip each and no
// transaction — a half-created package survived any failure after the first
// insert. The API writes all of them, plus the PENDING timeline row, in one
// transaction and then assigns the package to a shift.

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


/**
 * One shift as the calendars render it.
 *
 * A shift is a `vrp_optimization` row. Until AddShiftLifecycleColumns it had no
 * driver, vehicle, warehouse, date or status, so the calendar had to reconstruct
 * shifts from two directions at once: package delivery windows (which missed
 * every empty shift) plus an unbounded scan of manual optimisations filtered by
 * a JSON blob in JavaScript. Both are replaced by one indexed query on
 * (shift_date, status).
 */
export interface CalendarShift {
    /** vrp_optimization.id. */
    id: string;
    /**
     * vrp_route.id — what the shift detail page is keyed on. Null when the shift
     * has no route row yet, in which case there is nothing to open.
     */
    route_id: string | null;
    driver_id: string | null;
    /** Warehouse-local service day, YYYY-MM-DD. */
    shift_date: string;
    scheduled_start: string | null;
    status: VrpOptimizationStatus;
    /** Bumped on every plan rewrite — the calendar re-fetches when it moves. */
    revision: number;
    /** Packages on the shift. Zero is a real, displayable state. */
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

/** Shifts that are not cancelled, i.e. everything the calendar should draw. */
const CALENDAR_SHIFT_STATUSES: VrpOptimizationStatus[] = [
    "planned",
    "dispatched",
    "completed",
]

/**
 * Every shift whose service day falls in [startDate, endDate]. Dates may be
 * passed as ISO instants; only the calendar day is used, because `shift_date` is
 * warehouse-local and has no time component.
 *
 * Empty shifts appear natively — they are rows here like any other, not a
 * separate lookup that has to be deduped against this one.
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
        // Only the depot steps carry what the driving limit marker needs (elapsed
        // time and total travel), so the job steps stay in the database.
        .in('vrp_solution.vrp_route.vrp_route_step.type', ['start', 'end'])
        .order('shift_date', { ascending: true })

    if (driverId) query = query.eq('driver_id', driverId)

    const { data, error } = await query
    if (error) throw error

    return (data ?? []).flatMap((row) => {
        // shift_date is nullable in the schema (it is backfilled, not enforced),
        // and a shift with no service day cannot be placed on a calendar.
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
 * When a shift occupies the calendar grid. `scheduled_start` is the set-off time
 * when one has been chosen; otherwise the shift is drawn from 08:00 on its
 * service day, in the viewer's timezone, so it lands in the working part of the
 * grid rather than at midnight.
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

// ── Skills catalog (HIK-90) ──────────────────────────────────────────────────
//
// Org-defined capability labels ("Fragile Handling", "Requires Liftgate"),
// assigned to vehicles and required by packages, enforced by VROOM as a hard
// constraint. hikyaku-api exposes create/list/archive for headless
// integrations (HIK-93), but the dashboard writes straight to Supabase here —
// the same "this form already writes straight to Tables<>" precedent
// vehicle-form.tsx follows — because RLS on `skills` already grants
// authenticated org members with `vehicles.update` insert/update/delete, and
// that is also the only way to expose renaming (hikyaku-api has no rename
// endpoint).

/** A skill in the organisation's catalog, shaped for pickers and chips. */
export type Skill = {
    id: string
    name: string
}

/** Active (non-archived) skills, alphabetical — what a picker offers. */
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

/** Every skill, including archived, newest first — for the Manage Skills dialog. */
export async function getSkillCatalog(organisationId: string): Promise<Tables<'skills'>[]> {
    const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("organisation_id", organisationId)
        .order("created_at", { ascending: false })
    if (error) throw error
    return data ?? []
}

/** Skills by id, for resolving a package's or vehicle's `skillIds` into names for display. */
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
 * Retire a skill. Idempotent-in-effect (setting archived_at again just
 * updates the same row), mirroring SkillsService.archive on the API side.
 * Archived skills drop out of `getSkills()` but stay resolvable by id for
 * historical vehicle_skills/package_skills rows.
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
 * Replace a vehicle's whole skill set in one call, diffing against what it
 * already holds. The vehicle form submits the full selection at once (a
 * chips combobox bound to one form field), unlike the driver/service-area
 * card's incremental attach-then-separately-detach flow, so a diff-and-write
 * fits it better than exposing separate attach/detach functions here.
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

/**
 * The skills one package requires, for the package detail page. `skillIds`
 * are sent to hikyaku-api at creation time (CreatePackageDto), but the
 * detail page reads packages through Supabase directly, so this reads the
 * join table the same way `getSkillsByVehicle` reads its own.
 */
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