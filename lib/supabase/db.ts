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
import { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createLazyClient } from "./client";
import { Database, Tables, TablesInsert, VrpOptimizationStatus } from "./supabase";
import { TrackingLocationBroadcast } from "@/app/models/tracking";
import { ListDriverDto } from "../api";
import { getDriversByIds } from "./supabase-rpc";


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

export async function getVehiclesByType(selectedTypes: string[], page: number, pageSize: number) {
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

    const { data, count } = await supabase.from("warehouse").select("*", { count: 'exact' }).range(from, to)
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

export async function getVehiclesNotAssigned(page: number, pageSize: number) {
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

export async function getVehicles() {
    const { data, error } = await supabase
        .from("vehicles")
        .select("id, vehicle_plate, vehicle_make, vehicle_model, vehicle_year")
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



export async function searchWarehouse(search: string) {
    const { data, error } = await supabase.from("warehouse").select("*")
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

export async function searchServiceArea(search: string) {
    const { data, error } = await supabase
        .from("service_areas")
        .select("id, name")
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
                vrp_route:vrp_route!vrp_route_solution_id_fkey ( id, duration )
            ),
            packages:packages!packages_optimisation_id_fkey ( id )
        `)
        .gte('shift_date', startDate.slice(0, 10))
        .lte('shift_date', endDate.slice(0, 10))
        .in('status', CALENDAR_SHIFT_STATUSES)
        .order('shift_date', { ascending: true })

    if (driverId) query = query.eq('driver_id', driverId)

    const { data, error } = await query
    if (error) throw error

    return (data ?? []).flatMap((row) => {
        // shift_date is nullable in the schema (it is backfilled, not enforced),
        // and a shift with no service day cannot be placed on a calendar.
        if (!row.shift_date) return []

        const route = row.vrp_solution.flatMap((solution) => solution.vrp_route)[0] ?? null

        return [{
            id: row.id,
            route_id: route?.id ?? null,
            driver_id: row.driver_id,
            shift_date: row.shift_date,
            scheduled_start: row.scheduled_start,
            status: row.status,
            revision: row.revision,
            stop_count: row.packages.length,
            duration_seconds: route?.duration ?? null,
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