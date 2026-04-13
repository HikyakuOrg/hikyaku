export interface PackageOptimisation {
    id: number
    route_id: string
    step_index: number
    type: string
    location: Location
    arrival: number | null
    duration: number | null
    setup: number | null
    service: number | null
    waiting_time: number | null
    load: number[] | null
    solution_id: string
    package_assignment?: {
        package_id: string;
        driver?: {
            id: string;
            warehouse_id: string | null;
        } | null;
        vehicle?: {
            id: string;
            vehicle_plate: string | null;
            vehicle_make: string | null;
            vehicle_model: string | null;
            vehicle_type: {
                ors_vehicle_type: string
            };
        } | null;
        package: {
            tracking_number?: string | null;
            to_customer?: {
                id: string;
                customer_name: string;
                customer_address: string;
                customer_suburb: string;
                customer_state: string;
                customer_postcode: string;
            } | null;
            warehouse?: {
                id: string;
                warehouse_name: string;
                warehouse_address: string;
            } | null;
            current_status?: string | null;
            package_delivery_window?: {
                scheduled_arrival: Date;
                actual_arrival: Date | null;
            } | null;
        } | null;
    } | null;
}

export interface Location {
    type: string
    crs: Crs
    coordinates: number[]
}

export interface Crs {
    type: string
    properties: Properties
}

export interface Properties {
    name: string
}
