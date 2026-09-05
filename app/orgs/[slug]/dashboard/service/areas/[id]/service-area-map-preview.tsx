"use client"

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

import type { ServiceAreaBounds, ServiceAreaFeatureCollection } from "@/lib/maps/service-area-geometry"

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
const DEFAULT_CENTER: [number, number] = [144.9631, -37.8136]
const SOURCE_ID = "service-area"
const FILL_LAYER_ID = "service-area-fill"
const OUTLINE_LAYER_ID = "service-area-outline"

type ServiceAreaMapPreviewProps = {
    areaName: string
    /** This one area's geometry, already resolved server-side. */
    featureCollection: ServiceAreaFeatureCollection
    bounds: ServiceAreaBounds | null
}

/**
 * The one polygon this page is about.
 *
 * Deliberately not the explorer's map. That one fetches whatever is inside the
 * viewport and lets a dispatcher pick between polygons, which is the wrong job
 * here: this page has already resolved a single area server-side, so the map
 * takes the geometry as a prop, draws it, fits to it, and has nothing to select.
 */
export function ServiceAreaMapPreview({ areaName, featureCollection, bounds }: ServiceAreaMapPreviewProps) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null)

    // The geometry is a prop rather than something this map fetches, so it is an
    // ordinary dependency: if a re-render ever hands over a different area, the
    // map is rebuilt around it instead of quietly keeping the old polygon. The
    // props are server-rendered and stable for the life of the page, so in
    // practice this runs once.
    useEffect(() => {
        const container = mapContainerRef.current

        if (!container) {
            return
        }

        const map = new maplibregl.Map({
            container,
            style: MAP_STYLE,
            center: DEFAULT_CENTER,
            zoom: 8,
        })

        const mountServiceArea = () => {
            map.addSource(SOURCE_ID, {
                type: "geojson",
                data: featureCollection,
            })

            map.addLayer({
                id: FILL_LAYER_ID,
                type: "fill",
                source: SOURCE_ID,
                paint: {
                    "fill-color": "#0d9488",
                    "fill-opacity": 0.35,
                },
            })

            map.addLayer({
                id: OUTLINE_LAYER_ID,
                type: "line",
                source: SOURCE_ID,
                paint: {
                    "line-color": "#115e59",
                    "line-width": 3,
                },
            })

            if (bounds) {
                map.fitBounds(bounds, {
                    padding: 64,
                    maxZoom: 13,
                    duration: 0,
                })
            }
        }

        if (map.isStyleLoaded()) {
            mountServiceArea()
        } else {
            map.once("load", mountServiceArea)
        }

        return () => {
            map.remove()
        }
    }, [featureCollection, bounds])

    const hasGeometry = featureCollection.features.length > 0

    return (
        <div
            className="relative h-[420px] w-full overflow-hidden rounded-xl border bg-muted/20"
            data-testid="service-area-detail-map"
        >
            <div ref={mapContainerRef} className="h-full w-full" />

            {/* The canvas says nothing to a screen reader. */}
            <p className="sr-only" data-testid="service-area-detail-map-summary">
                {hasGeometry
                    ? `Map showing the coverage area for ${areaName}.`
                    : `No coverage polygon could be drawn for ${areaName}.`}
            </p>

            {hasGeometry ? null : (
                <div className="pointer-events-none absolute left-4 top-4 rounded-md border bg-background/95 px-3 py-2 text-sm shadow-sm backdrop-blur">
                    This area has no polygon that can be drawn.
                </div>
            )}
        </div>
    )
}
