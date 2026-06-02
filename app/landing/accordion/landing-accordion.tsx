"use client"

import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FuelCardsMock } from "./fuel-cards-mock";
import { RouteProgressionCard } from "@/app/orgs/[slug]/dashboard/driver-shifts/[id]/route-progression-card";
import LocationHistoryMap, { HistoryPoint } from "@/app/orgs/[slug]/dashboard/fleet/team-members/[id]/location-history-map";
import type { PackageOptimisation, Location } from "@/app/models/package-optimisation";
import { subMinutes, addMinutes } from 'date-fns'

// ---------------------------------------------------------------------------
// Demo data for RouteProgressionCard on the landing page
// ---------------------------------------------------------------------------

const MOCK_LOC: Location = {
    type: "Point",
    crs: { type: "name", properties: { name: "EPSG:4326" } },
    coordinates: [153.0251, -27.4698],
}

const WAREHOUSE = {
    id: "wh-demo",
    warehouse_name: "Brisbane Depot",
    warehouse_address: "1 Logistics Way, Brisbane QLD 4000",
}

const currentDate = new Date()

const DEMO_ROUTE_STEPS: PackageOptimisation[] = [
    {
        id: 1,
        route_id: "demo",
        step_index: 0,
        type: "start",
        location: MOCK_LOC,
        arrival: null, duration: null, setup: null, service: null, waiting_time: null, load: null,
        solution_id: "demo",
        package_assignment: {
            package_id: "wh-start",
            package: { warehouse: WAREHOUSE, current_status: null },
        },
    },
    {
        id: 2,
        route_id: "demo",
        step_index: 1,
        type: "job",
        location: MOCK_LOC,
        arrival: null, duration: null, setup: null, service: null, waiting_time: null, load: null,
        solution_id: "demo",
        package_assignment: {
            package_id: "pkg-1",
            package: {
                tracking_number: "HK-00001",
                warehouse: WAREHOUSE,
                current_status: "DELIVERED",
                to_customer: {
                    id: "c1",
                    customer_name: "Alice Thompson",
                    customer_address: "42 George St",
                    customer_suburb: "Brisbane",
                    customer_state: "QLD",
                    customer_postcode: "4000",
                },
                package_delivery_window: {
                    scheduled_arrival: currentDate,
                    actual_arrival: subMinutes(currentDate, 30),
                },
            },
        },
    },
    {
        id: 3,
        route_id: "demo",
        step_index: 2,
        type: "job",
        location: MOCK_LOC,
        arrival: null, duration: null, setup: null, service: null, waiting_time: null, load: null,
        solution_id: "demo",
        package_assignment: {
            package_id: "pkg-2",
            package: {
                tracking_number: "HK-00002",
                warehouse: WAREHOUSE,
                current_status: "IN_TRANSIT",
                to_customer: {
                    id: "c2",
                    customer_name: "Bob Martinez",
                    customer_address: "87 Queen St",
                    customer_suburb: "Brisbane",
                    customer_state: "QLD",
                    customer_postcode: "4000",
                },
                package_delivery_window: {
                    scheduled_arrival: addMinutes(currentDate, 21),
                    actual_arrival: null,
                },
            },
        },
    },
    {
        id: 4,
        route_id: "demo",
        step_index: 3,
        type: "job",
        location: MOCK_LOC,
        arrival: null, duration: null, setup: null, service: null, waiting_time: null, load: null,
        solution_id: "demo",
        package_assignment: {
            package_id: "pkg-3",
            package: {
                tracking_number: "HK-00003",
                warehouse: WAREHOUSE,
                current_status: "PENDING",
                to_customer: {
                    id: "c3",
                    customer_name: "Carol White",
                    customer_address: "15 Ann St",
                    customer_suburb: "Brisbane",
                    customer_state: "QLD",
                    customer_postcode: "4000",
                },
                package_delivery_window: {
                    scheduled_arrival: addMinutes(currentDate, 68),
                    actual_arrival: null,
                },
            },
        },
    },
    {
        id: 5,
        route_id: "demo",
        step_index: 4,
        type: "job",
        location: MOCK_LOC,
        arrival: null, duration: null, setup: null, service: null, waiting_time: null, load: null,
        solution_id: "demo",
        package_assignment: {
            package_id: "pkg-4",
            package: {
                tracking_number: "HK-00004",
                warehouse: WAREHOUSE,
                current_status: "PENDING",
                to_customer: {
                    id: "c4",
                    customer_name: "David Kim",
                    customer_address: "220 Roma St",
                    customer_suburb: "Brisbane",
                    customer_state: "QLD",
                    customer_postcode: "4000",
                },
                package_delivery_window: {
                    scheduled_arrival: addMinutes(currentDate, 105),
                    actual_arrival: null,
                },
            },
        },
    },
    {
        id: 6,
        route_id: "demo",
        step_index: 5,
        type: "end",
        location: MOCK_LOC,
        arrival: null, duration: null, setup: null, service: null, waiting_time: null, load: null,
        solution_id: "demo",
        package_assignment: {
            package_id: "wh-end",
            package: { warehouse: WAREHOUSE, current_status: null },
        },
    },
]

