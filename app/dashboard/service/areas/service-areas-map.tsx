"use client"

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

import { getServiceAreaFeatureCollectionBounds, type ServiceAreaFeatureCollection } from "@/lib/maps/service-area-geometry"

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
const DEFAULT_CENTER: [number, number] = [144.9631, -37.8136]
const SOURCE_ID = "service-areas"
const FILL_LAYER_ID = "service-areas-fill"
const OUTLINE_LAYER_ID = "service-areas-outline"

type ServiceAreasMapProps = {
    featureCollection: ServiceAreaFeatureCollection
}

export function ServiceAreasMap({ featureCollection }: ServiceAreasMapProps) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current || featureCollection.features.length === 0) {
            return
        }

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: MAP_STYLE,
            center: DEFAULT_CENTER,
            zoom: 8,
        })

        mapRef.current = map

        const popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 12,
        })

        const mountServiceAreas = () => {
            map.addSource(SOURCE_ID, {
                type: "geojson",
                data: featureCollection,
            })

            map.addLayer({
                id: FILL_LAYER_ID,
                type: "fill",
                source: SOURCE_ID,
                paint: {
                    "fill-color": "#0f766e",
                    "fill-opacity": 0.18,
                },
            })

            map.addLayer({
                id: OUTLINE_LAYER_ID,
                type: "line",
                source: SOURCE_ID,
                paint: {
                    "line-color": "#115e59",
                    "line-width": 2,
                },
            })

            const bounds = getServiceAreaFeatureCollectionBounds(featureCollection)

            if (bounds) {
                map.fitBounds(bounds, {
                    padding: 48,
                    maxZoom: 11,
                    duration: 0,
                })
            }

            map.on("mouseenter", FILL_LAYER_ID, (event) => {
                map.getCanvas().style.cursor = "pointer"

                const hoveredFeature = event.features?.[0]
                const serviceAreaName = typeof hoveredFeature?.properties?.name === "string"
                    ? hoveredFeature.properties.name
                    : "Service Area"

                popup
                    .setLngLat(event.lngLat)
                    .setText(serviceAreaName)
                    .addTo(map)
            })

            map.on("mousemove", FILL_LAYER_ID, (event) => {
                popup.setLngLat(event.lngLat)
            })

            map.on("mouseleave", FILL_LAYER_ID, () => {
                map.getCanvas().style.cursor = ""
                popup.remove()
            })
        }

        if (map.isStyleLoaded()) {
            mountServiceAreas()
        } else {
            map.once("load", mountServiceAreas)
        }

        return () => {
            popup.remove()
            map.remove()
            mapRef.current = null
        }
    }, [featureCollection])

    if (featureCollection.features.length === 0) {
        return (
            <div className="flex h-[560px] w-full items-center justify-center rounded-xl border bg-muted/20 px-6 text-center">
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold">No service areas yet</h2>
                    <p className="text-sm text-muted-foreground">
                        Add a service area to start visualizing coverage on the map.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div
            ref={mapContainerRef}
            className="h-[560px] w-full overflow-hidden rounded-xl border bg-muted/20"
        />
    )
}