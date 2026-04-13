import { PackageStatus, STATUS_OPTIONS } from "@/app/models/package-status";
import { CreateDriverDto, ListDriverDto, ListDriverResponseDto } from "../api"
import { createClient } from "./client"
import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "./supabase"

const supabase = createClient();

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


export async function addDriver(createDriverDto: CreateDriverDto, supabaseClient?: SupabaseClient<Database>) {
    const client = supabaseClient ?? supabase;
    const { data, error } = await client.rpc('create_driver', {
        p_email: createDriverDto.email,
        p_display_name: createDriverDto.displayName,
        p_phone: createDriverDto.phoneNumber,
        p_driver_license: createDriverDto.driverLicense || undefined,
        p_license_expiry: createDriverDto.licenseExpiry || undefined
    });


    if (error) throw error;

    let avatarUrl: string | undefined;
    const listDriver = data as unknown as ListDriverDto
    if (listDriver != null && createDriverDto.file) {
        const { data: uploadData } = await client.storage
            .from('avatars')
            .upload(`drivers/${listDriver.id}/${createDriverDto.file.name}`, createDriverDto.file, { upsert: true });

        avatarUrl = client.storage
            .from('avatars')
            .getPublicUrl(`drivers/${listDriver.id}/${createDriverDto.file.name}`).data.publicUrl;
    }

    const driver = { ...listDriver, avatarUrl };
    return driver;
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