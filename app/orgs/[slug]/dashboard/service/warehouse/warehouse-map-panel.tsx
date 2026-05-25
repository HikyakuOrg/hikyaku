"use client"

import { useCallback, useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

import { createWarehousePinFeatureCollection } from "@/lib/maps/warehouse-geometry"
import type { WarehousePin } from "@/lib/supabase/db-server"

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
const DEFAULT_CENTER: [number, number] = [144.9631, -37.8136]
const SOURCE_ID = "warehouses"
const LAYER_ID = "warehouse-pins"

export type WarehouseFocusRequest = { id: string; token: number }

type PinInfo = { coords: [number, number]; name: string }

type WarehouseMapPanelProps = {
    pins: WarehousePin[]
    selectedWarehouseId: string | null
    /** Set when a card is clicked, to pan/zoom the map to that pin. */
    focusRequest: WarehouseFocusRequest | null
    onSelectWarehouse: (id: string) => void
}

export function WarehouseMapPanel({
    pins,
    selectedWarehouseId,
    focusRequest,
    onSelectWarehouse,
}: WarehouseMapPanelProps) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)
    const layersReadyRef = useRef(false)
    const hoverPopupRef = useRef<maplibregl.Popup | null>(null)
    const selectionPopupRef = useRef<maplibregl.Popup | null>(null)
    const prevSelectedRef = useRef<string | null>(null)

    // Latest callback + pin lookup, read from one-time effects without re-running them.
    const onSelectRef = useRef(onSelectWarehouse)
    onSelectRef.current = onSelectWarehouse

    const pinInfoRef = useRef<Map<string, PinInfo>>(new Map())
    pinInfoRef.current = new Map(
        pins.map((pin) => [pin.id, { coords: [pin.lng, pin.lat] as [number, number], name: pin.warehouse_name }])
    )

    const pinsRef = useRef<WarehousePin[]>(pins)
    pinsRef.current = pins
    const needsInitialFitRef = useRef(true)

    const updatePins = useCallback((nextPins: WarehousePin[]) => {
        const map = mapRef.current
        if (!map || !layersReadyRef.current) {
            return
        }
        const source = map.getSource(SOURCE_ID)
        if (source instanceof maplibregl.GeoJSONSource) {
            source.setData(createWarehousePinFeatureCollection(nextPins))
        }
    }, [])

    const fitToPins = useCallback((nextPins: WarehousePin[]) => {
        const map = mapRef.current
        if (!map) {
            return
        }
        const valid = nextPins.filter((pin) => Number.isFinite(pin.lng) && Number.isFinite(pin.lat))
        if (valid.length === 0) {
            return
        }
        if (valid.length === 1) {
            map.easeTo({ center: [valid[0].lng, valid[0].lat], zoom: 12, duration: 0 })
            return
        }
        const bounds = new maplibregl.LngLatBounds()
        valid.forEach((pin) => bounds.extend([pin.lng, pin.lat]))
        map.fitBounds(bounds, { padding: 64, maxZoom: 12, duration: 0 })
    }, [])

    // Fit to all pins once the container actually has a size (immediately on
    // desktop; on first reveal of the mobile map tab, which starts hidden at 0x0).
    const maybeInitialFit = useCallback(() => {
        const map = mapRef.current
        if (!map || !needsInitialFitRef.current) {
            return
        }
        const container = map.getContainer()
        if (container.clientWidth > 0 && container.clientHeight > 0) {
            fitToPins(pinsRef.current)
            needsInitialFitRef.current = false
        }
    }, [fitToPins])

    // Highlight the selected pin + show its name. Does NOT move the camera —
    // camera moves are driven by focusRequest (card clicks) only.
    const applySelection = useCallback((id: string | null) => {
        const map = mapRef.current
        const selectionPopup = selectionPopupRef.current
        if (!map || !layersReadyRef.current || !selectionPopup) {
            return
        }

        const previous = prevSelectedRef.current
        if (previous && previous !== id) {
            map.setFeatureState({ source: SOURCE_ID, id: previous }, { selected: false })
        }

        if (id) {
            map.setFeatureState({ source: SOURCE_ID, id }, { selected: true })
            const info = pinInfoRef.current.get(id)
            if (info) {
                selectionPopup.setLngLat(info.coords).setText(info.name).addTo(map)
            }
        } else {
            selectionPopup.remove()
        }

        prevSelectedRef.current = id
    }, [])

    // Initialise the map once.
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) {
            return
        }

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: MAP_STYLE,
            center: DEFAULT_CENTER,
            zoom: 3,
        })
        mapRef.current = map

        const hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14 })
        const selectionPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14 })
        hoverPopupRef.current = hoverPopup
        selectionPopupRef.current = selectionPopup

        const mountPins = () => {
            map.addSource(SOURCE_ID, {
                type: "geojson",
                data: createWarehousePinFeatureCollection(pins),
                promoteId: "id",
            })

            map.addLayer({
                id: LAYER_ID,
                type: "circle",
                source: SOURCE_ID,
                paint: {
                    "circle-radius": [
                        "case",
                        ["boolean", ["feature-state", "selected"], false], 9,
                        ["boolean", ["feature-state", "hover"], false], 7,
                        6,
                    ],
                    "circle-color": [
                        "case",
                        ["boolean", ["feature-state", "selected"], false], "#0f766e",
                        "#0d9488",
                    ],
                    "circle-stroke-width": [
                        "case",
                        ["boolean", ["feature-state", "selected"], false], 3,
                        2,
                    ],
                    "circle-stroke-color": "#ffffff",
                },
            })

            layersReadyRef.current = true
            maybeInitialFit()
            applySelection(prevSelectedRef.current)

            let hoveredId: string | null = null

            map.on("mousemove", LAYER_ID, (event) => {
                map.getCanvas().style.cursor = "pointer"
                const feature = event.features?.[0]
                const id = typeof feature?.id === "string" ? feature.id : null

                if (hoveredId && hoveredId !== id) {
                    map.setFeatureState({ source: SOURCE_ID, id: hoveredId }, { hover: false })
                }
                if (id) {
                    hoveredId = id
                    map.setFeatureState({ source: SOURCE_ID, id }, { hover: true })
                }

                const name = typeof feature?.properties?.warehouse_name === "string"
                    ? feature.properties.warehouse_name
                    : "Warehouse"
                hoverPopup.setLngLat(event.lngLat).setText(name).addTo(map)
            })

            map.on("mouseleave", LAYER_ID, () => {
                map.getCanvas().style.cursor = ""
                if (hoveredId) {
                    map.setFeatureState({ source: SOURCE_ID, id: hoveredId }, { hover: false })
                    hoveredId = null
                }
                hoverPopup.remove()
            })

            map.on("click", LAYER_ID, (event) => {
                const id = event.features?.[0]?.id
                if (typeof id === "string") {
                    onSelectRef.current(id)
                }
            })
        }

        if (map.isStyleLoaded()) {
            mountPins()
        } else {
            map.once("load", mountPins)
        }

        // Keep the canvas sized to its container (flex/grid resizes + the mobile
        // tab becoming visible after starting hidden at 0x0).
        const resizeObserver = new ResizeObserver(() => {
            map.resize()
            maybeInitialFit()
        })
        resizeObserver.observe(mapContainerRef.current)

        return () => {
            resizeObserver.disconnect()
            hoverPopup.remove()
            selectionPopup.remove()
            map.remove()
            mapRef.current = null
            hoverPopupRef.current = null
            selectionPopupRef.current = null
            layersReadyRef.current = false
            prevSelectedRef.current = null
            needsInitialFitRef.current = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Push new pin data to the source if pins ever change after mount.
    useEffect(() => {
        updatePins(pins)
    }, [pins, updatePins])

    // Reflect selection (pin highlight + name popup).
    useEffect(() => {
        applySelection(selectedWarehouseId)
    }, [selectedWarehouseId, applySelection])

    // Card clicks request the camera to focus a pin.
    useEffect(() => {
        if (!focusRequest) {
            return
        }
        const map = mapRef.current
        const info = pinInfoRef.current.get(focusRequest.id)
        if (map && info) {
            map.easeTo({ center: info.coords, zoom: Math.max(map.getZoom(), 12) })
        }
    }, [focusRequest])

    return (
        <div className="relative h-full w-full overflow-hidden rounded-xl border bg-muted/20">
            <div ref={mapContainerRef} className="h-full w-full" />
        </div>
    )
}
