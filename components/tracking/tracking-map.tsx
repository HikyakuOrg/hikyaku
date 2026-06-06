"use client"

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { DirectionsResponse } from "ors-client"
import { calculateDistance, decodePolyline } from "@/lib/maps/geo"
import { subscribeToTrackingLocation } from "@/lib/supabase/db"
import { getRoutePreview } from "@/lib/actions/route"
import type { PackageStatus } from "@/app/models/package-status"
import type { TrackingLngLat } from "@/app/models/tracking"

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
// Recompute the driver→destination route at most this often / this far apart.
const ROUTE_REFRESH_MS = 30_000
const ROUTE_REFRESH_METERS = 150

interface TrackingMapProps {
    trackingNumber: string
    status: PackageStatus
    destination: TrackingLngLat
    origin?: TrackingLngLat | null
    initialDriverLocation?: TrackingLngLat | null
    height?: string
}

function destinationMarkerEl(): HTMLElement {
    const el = document.createElement("div")
    el.style.cssText =
        "width:40px;height:40px;background-image:url('/postal.png');background-size:contain;" +
        "background-repeat:no-repeat;cursor:default;"
    return el
}

function originMarkerEl(): HTMLElement {
    const el = document.createElement("div")
    el.style.cssText =
        "width:14px;height:14px;border-radius:9999px;background:#0f172a;border:2px solid #fff;" +
        "box-shadow:0 1px 3px rgba(15,23,42,.4);"
    return el
}

function driverMarkerEl(): HTMLElement {
    const el = document.createElement("div")
    el.style.cssText = "position:relative;width:18px;height:18px;"
    const pulse = document.createElement("span")
    pulse.style.cssText =
        "position:absolute;inset:0;border-radius:9999px;background:rgba(37,99,235,.35);" +
        "animation:tracking-pulse 1.8s ease-out infinite;"
    const dot = document.createElement("span")
    dot.style.cssText =
        "position:absolute;inset:0;border-radius:9999px;background:#2563eb;border:2px solid #fff;" +
        "box-shadow:0 1px 3px rgba(15,23,42,.4);"
    el.appendChild(pulse)
    el.appendChild(dot)
    return el
}

function routeGeometryToCoords(route: DirectionsResponse | null): [number, number][] {
    const feature = route?.routes?.[0]
    if (!feature) return []
    const geometry = feature.geometry
    if (typeof geometry === "string") return decodePolyline(geometry)
    if (geometry && typeof geometry === "object" && "coordinates" in geometry) {
        return (geometry as { coordinates: [number, number][] }).coordinates
    }
    return []
}

export function TrackingMap({
    trackingNumber,
    status,
    destination,
    origin,
    initialDriverLocation,
    height = "420px",
}: TrackingMapProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)
    const driverMarkerRef = useRef<maplibregl.Marker | null>(null)
    const lastRouteFromRef = useRef<TrackingLngLat | null>(null)
    const lastRouteAtRef = useRef<number>(0)

    const inTransit = status === "IN_TRANSIT"

    // Stable refs for the helpers so the (run-once) init effect and the
    // subscription effect always call the latest closures.
    const placeDriver = (loc: TrackingLngLat) => {
        const map = mapRef.current
        if (!map) return
        if (driverMarkerRef.current) {
            driverMarkerRef.current.setLngLat([loc.lng, loc.lat])
        } else {
            driverMarkerRef.current = new maplibregl.Marker({
                element: driverMarkerEl(),
                anchor: "center",
            })
                .setLngLat([loc.lng, loc.lat])
                .addTo(map)
        }
    }

    const refreshRoute = async (from: TrackingLngLat) => {
        lastRouteFromRef.current = from
        lastRouteAtRef.current = Date.now()
        try {
            const route = await getRoutePreview("driving-car", [
                [from.lng, from.lat],
                [destination.lng, destination.lat],
            ])
            const coords = routeGeometryToCoords(route)
            const source = mapRef.current?.getSource("tracking-route") as
                | maplibregl.GeoJSONSource
                | undefined
            if (source && coords.length > 0) {
                source.setData({
                    type: "Feature",
                    properties: {},
                    geometry: { type: "LineString", coordinates: coords },
                })
            }
        } catch (e) {
            console.error("Failed to refresh tracking route", e)
        }
    }

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return

        const map = new maplibregl.Map({
            container: containerRef.current,
            style: MAP_STYLE,
            center: [destination.lng, destination.lat],
            zoom: 12,
        })
        mapRef.current = map

        new maplibregl.Marker({ element: destinationMarkerEl(), anchor: "bottom" })
            .setLngLat([destination.lng, destination.lat])
            .addTo(map)

        if (origin) {
            new maplibregl.Marker({ element: originMarkerEl(), anchor: "center" })
                .setLngLat([origin.lng, origin.lat])
                .addTo(map)
        }

        map.on("load", () => {
            map.addSource("tracking-route", {
                type: "geojson",
                data: { type: "FeatureCollection", features: [] },
            })
            map.addLayer({
                id: "tracking-route-line",
                type: "line",
                source: "tracking-route",
                layout: { "line-join": "round", "line-cap": "round" },
                paint: { "line-color": "#2563eb", "line-width": 4, "line-opacity": 0.85 },
            })

            const bounds = new maplibregl.LngLatBounds()
            bounds.extend([destination.lng, destination.lat])
            if (origin) bounds.extend([origin.lng, origin.lat])

            if (inTransit && initialDriverLocation) {
                placeDriver(initialDriverLocation)
                bounds.extend([initialDriverLocation.lng, initialDriverLocation.lat])
                void refreshRoute(initialDriverLocation)
            }

            if (!bounds.isEmpty()) {
                map.fitBounds(bounds, { padding: 64, maxZoom: 14 })
            }
        })

        return () => {
            map.remove()
            mapRef.current = null
            driverMarkerRef.current = null
        }
        // Run once: destination/origin/initial state are fixed for a given page load.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!inTransit) return

        const channel = subscribeToTrackingLocation(trackingNumber, (loc) => {
            placeDriver(loc)
            const last = lastRouteFromRef.current
            const movedFar =
                !last ||
                calculateDistance(
                    { lat: last.lat, lng: last.lng },
                    { lat: loc.lat, lng: loc.lng }
                ) *
                    1000 >
                    ROUTE_REFRESH_METERS
            const stale = Date.now() - lastRouteAtRef.current > ROUTE_REFRESH_MS
            if (movedFar || stale) void refreshRoute(loc)
        })

        return () => {
            channel.unsubscribe()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inTransit, trackingNumber])

    return (
        <div
            className="relative w-full overflow-hidden rounded-xl border"
            style={{ height }}
        >
            <style>{`@keyframes tracking-pulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.6);opacity:0}}`}</style>
            <div ref={containerRef} className="h-full w-full" />
        </div>
    )
}
