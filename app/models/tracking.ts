import { PackageStatus } from "./package-status"

/** A lng/lat pair as returned by the tracking RPC / broadcast payloads. */
export interface TrackingLngLat {
    lng: number
    lat: number
}

export interface TrackingRecipient {
    name: string | null
    email: string | null
    address: string | null
    lng: number | null
    lat: number | null
}

export interface TrackingOrigin {
    name: string | null
    lng: number | null
    lat: number | null
}

export interface TrackingTimelineEntry {
    status: PackageStatus
    created_at: string
}

/** Driver identity — only populated while the package is IN_TRANSIT. Plate and
 *  label are omitted for bicycle couriers. */
export interface TrackingDriver {
    name: string | null
    vehicle_type: string | null
    vehicle_plate?: string | null
    vehicle_label?: string | null
}

export interface TrackingDriverLocation {
    lng: number
    lat: number
    updated_at: string
}

/** Shape returned by the `get_tracking_details` RPC (jsonb). */
export interface TrackingDetails {
    package_id: string
    tracking_number: string
    current_status: PackageStatus
    created_at: string
    delivery_notes: string | null
    recipient: TrackingRecipient
    origin: TrackingOrigin | null
    timeline: TrackingTimelineEntry[]
    driver: TrackingDriver | null
    driver_location: TrackingDriverLocation | null
}

/** Payload broadcast by the `trg_broadcast_driver_location` trigger (migration 0025). */
export interface TrackingLocationBroadcast {
    lng: number
    lat: number
    updated_at: string
}
