"use client"

import { useEffect, useRef, useState } from "react"
import maplibregl, { FilterSpecification } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import type { RoutePreview } from "@/app/models/route-preview"
import { subscribeToDriverLocationUpdates, getDriverCurrentLocation } from "@/lib/supabase/db"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Layers, Loader2 } from "lucide-react"

export interface RouteStep {
    coords: number[]
    package_id?: string
    type?: "start" | "end" | "job"
    warehouse_name?: string
    warehouse_address?: string
    customer_name?: string
    customer_address?: string
    stop_number?: number
    status?: string
}

function statusColor(status?: string): string {
    switch (status?.toUpperCase()) {
        case "DELIVERED":
            return "#16a34a"
        case "FAILED":
            return "#dc2626"
        default:
            return "#3b82f6"
    }
}

function stopMarker(n: number, color: string): HTMLElement {
    const el = document.createElement("div")
    el.className = "custom-marker"
    el.style.cssText =
        `width:28px;height:28px;border-radius:9999px;background:${color};color:#fff;border:2px solid #fff;box-sizing:border-box;` +
        "box-shadow:0 2px 6px rgba(15,23,42,.3);" +
        "font-size:13px;font-weight:700;font-family:Inter,system-ui,sans-serif;line-height:24px;text-align:center;cursor:pointer;"
    el.textContent = String(n)
    return el
}

function driverMarker(): HTMLElement {
    const el = document.createElement("div")
    el.className = "driver-marker"
    el.style.cssText = "position:relative;width:18px;height:18px;cursor:pointer;"
    const pulse = document.createElement("span")
    pulse.style.cssText =
        "position:absolute;inset:0;border-radius:9999px;background:rgba(49,44,133,.4);" +
        "animation:driver-pulse 1.8s ease-out infinite;"
    const dot = document.createElement("span")
    dot.style.cssText =
        "position:absolute;inset:0;border-radius:9999px;background:#312c85;border:2px solid #fff;" +
        "box-shadow:0 1px 3px rgba(15,23,42,.4);"
    el.appendChild(pulse)
    el.appendChild(dot)
    return el
}

