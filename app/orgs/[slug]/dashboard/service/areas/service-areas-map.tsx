"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import * as maplibregl from "@/lib/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"

import { emptyServiceAreaFeatureCollection, type ServiceAreaBounds } from "@/lib/maps/service-area-geometry"

import { getVisibleServiceAreas } from "./actions"

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
const DEFAULT_CENTER: [number, number] = [144.9631, -37.8136]
const SOURCE_ID = "service-areas"
const FILL_LAYER_ID = "service-areas-fill"
const OUTLINE_LAYER_ID = "service-areas-outline"
const FETCH_DEBOUNCE_MS = 150

/** A request from the list to move the camera. The token makes repeats distinct. */
export type ServiceAreaFocusRequest = {
    bounds: ServiceAreaBounds
    token: number
}

type ServiceAreasMapProps = {
    initialBounds: ServiceAreaBounds | null
    /** The areas highlighted in both the list and the map. */
    selectedAreaIds: string[]
    focusRequest: ServiceAreaFocusRequest | null
    /** A polygon click selects the area and ticks its row. */
    onSelectArea: (id: string) => void
    /** Clicking an already-picked polygon opens it. */
    onOpenArea: (id: string) => void
    /** Increases after a delete, so the map reloads the current view. */
    refreshToken: number
}

type ViewportBounds = {
    minLat: number
    minLng: number
    maxLat: number
    maxLng: number
}

function createBoundsKey(bounds: ViewportBounds) {
    return [
        bounds.minLng.toFixed(5),
        bounds.minLat.toFixed(5),
        bounds.maxLng.toFixed(5),
        bounds.maxLat.toFixed(5),
    ].join(":")
}

