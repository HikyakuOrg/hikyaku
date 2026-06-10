import { PackageStatus, STATUS_OPTIONS } from "@/app/models/package-status";
import { CreateDriverDto, ListDriverDto, ListDriverResponseDto } from "../api"
import { createLazyClient } from "./client"
import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "./supabase"

const supabase = createLazyClient();

export async function getDrivers(page: number, pageSize: number, supabaseClient?: SupabaseClient<Database>) {
    const client = supabaseClient ?? supabase;
    const { data, error } = await client.rpc("get_drivers_paginated", {
        p_page: page,
        p_limit: pageSize,
    });

    if (error) throw error;
    if (!data) throw new Error("No data returned from RPC");
    return data;
}


export async function getDriversByIds(driverIds: string[], supabaseClient?: SupabaseClient<Database>) {
    const client = supabaseClient ?? supabase;
    const { data, error } = await client.rpc("get_drivers_by_ids", {
        p_driver_ids: driverIds
    });

    if (error) throw error;
    if (!data) throw new Error("No data returned from RPC");

    return data as unknown as ListDriverDto[];
}


export async function updateDriver(
    driverId: string,
    updates: {
        driverLicense?: string;
        licenseExpiry?: string;
        vehicleTypeId?: string;
        email?: string;
        phone?: string;
        displayName?: string;
        avatarUrl?: string;
    },
    supabaseClient?: SupabaseClient<Database>
) {
    const client = supabaseClient ?? supabase;
    const { data, error } = await client.rpc('update_driver_profile', {
        p_driver_id: driverId,
        p_driver_license: updates.driverLicense,
        p_license_expiry: updates.licenseExpiry,
        p_vehicle_type: updates.vehicleTypeId,
        p_email: updates.email,
        p_phone: updates.phone,
        p_display_name: updates.displayName,
        p_avatar_url: updates.avatarUrl,
    });

    if (error) throw error;

    return data as unknown as ListDriverDto;
}

export async function getPackages(
    pageSize: number,
    page: number,
    statuses?: string[],
    supabaseClient?: SupabaseClient<Database>
) {
    const client = supabaseClient ?? supabase;
    const { data, error } = await client.rpc(
        "get_packages_with_latest_status",
        {
            p_limit: pageSize,
            p_offset: (page - 1) * pageSize,
            p_statuses: statuses?.length ? statuses : STATUS_OPTIONS,
        }
    )

    if (error) {
        console.log(error)
        throw error
    }
    return data
}

export async function getPackagesCount(statuses?: string[], supabaseClient?: SupabaseClient<Database>) {
    const client = supabaseClient ?? supabase;
    const { data, error } = await client.rpc(
        "get_packages_count",
        {
            p_statuses: statuses?.length ? statuses : STATUS_OPTIONS,
        }
    )

    if (error) throw error
    return data ?? 0
}

type CustomerPackageDirection = "shipped" | "received"

type CustomerPackageStatusRow = Pick<
    Database["public"]["Views"]["packages_with_latest_status"]["Row"],
    "id" | "created_at" | "current_status"
>

type CustomerPackageDetailsRow = {
    id: string
    tracking_number: string
    package_assignment:
    | { driver_id: string }
    | { driver_id: string }[]
    | null
}

export type CustomerPackageListItem = {
    id: string
    tracking_number: string
    from_customer_address: string
    to_customer_address: string
    latest_package_status_text: string
    driver_id: string
    driver_name: string
}

function getCustomerPackageColumn(direction: CustomerPackageDirection) {
    return direction === "shipped" ? "from_customer" : "to_customer"
}

function getAssignedDriverId(
    relation:
        | { driver_id: string }
        | { driver_id: string }[]
        | null
) {
    if (!relation) {
        return ""
    }

    return Array.isArray(relation)
        ? relation[0]?.driver_id ?? ""
        : relation.driver_id ?? ""
}

async function getCustomerPackageStatuses(
    customerId: string,
    direction: CustomerPackageDirection,
    pageSize: number,
    page: number,
    statuses?: string[],
    supabaseClient?: SupabaseClient<Database>
) {
    const client = supabaseClient ?? supabase
    const statusFilter = statuses?.length ? statuses : STATUS_OPTIONS
    const customerColumn = getCustomerPackageColumn(direction)

    const { data, error } = await client
        .from("packages_with_latest_status")
        .select("id, created_at, current_status")
        .eq(customerColumn, customerId)
        .in("current_status", statusFilter)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

    if (error) {
        throw error
    }

    return (data ?? []).filter((row): row is Required<CustomerPackageStatusRow> => Boolean(row.id))
}