export function RouteMap({
    routeSteps,
    route,
    isLoading = false,
    height = "500px",
    driverId,
    driverLocation,
}: {
    routeSteps: RouteStep[]
    route: RoutePreview | null
    isLoading?: boolean
    height?: string
    driverId?: string
    driverLocation?: [number, number] | null
}) {
    const [showOutbound, setShowOutbound] = useState(true)
    const [showReturn, setShowReturn] = useState(true)
    const [showJobs, setShowJobs] = useState(true)
    const [showDriver, setShowDriver] = useState(true)

    const mapContainer = useRef<HTMLDivElement>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)
    const markersRef = useRef<{ element: HTMLElement; marker: maplibregl.Marker; type: "start" | "end" | "job" }[]>([])
    const driverMarkerRef = useRef<maplibregl.Marker | null>(null)

    useEffect(() => {
        if (!mapContainer.current || mapRef.current) return

        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
            center: [0, 0],
            zoom: 5,
        })

        mapRef.current = map

        if (routeSteps.length === 0) return

        const bounds = new maplibregl.LngLatBounds()

        routeSteps.forEach((routeStep, index) => {
            const coords: [number, number] = [routeStep.coords[0], routeStep.coords[1]]

            const isStart = routeStep.type === "start" || index === 0
            const isEnd = routeStep.type === "end" || index === routeSteps.length - 1
            const isJob = routeStep.type === "job" || !!routeStep.package_id

            let el: HTMLElement | null = null
            let anchor: "center" | "bottom" = "center"
            let popupContent = ""
            let popupOffset: [number, number] = [0, -18]

            if (isStart || isEnd) {
                el = document.createElement("div")
                el.className = "custom-marker"
                el.style.backgroundImage = "url('/postal.png')"
                el.style.width = "40px"
                el.style.height = "40px"
                el.style.backgroundSize = "contain"
                el.style.backgroundRepeat = "no-repeat"
                el.style.cursor = "pointer"
                anchor = "bottom"
                popupOffset = [0, -35]
                popupContent = `
                        <div class="px-2 py-1.5 space-y-0.5">
                            <div class="font-bold text-sm text-blue-600">${routeStep.warehouse_name || "Warehouse"}</div>
                            <div class="text-xs text-muted-foreground w-48 leading-tight line-clamp-2">${routeStep.warehouse_address || ""}</div>
                        </div>
                    `
            } else if (isJob) {
                el = stopMarker(routeStep.stop_number ?? index, statusColor(routeStep.status))
                anchor = "center"
                popupOffset = [0, -18]
                popupContent = `
                        <div class="px-2 py-1.5 space-y-0.5">
                            <div class="font-bold text-sm text-amber-600">${routeStep.customer_name || "Recipient"}</div>
                            <div class="text-xs text-muted-foreground w-48 leading-tight line-clamp-2">${routeStep.customer_address || ""}</div>
                        </div>
                    `
            }

            if (el) {
                const marker = new maplibregl.Marker({ element: el, anchor })
                    .setLngLat(coords)
                    .addTo(map)

                markersRef.current.push({
                    element: el,
                    marker,
                    type: isStart ? "start" : isEnd ? "end" : "job",
                })

                if (popupContent) {
                    const popup = new maplibregl.Popup({
                        offset: popupOffset,
                        closeButton: false,
                        closeOnClick: false,
                        className: "custom-popup",
                    }).setHTML(popupContent)

                    el.addEventListener("mouseenter", () => popup.addTo(map).setLngLat(coords))
                    el.addEventListener("mouseleave", () => popup.remove())
                }
            } else {
                new maplibregl.Marker().setLngLat(coords).addTo(map)
            }

            bounds.extend(coords)
        })

        if (driverLocation) {
            const el = driverMarker()
            const marker = new maplibregl.Marker({ element: el, anchor: "center" })
                .setLngLat(driverLocation)
                .addTo(map)
            driverMarkerRef.current = marker
            bounds.extend(driverLocation)

            const popup = new maplibregl.Popup({
                offset: [0, -14],
                closeButton: false,
                closeOnClick: false,
                className: "custom-popup",
            }).setHTML(`<div class="px-2 py-1.5"><div class="font-bold text-sm text-indigo-600">Driver</div></div>`)

            el.addEventListener("mouseenter", () => {
                const lngLat = marker.getLngLat()
                popup.addTo(map).setLngLat(lngLat)
            })
            el.addEventListener("mouseleave", () => popup.remove())
        }

        map.on("load", () => {
            map.fitBounds(bounds, { padding: 50, maxZoom: 12 })

            if (route) {
                const coordinates = route.coordinates
                const waypoints = route.wayPoints

                if (waypoints && waypoints.length >= 2) {
                    const features: GeoJSON.Feature<GeoJSON.LineString>[] = []
                    for (let i = 0; i < waypoints.length - 1; i++) {
                        const startIdx = waypoints[i]
                        const endIdx = waypoints[i + 1]
                        const segmentCoords = coordinates.slice(startIdx, endIdx + 1)
                        const isReturnTrip = i === waypoints.length - 2 && waypoints.length > 2

                        features.push({
                            type: "Feature",
                            properties: {
                                color: isReturnTrip ? "#ef4444" : "#3b82f6",
                                title: isReturnTrip ? "Return Trip" : "To Destination",
                                is_return: isReturnTrip,
                            },
                            geometry: { type: "LineString", coordinates: segmentCoords },
                        })
                    }

                    map.addSource("route", {
                        type: "geojson",
                        data: { type: "FeatureCollection", features },
                    })

                    map.addLayer({
                        id: "route-line",
                        type: "line",
                        source: "route",
                        layout: { "line-join": "round", "line-cap": "round" },
                        paint: { "line-color": ["get", "color"], "line-width": 5 },
                    })

                    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false })

                    map.on("mouseenter", "route-line", (e) => {
                        map.getCanvas().style.cursor = "pointer"
                        const properties = e.features?.[0].properties
                        popup
                            .setLngLat(e.lngLat)
                            .setHTML(`<div class="p-2 font-medium text-sm">${properties?.title || "Route Segment"}</div>`)
                            .addTo(map)
                    })

                    map.on("mouseleave", "route-line", () => {
                        map.getCanvas().style.cursor = ""
                        popup.remove()
                    })
                } else {
                    map.addSource("route", {
                        type: "geojson",
                        data: {
                            type: "Feature",
                            properties: { title: "Full Route" },
                            geometry: { type: "LineString", coordinates },
                        },
                    })

                    map.addLayer({
                        id: "route-line",
                        type: "line",
                        source: "route",
                        layout: { "line-join": "round", "line-cap": "round" },
                        paint: { "line-color": "#3b82f6", "line-width": 5 },
                    })
                }
            }
        })

        return () => {
            markersRef.current = []
            driverMarkerRef.current = null
            map.remove()
            mapRef.current = null
        }
    }, [routeSteps, route])

    useEffect(() => {
        if (!driverId) return

        const channel = subscribeToDriverLocationUpdates(driverId, async () => {
            try {
                const coords = await getDriverCurrentLocation(driverId)
                if (!coords) return
                const map = mapRef.current
                if (!map) return

                if (driverMarkerRef.current) {
                    driverMarkerRef.current.setLngLat(coords)
                } else {
                    const marker = new maplibregl.Marker({ element: driverMarker(), anchor: "center" })
                        .setLngLat(coords)
                        .addTo(map)
                    marker.getElement().style.display = showDriver ? "block" : "none"
                    driverMarkerRef.current = marker
                }
            } catch (e) {
                console.error("Failed to update driver location", e)
            }
        })

        return () => {
            channel.unsubscribe()
        }
    }, [driverId])

    useEffect(() => {
        const map = mapRef.current
        if (!map) return

        const applyFilter = () => {
            if (map.getLayer("route-line")) {
                let filter: FilterSpecification | null = null

                if (!showOutbound && !showReturn) {
                    filter = ["==", ["id"], "none"] 
                } else if (!showOutbound) {
                    filter = ["==", ["get", "is_return"], true]
                } else if (!showReturn) {
                    filter = ["==", ["get", "is_return"], false]
                }

                map.setFilter("route-line", filter)
                map.setLayoutProperty("route-line", "visibility", !showOutbound && !showReturn ? "none" : "visible")
            }

            markersRef.current.forEach(({ element, type }) => {
                if (type === "job") {
                    element.style.display = showJobs ? "block" : "none"
                }
            })

            const driverEl = driverMarkerRef.current?.getElement()
            if (driverEl) {
                driverEl.style.display = showDriver ? "block" : "none"
            }
        }

        if (map.isStyleLoaded()) {
            applyFilter()
        } else {
            map.once("styledata", applyFilter)
        }
    }, [showOutbound, showReturn, showJobs, showDriver])

    return (
        <div className="relative w-full rounded-md border group overflow-hidden" style={{ height }}>
            <style>{`@keyframes driver-pulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.6);opacity:0}}`}</style>
            {isLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}
            <div ref={mapContainer} className="w-full h-full" />

            <div className="absolute top-4 right-4 z-10 group/control">
                <div className="bg-background/80 backdrop-blur-md border shadow-lg rounded-md overflow-hidden transition-all duration-300 w-10 group-hover/control:w-44 h-10 group-hover/control:h-44">
                    <div className="flex items-center justify-center w-10 h-10 shrink-0">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="px-3 pb-3 space-y-3 opacity-0 group-hover/control:opacity-100 transition-opacity duration-300">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="showOutbound" checked={showOutbound} onCheckedChange={(v) => setShowOutbound(!!v)} />
                            <Label htmlFor="showOutbound" className="text-xs font-medium cursor-pointer">Outbound Route</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="showReturn" checked={showReturn} onCheckedChange={(v) => setShowReturn(!!v)} />
                            <Label htmlFor="showReturn" className="text-xs font-medium cursor-pointer">Return Trip</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="showJobs" checked={showJobs} onCheckedChange={(v) => setShowJobs(!!v)} />
                            <Label htmlFor="showJobs" className="text-xs font-medium cursor-pointer">Job Markers</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="showDriver" checked={showDriver} onCheckedChange={(v) => setShowDriver(!!v)} />
                            <Label htmlFor="showDriver" className="text-xs font-medium cursor-pointer">Driver</Label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