export function ServiceAreasMap({
    initialBounds,
    selectedAreaIds,
    focusRequest,
    onSelectArea,
    onOpenArea,
    refreshToken,
}: ServiceAreasMapProps) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)
    const layersReadyRef = useRef(false)
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const latestBoundsKeyRef = useRef<string | null>(null)
    const requestSequenceRef = useRef(0)
    const appliedSelectionRef = useRef<string[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [hasLoaded, setHasLoaded] = useState(false)
    const [hasError, setHasError] = useState(false)
    const [visibleAreaNames, setVisibleAreaNames] = useState<string[]>([])

    // Latest props for the mount effect, so a re-render does not rebuild the
    // map and lose the user's pan and zoom.
    const initialBoundsRef = useRef(initialBounds)
    initialBoundsRef.current = initialBounds
    const selectedAreaIdsRef = useRef(selectedAreaIds)
    selectedAreaIdsRef.current = selectedAreaIds
    const onSelectAreaRef = useRef(onSelectArea)
    onSelectAreaRef.current = onSelectArea
    const onOpenAreaRef = useRef(onOpenArea)
    onOpenAreaRef.current = onOpenArea

    // Highlight the selected polygons. Only focusRequest moves the camera.
    const applySelection = useCallback((ids: string[]) => {
        const map = mapRef.current
        if (!map || !layersReadyRef.current) {
            return
        }

        for (const previous of appliedSelectionRef.current) {
            if (!ids.includes(previous)) {
                map.setFeatureState({ source: SOURCE_ID, id: previous }, { selected: false })
            }
        }

        for (const id of ids) {
            map.setFeatureState({ source: SOURCE_ID, id }, { selected: true })
        }

        appliedSelectionRef.current = ids
    }, [])

    const fetchVisibleServiceAreas = useCallback(async (options?: { force?: boolean }) => {
        const map = mapRef.current
        const mapBounds = map?.getBounds()
        if (!map || !mapBounds) {
            return
        }

        const bounds = {
            minLng: mapBounds.getWest(),
            minLat: mapBounds.getSouth(),
            maxLng: mapBounds.getEast(),
            maxLat: mapBounds.getNorth(),
        }

        const boundsKey = createBoundsKey(bounds)

        if (!options?.force && latestBoundsKeyRef.current === boundsKey) {
            return
        }

        const requestSequence = ++requestSequenceRef.current

        setIsLoading(true)
        setHasError(false)

        try {
            const nextFeatureCollection = await getVisibleServiceAreas(bounds)

            if (requestSequence !== requestSequenceRef.current) {
                return
            }

            latestBoundsKeyRef.current = boundsKey

            const source = map.getSource(SOURCE_ID)
            if (source instanceof maplibregl.GeoJSONSource) {
                source.setData(nextFeatureCollection)
            }

            // New source data clears the highlight, so apply it again.
            appliedSelectionRef.current = []
            applySelection(selectedAreaIdsRef.current)

            setVisibleAreaNames(nextFeatureCollection.features.map((feature) => feature.properties.name))
            setHasLoaded(true)
        } catch (error) {
            console.error(error)
            latestBoundsKeyRef.current = null
            setHasError(true)
            setHasLoaded(true)
        } finally {
            if (requestSequence === requestSequenceRef.current) {
                setIsLoading(false)
            }
        }
    }, [applySelection])

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) {
            return
        }

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: MAP_STYLE,
            center: DEFAULT_CENTER,
            zoom: 8,
        })

        const scheduleFetch = () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current)
            }

            debounceTimeoutRef.current = setTimeout(() => {
                void fetchVisibleServiceAreas()
            }, FETCH_DEBOUNCE_MS)
        }

        mapRef.current = map

        const popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 12,
        })

        const mountServiceAreas = () => {
            map.addSource(SOURCE_ID, {
                type: "geojson",
                data: emptyServiceAreaFeatureCollection,
                // Use properties.id as the feature id for feature state.
                promoteId: "id",
            })

            map.addLayer({
                id: FILL_LAYER_ID,
                type: "fill",
                source: SOURCE_ID,
                paint: {
                    "fill-color": [
                        "case",
                        ["boolean", ["feature-state", "selected"], false], "#0d9488",
                        "#0f766e",
                    ],
                    "fill-opacity": [
                        "case",
                        ["boolean", ["feature-state", "selected"], false], 0.45,
                        0.18,
                    ],
                },
            })

            map.addLayer({
                id: OUTLINE_LAYER_ID,
                type: "line",
                source: SOURCE_ID,
                paint: {
                    "line-color": "#115e59",
                    "line-width": [
                        "case",
                        ["boolean", ["feature-state", "selected"], false], 4,
                        2,
                    ],
                },
            })

            layersReadyRef.current = true
            applySelection(selectedAreaIdsRef.current)

            if (initialBoundsRef.current) {
                map.fitBounds(initialBoundsRef.current, {
                    padding: 48,
                    maxZoom: 11,
                    duration: 0,
                })
            }

            // setText, not setHTML: the name comes from users.
            const describeHoveredFeature = (feature: maplibregl.MapGeoJSONFeature | undefined) => {
                const serviceAreaName = typeof feature?.properties?.name === "string"
                    ? feature.properties.name
                    : "Service Area"
                const id = feature?.properties?.id

                return typeof id === "string" && selectedAreaIdsRef.current.includes(id)
                    ? `${serviceAreaName} (click again to open)`
                    : `${serviceAreaName} (click to select)`
            }

            map.on("mouseenter", FILL_LAYER_ID, (event) => {
                map.getCanvas().style.cursor = "pointer"

                popup
                    .setLngLat(event.lngLat)
                    .setText(describeHoveredFeature(event.features?.[0]))
                    .addTo(map)
            })

            // Update the hint after a click while the cursor stays on the polygon.
            map.on("mousemove", FILL_LAYER_ID, (event) => {
                popup
                    .setLngLat(event.lngLat)
                    .setText(describeHoveredFeature(event.features?.[0]))
            })

            map.on("mouseleave", FILL_LAYER_ID, () => {
                map.getCanvas().style.cursor = ""
                popup.remove()
            })

            map.on("click", FILL_LAYER_ID, (event) => {
                const clickedFeature = event.features?.[0]
                const id = clickedFeature?.properties?.id

                if (typeof id !== "string") {
                    return
                }

                // Areas can overlap, so the first click selects and shows which
                // area it hit. A second click opens it.
                if (selectedAreaIdsRef.current.includes(id)) {
                    onOpenAreaRef.current(id)
                    return
                }

                onSelectAreaRef.current(id)
            })

            map.on("moveend", scheduleFetch)
            scheduleFetch()
        }

        if (map.isStyleLoaded()) {
            mountServiceAreas()
        } else {
            map.once("load", mountServiceAreas)
        }

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current)
            }
            popup.remove()
            map.remove()
            mapRef.current = null
            layersReadyRef.current = false
            appliedSelectionRef.current = []
            latestBoundsKeyRef.current = null
        }
    }, [applySelection, fetchVisibleServiceAreas])

    useEffect(() => {
        applySelection(selectedAreaIds)
    }, [selectedAreaIds, applySelection])

    useEffect(() => {
        if (!focusRequest) {
            return
        }

        // fitBounds triggers moveend, which loads the new view.
        mapRef.current?.fitBounds(focusRequest.bounds, {
            padding: 64,
            maxZoom: 13,
        })
    }, [focusRequest])

    useEffect(() => {
        if (refreshToken === 0) {
            return
        }

        void fetchVisibleServiceAreas({ force: true })
    }, [refreshToken, fetchVisibleServiceAreas])

    const overlayMessage = isLoading
        ? "Loading visible service areas..."
        : hasError
            ? "Could not load service areas for this view."
            : hasLoaded && visibleAreaNames.length === 0
                ? "No service areas in this view."
                : null

    return (
        <div
            className="relative h-[560px] w-full overflow-hidden rounded-xl border bg-muted/20"
            data-testid="service-areas-map"
        >
            <div
                ref={mapContainerRef}
                className="h-full w-full"
            />

            {/* Tells screen readers which areas the map shows. */}
            <p className="sr-only" aria-live="polite" data-testid="service-areas-map-summary">
                {!hasLoaded
                    ? "Loading the service areas in this view."
                    : visibleAreaNames.length === 0
                        ? "No service areas in this view."
                        : `Showing ${visibleAreaNames.length} service area${visibleAreaNames.length === 1 ? "" : "s"} in this view: ${visibleAreaNames.join(", ")}.`}
            </p>

            {overlayMessage ? (
                <div className="pointer-events-none absolute left-4 top-4 rounded-md border bg-background/95 px-3 py-2 text-sm shadow-sm backdrop-blur">
                    {overlayMessage}
                </div>
            ) : null}
        </div>
    )
}
