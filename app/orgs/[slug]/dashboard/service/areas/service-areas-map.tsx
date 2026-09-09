"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import maplibregl from "maplibre-gl"
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
    /** The area highlighted in both the list and the map. */
    selectedAreaId: string | null
    focusRequest: ServiceAreaFocusRequest | null
    /** A polygon click picks that area, which highlights its row in the list. */
    onSelectArea: (id: string) => void
    /** Clicking the already-picked polygon opens it. */
    onOpenArea: (id: string) => void
    /**
     * Bumped when the set of areas changes (a delete). The viewport fetch skips
     * bounds it has already loaded, so without this the deleted polygon would
     * stay drawn until the dispatcher panned somewhere new.
     */
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
    selectedAreaId,
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
    const appliedSelectionRef = useRef<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [hasLoaded, setHasLoaded] = useState(false)
    const [hasError, setHasError] = useState(false)
    const [visibleAreaNames, setVisibleAreaNames] = useState<string[]>([])

    // Latest props read from the one-time mount effect without re-running it.
    // Rebuilding the MapLibre instance whenever the page re-renders would throw
    // away the dispatcher's pan and zoom mid-task.
    const initialBoundsRef = useRef(initialBounds)
    initialBoundsRef.current = initialBounds
    const selectedAreaIdRef = useRef(selectedAreaId)
    selectedAreaIdRef.current = selectedAreaId
    const onSelectAreaRef = useRef(onSelectArea)
    onSelectAreaRef.current = onSelectArea
    const onOpenAreaRef = useRef(onOpenArea)
    onOpenAreaRef.current = onOpenArea

    // Highlight one polygon. Never moves the camera: camera moves come from the
    // list (focusRequest), so picking an area on the map leaves the view alone.
    const applySelection = useCallback((id: string | null) => {
        const map = mapRef.current
        if (!map || !layersReadyRef.current) {
            return
        }

        const previous = appliedSelectionRef.current
        if (previous && previous !== id) {
            map.setFeatureState({ source: SOURCE_ID, id: previous }, { selected: false })
        }

        if (id) {
            map.setFeatureState({ source: SOURCE_ID, id }, { selected: true })
        }

        appliedSelectionRef.current = id
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

            // Replacing the source data drops the feature state that carries the
            // highlight, so put it back for whichever area is still selected.
            appliedSelectionRef.current = null
            applySelection(selectedAreaIdRef.current)

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
                // Feature state is keyed by feature id, and GeoJSON features
                // carry theirs in properties, so promote it to drive the
                // selected-area paint below.
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
            applySelection(selectedAreaIdRef.current)

            if (initialBoundsRef.current) {
                map.fitBounds(initialBoundsRef.current, {
                    padding: 48,
                    maxZoom: 11,
                    duration: 0,
                })
            }

            // setText, not setHTML: the label is an organisation-supplied name.
            const describeHoveredFeature = (feature: maplibregl.MapGeoJSONFeature | undefined) => {
                const serviceAreaName = typeof feature?.properties?.name === "string"
                    ? feature.properties.name
                    : "Service Area"
                const id = feature?.properties?.id

                return typeof id === "string" && selectedAreaIdRef.current === id
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

            // Kept in the move handler as well so the hint follows a selection
            // made while the cursor is still over the polygon.
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

                // Overlapping areas hide each other here: a click resolves to
                // whichever feature the layer happens to return first. So the
                // first click only picks the area, which highlights its row in
                // the list and says which one was hit; clicking the picked one
                // again is what opens it.
                if (selectedAreaIdRef.current === id) {
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
            appliedSelectionRef.current = null
            latestBoundsKeyRef.current = null
        }
    }, [applySelection, fetchVisibleServiceAreas])

    useEffect(() => {
        applySelection(selectedAreaId)
    }, [selectedAreaId, applySelection])

    useEffect(() => {
        if (!focusRequest) {
            return
        }

        // fitBounds ends in a moveend, which schedules the fetch for the new
        // viewport, so an area outside the current view arrives drawn.
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
            ? "Unable to load service areas for this view."
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

            {/*
                The canvas itself says nothing to a screen reader, and it is also
                the only place that knows which areas are currently drawn.
            */}
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
