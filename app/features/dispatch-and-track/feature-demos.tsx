"use client"

import { useEffect, useState } from "react"
import { subMinutes, addMinutes } from "date-fns"
import { RouteProgressionCard } from "@/app/orgs/[slug]/dashboard/driver-shifts/[id]/route-progression-card"
import LocationHistoryMap, {
    type HistoryPoint,
} from "@/app/orgs/[slug]/dashboard/fleet/team-members/[id]/location-history-map"
import { ProgressTracker } from "@/components/tool-ui/progress-tracker"
import type { PackageOptimisation, Location } from "@/app/models/package-optimisation"

const LOC: Location = {
    type: "Point",
    crs: { type: "name", properties: { name: "EPSG:4326" } },
    coordinates: [139.7754, 35.6812],
}

const DEPOT = {
    id: "wh-tokyo",
    warehouse_name: "Chiyoda Depot",
    warehouse_address: "2-1 Marunouchi, Chiyoda, Tokyo",
}

// A run that's partway done: two delivered, one on the doorstep, two still
// ahead. Built relative to `now` so the relative-time labels read naturally —
// hence it's only constructed on the client after mount (see DispatchStopsDemo).
function buildRunSteps(now: Date): PackageOptimisation[] {
    return [
        {
            id: 1, route_id: "demo", step_index: 0, type: "start", location: LOC,
            arrival: null, duration: null, setup: null, service: null, waiting_time: null, load: null, solution_id: "demo",
            package_assignment: { package_id: "wh-start", package: { warehouse: DEPOT, current_status: null } },
        },
        {
            id: 2, route_id: "demo", step_index: 1, type: "job", location: LOC,
            arrival: null, duration: null, setup: null, service: null, waiting_time: null, load: null, solution_id: "demo",
            package_assignment: {
                package_id: "pkg-1",
                package: {
                    tracking_number: "HK-04821", warehouse: DEPOT, current_status: "DELIVERED",
                    to_customer: { id: "c1", customer_name: "Aoki Books", customer_address: "3-7 Jimbocho", customer_suburb: "Chiyoda", customer_state: "Tokyo", customer_postcode: "101-0051" },
                    package_delivery_window: { scheduled_arrival: subMinutes(now, 40), actual_arrival: subMinutes(now, 44) },
                },
            },
        },
        {
            id: 3, route_id: "demo", step_index: 2, type: "job", location: LOC,
            arrival: null, duration: null, setup: null, service: null, waiting_time: null, load: null, solution_id: "demo",
            package_assignment: {
                package_id: "pkg-2",
                package: {
                    tracking_number: "HK-04822", warehouse: DEPOT, current_status: "DELIVERED",
                    to_customer: { id: "c2", customer_name: "Mori Café", customer_address: "1-14 Kanda", customer_suburb: "Chiyoda", customer_state: "Tokyo", customer_postcode: "101-0047" },
                    package_delivery_window: { scheduled_arrival: subMinutes(now, 18), actual_arrival: subMinutes(now, 21) },
                },
            },
        },
        {
            id: 4, route_id: "demo", step_index: 3, type: "job", location: LOC,
            arrival: null, duration: null, setup: null, service: null, waiting_time: null, load: null, solution_id: "demo",
            package_assignment: {
                package_id: "pkg-3",
                package: {
                    tracking_number: "HK-04823", warehouse: DEPOT, current_status: "IN_TRANSIT",
                    to_customer: { id: "c3", customer_name: "K. Tanaka", customer_address: "2-3 Hitotsubashi", customer_suburb: "Chiyoda", customer_state: "Tokyo", customer_postcode: "100-0003" },
                    package_delivery_window: { scheduled_arrival: addMinutes(now, 6), actual_arrival: null },
                },
            },
        },
        {
            id: 5, route_id: "demo", step_index: 4, type: "job", location: LOC,
            arrival: null, duration: null, setup: null, service: null, waiting_time: null, load: null, solution_id: "demo",
            package_assignment: {
                package_id: "pkg-4",
                package: {
                    tracking_number: "HK-04824", warehouse: DEPOT, current_status: "PENDING",
                    to_customer: { id: "c4", customer_name: "Sato Clinic", customer_address: "4-1 Otemachi", customer_suburb: "Chiyoda", customer_state: "Tokyo", customer_postcode: "100-0004" },
                    package_delivery_window: { scheduled_arrival: addMinutes(now, 34), actual_arrival: null },
                },
            },
        },
        {
            id: 6, route_id: "demo", step_index: 5, type: "job", location: LOC,
            arrival: null, duration: null, setup: null, service: null, waiting_time: null, load: null, solution_id: "demo",
            package_assignment: {
                package_id: "pkg-5",
                package: {
                    tracking_number: "HK-04825", warehouse: DEPOT, current_status: "PENDING",
                    to_customer: { id: "c5", customer_name: "Hana Florist", customer_address: "1-6 Yurakucho", customer_suburb: "Chiyoda", customer_state: "Tokyo", customer_postcode: "100-0006" },
                    package_delivery_window: { scheduled_arrival: addMinutes(now, 58), actual_arrival: null },
                },
            },
        },
        {
            id: 7, route_id: "demo", step_index: 6, type: "end", location: LOC,
            arrival: null, duration: null, setup: null, service: null, waiting_time: null, load: null, solution_id: "demo",
            package_assignment: { package_id: "wh-end", package: { warehouse: DEPOT, current_status: null } },
        },
    ]
}

export function DispatchStopsDemo() {
    // `new Date()` is non-deterministic, so keep it out of render/prerender:
    // build the steps once on the client after mount.
    const [steps, setSteps] = useState<PackageOptimisation[] | null>(null)
    useEffect(() => setSteps(buildRunSteps(new Date())), [])

    if (!steps) {
        return (
            <div
                className="min-h-[600px] rounded-xl border border-slate-200 bg-slate-50/60"
                aria-hidden
            />
        )
    }
    return <RouteProgressionCard routeSteps={steps} routeId="demo" disableInteractions />
}

// A driver's recent GPS breadcrumb through central Tokyo. Timestamps are fixed
// (the map only reads coordinates) so this demo needs no current-time call.
const TRAIL: HistoryPoint[] = [
    { lat: 35.6655, lng: 139.7705, created_at: "2026-06-03T00:00:00Z" },
    { lat: 35.6697, lng: 139.7698, created_at: "2026-06-03T00:04:00Z" },
    { lat: 35.6736, lng: 139.7726, created_at: "2026-06-03T00:09:00Z" },
    { lat: 35.6794, lng: 139.7757, created_at: "2026-06-03T00:14:00Z" },
    { lat: 35.6838, lng: 139.7783, created_at: "2026-06-03T00:18:00Z" },
    { lat: 35.6869, lng: 139.7767, created_at: "2026-06-03T00:22:00Z" },
]

export function TrackingTrailDemo() {
    return (
        <div className="h-[420px] overflow-hidden rounded-2xl border border-slate-200">
            <LocationHistoryMap points={TRAIL} currentIndex={TRAIL.length - 1} />
        </div>
    )
}

export function StatusTimelineDemo() {
    return (
        <ProgressTracker
            id="dispatch-status"
            className="max-w-none min-w-0"
            steps={[
                { id: "received", label: "Order received", status: "completed", description: "9:02 AM" },
                { id: "assigned", label: "Route built and sent to Kenji", status: "completed", description: "9:14 AM" },
                { id: "transit", label: "Out for delivery", status: "in-progress", description: "Two stops away — arriving around 9:46 AM" },
                { id: "delivered", label: "Delivered", status: "pending" },
            ]}
        />
    )
}