// ---------------------------------------------------------------------------
// Demo driver location history (Brisbane CBD loop)
// ---------------------------------------------------------------------------
const DEMO_HISTORY_POINTS: HistoryPoint[] = [
    { lat: -27.475196395947567, lng: 153.0265006969785, created_at: subMinutes(currentDate, 12).toISOString() },
    { lat: -27.47228936031737, lng: 153.023594258409, created_at: subMinutes(currentDate, 12).toISOString() },
    { lat: -27.47171722882076, lng: 153.02282587122954, created_at: subMinutes(currentDate, 12).toISOString() },
    { lat: -27.471556188595688, lng: 153.02282587122954, created_at: subMinutes(currentDate, 10).toISOString() },
    { lat: -27.4698, lng: 153.0251, created_at: currentDate.toISOString() },
]
// ---------------------------------------------------------------------------
// Accordion items
// ---------------------------------------------------------------------------

const ITEMS: { value: string; trigger: string; content: string; panel: React.ReactNode }[] = [
    {
        value: "item-1",
        trigger: "Real-time route progression",
        content:
            "Track every stop on an active shift — see what's been delivered, what's in transit, and what's still pending. Managers can reorder or remove upcoming stops without interrupting the driver.",
        panel: (
            <RouteProgressionCard
                routeSteps={DEMO_ROUTE_STEPS}
                routeId="demo"
                disableInteractions
            />
        ),
    },
    {
        value: "item-2",
        trigger: "Driver Tracker",
        content:
            "View the real-time location of every driver in the field, along with their recent location history.",
        panel: (
            <div className="rounded-2xl overflow-hidden border h-[420px]">
                <LocationHistoryMap
                    points={DEMO_HISTORY_POINTS}
                    currentIndex={DEMO_HISTORY_POINTS.length - 1}
                />
            </div>
        ),
    },
    {
        value: "item-3",
        trigger: "Fuel card management",
        content:
            "Issue virtual fuel cards to drivers, set per-transaction or daily spend limits, and track every fuel purchase in real time — all from the dashboard.",
        panel: <FuelCardsMock />,
    }
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LandingAccordion() {
    const [activeItem, setActiveItem] = useState<string>("item-1")

    const activePanel = ITEMS.find((i) => i.value === activeItem)?.panel

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
            <div className="flex-1">
                <Accordion
                    multiple={false}
                    value={[activeItem]}
                    onValueChange={(val: string[]) => {
                        if (val.length > 0) setActiveItem(val[0])
                    }}
                    className="w-full"
                >
                    {ITEMS.map((item) => (
                        <AccordionItem key={item.value} value={item.value}>
                            <AccordionTrigger className="text-base font-semibold">
                                {item.trigger}
                            </AccordionTrigger>
                            <AccordionContent>{item.content}</AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>

            <div className="flex-1" key={activeItem}>
                {activePanel}
            </div>
        </div>
    )
}