export async function getCustomerPackages(
    customerId: string,
    direction: CustomerPackageDirection,
    pageSize: number,
    page: number,
    statuses?: string[],
    supabaseClient?: SupabaseClient<Database>
) {
    const client = supabaseClient ?? supabase
    const packageStatuses = await getCustomerPackageStatuses(
        customerId,
        direction,
        pageSize,
        page,
        statuses,
        client
    )

    const packageIds = packageStatuses.map((item) => item.id).filter((id): id is string => id != null)

    if (!packageIds.length) {
        return []
    }

    const { data, error } = await client
        .from("packages")
        .select(`
            id,
            tracking_number,
            package_assignment(driver_id)
        `)
        .in("id", packageIds)

    if (error) {
        throw error
    }

    const packageRows = (data ?? []) as CustomerPackageDetailsRow[]
    const driverIds: string[] = Array.from(
        new Set(
            packageRows
                .map((item) => getAssignedDriverId(item.package_assignment))
                .filter((id): id is string => Boolean(id))
        )
    )

    const drivers = driverIds.length
        ? await getDriversByIds(driverIds, client)
        : []

    const driversById = new Map(drivers.map((driver) => [driver.id, driver.display_name]))
    const statusByPackageId = new Map(
        packageStatuses.map((item) => [item.id, item.current_status ?? "Pending"])
    )
    const sortOrder = new Map(packageIds.map((id, index) => [id, index]))

    return packageRows
        .map((item): CustomerPackageListItem => {
            const driverId = getAssignedDriverId(item.package_assignment)

            return {
                id: item.id,
                tracking_number: item.tracking_number,
                from_customer_address: "",
                to_customer_address: "",
                latest_package_status_text: statusByPackageId.get(item.id) ?? "Pending",
                driver_id: driverId,
                driver_name: driversById.get(driverId) ?? "",
            }
        })
        .sort((left, right) => {
            return (sortOrder.get(left.id) ?? 0) - (sortOrder.get(right.id) ?? 0)
        })
}

export async function getCustomerPackagesCount(
    customerId: string,
    direction: CustomerPackageDirection,
    statuses?: string[],
    supabaseClient?: SupabaseClient<Database>
) {
    const client = supabaseClient ?? supabase
    const statusFilter = statuses?.length ? statuses : STATUS_OPTIONS
    const customerColumn = getCustomerPackageColumn(direction)

    const { count, error } = await client
        .from("packages_with_latest_status")
        .select("id", { count: "exact", head: true })
        .eq(customerColumn, customerId)
        .in("current_status", statusFilter)

    if (error) {
        throw error
    }

    return count ?? 0
}



export async function getDriverLocationHistory(driverId: string, fromDateTime: string, toDateTime: string, supabaseClient?: SupabaseClient<Database>) {
    const client = supabaseClient ?? supabase;
    const { data, error } = await client.rpc("get_driver_location_history", {
        p_driver_id: driverId,
        from_ts: fromDateTime,
        to_ts: toDateTime,
    });
    if (error) throw error;

    return data;
}

export async function getUnassignedDrivers(page: number, pageSize: number, supabaseClient?: SupabaseClient<Database>) {
    const client = supabaseClient ?? supabase;
    const { data, error } = await client.rpc("list_unassigned_drivers", {
        p_limit: pageSize,
        p_page: page,
    });
    if (error) throw error;
    return data;
}


export async function getDriversByWarehouse(warehouseId: string, page: number, pageSize: number, supabaseClient?: SupabaseClient<Database>) {
    const client = supabaseClient ?? supabase;
    const { data, error } = await client.rpc("list_drivers_by_warehouse", {
        p_warehouse_id: warehouseId,
        p_limit: pageSize,
        p_page: page,
    });
    if (error) throw error;
    return data;
}

export async function insertPackageTimeline(packageId: string, packageStatus: PackageStatus, supabaseClient?: SupabaseClient<Database>) {
    const client = supabaseClient ?? supabase;
    const { error } = await client.rpc("insert_package_timeline", {
        p_package_id: packageId,
        p_status_enum: packageStatus
    })

    if (error) throw error
}