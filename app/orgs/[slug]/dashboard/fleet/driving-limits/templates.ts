import { hoursToSeconds, kilometresToMetres, type DrivingLimitValues } from "@/lib/driving-limits"

export type DrivingLimitTemplate = {
    key: string
    name: string
    description: string
    values: DrivingLimitValues
}

/**
 * Worked examples a dispatcher can start a profile from.
 *
 * Front-end content, never database rows: nothing seeds these into an
 * organisation, nothing applies one to anybody, and a profile saved from one
 * keeps no link back to it. The numbers are illustrative starting points, and
 * the copy around them must not present any of them as meeting a jurisdiction's
 * fatigue or working-time rules.
 */
export const DRIVING_LIMIT_TEMPLATES: DrivingLimitTemplate[] = [
    {
        key: "standard-metro",
        name: "Standard metro",
        description: "A full day of suburban deliveries.",
        values: {
            max_working_seconds: hoursToSeconds(10),
            max_driving_seconds: hoursToSeconds(8),
            max_distance_m: kilometresToMetres(250),
            max_stops: 40,
        },
    },
    {
        key: "probationary",
        name: "Probationary",
        description: "A lighter day for a driver who is new to the routes.",
        values: {
            max_working_seconds: hoursToSeconds(8),
            max_driving_seconds: hoursToSeconds(6),
            max_distance_m: kilometresToMetres(150),
            max_stops: 25,
        },
    },
    {
        key: "heavy-vehicle",
        name: "Heavy vehicle",
        description: "Fewer, bigger drops spread over more road.",
        values: {
            max_working_seconds: hoursToSeconds(10),
            max_driving_seconds: hoursToSeconds(7),
            max_distance_m: kilometresToMetres(400),
            max_stops: 15,
        },
    },
    {
        key: "bicycle-courier",
        name: "Bicycle courier",
        description: "Short city hops, with no separate driving-time limit.",
        values: {
            max_working_seconds: hoursToSeconds(6),
            max_driving_seconds: null,
            max_distance_m: kilometresToMetres(60),
            max_stops: 30,
        },
    },
    {
        key: "part-time",
        name: "Part-time",
        description: "A half-day shift.",
        values: {
            max_working_seconds: hoursToSeconds(4),
            max_driving_seconds: hoursToSeconds(3),
            max_distance_m: kilometresToMetres(80),
            max_stops: 15,
        },
    },
]
