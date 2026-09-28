import type { FeatureCollection, Point } from "geojson"
import type { WarehousePin } from "@/lib/supabase/db-server"

export type WarehousePinProperties = {
    id: string
    warehouse_name: string
    warehouse_address: string
}

export type WarehousePinFeatureCollection = FeatureCollection<Point, WarehousePinProperties>

export const emptyWarehousePinFeatureCollection: WarehousePinFeatureCollection = {
    type: "FeatureCollection",
    features: [],
}

// GeoJSON for the warehouse pin layer. The id is also a property, for
// `promoteId: "id"` and setFeatureState (hover, selected).
export function createWarehousePinFeatureCollection(
    pins: WarehousePin[]
): WarehousePinFeatureCollection {
    return {
        type: "FeatureCollection",
        features: pins.map((pin) => ({
            type: "Feature",
            id: pin.id,
            geometry: { type: "Point", coordinates: [pin.lng, pin.lat] },
            properties: {
                id: pin.id,
                warehouse_name: pin.warehouse_name,
                warehouse_address: pin.warehouse_address,
            },
        })),
    }
}
