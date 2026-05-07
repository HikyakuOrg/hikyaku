"use client"

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

export interface HistoryPoint {
    lat: number
    lng: number
    created_at: string
}

interface Props {
    points: HistoryPoint[]
    currentIndex: number
}

export default function LocationHistoryMap({ points, currentIndex }: Props) {
    const mapContainer = useRef<HTMLDivElement>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)
    const markerRef = useRef<maplibregl.Marker | null>(null)

    // Initialise map once
    useEffect(() => {
        if (!mapContainer.current || mapRef.current) return

        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
            center: [0, 0],
            zoom: 2,
        })

        mapRef.current = map

        return () => {
            markerRef.current?.remove()
            markerRef.current = null
            map.remove()
            mapRef.current = null
        }
    }, [])

    // Draw route line and fit bounds whenever points change
    useEffect(() => {
        const map = mapRef.current
        if (!map || points.length === 0) return

        const coordinates: [number, number][] = points.map((p) => [p.lng, p.lat])

        const applyRoute = () => {
            // Remove old layers/sources if they exist
            if (map.getLayer("history-line")) map.removeLayer("history-line")
            if (map.getSource("history-route")) map.removeSource("history-route")

            map.addSource("history-route", {
                type: "geojson",
                data: {
                    type: "Feature",
                    properties: {},
                    geometry: {
                        type: "LineString",
                        coordinates,
                    },
                },
            })

            map.addLayer({
                id: "history-line",
                type: "line",
                source: "history-route",
                layout: { "line-join": "round", "line-cap": "round" },
                paint: { "line-color": "#3b82f6", "line-width": 4 },
            })

            const bounds = new maplibregl.LngLatBounds()
            coordinates.forEach((c) => bounds.extend(c))
            map.fitBounds(bounds, { padding: 50, maxZoom: 15 })

            // Place marker at first point
            const first = coordinates[currentIndex] ?? coordinates[0]
            if (markerRef.current) {
                markerRef.current.setLngLat(first)
            } else {
                const el = document.createElement("div")
                el.style.width = "14px"
                el.style.height = "14px"
                el.style.borderRadius = "50%"
                el.style.backgroundColor = "#ef4444"
                el.style.border = "2px solid #fff"
                el.style.boxShadow = "0 0 4px rgba(0,0,0,0.4)"

                markerRef.current = new maplibregl.Marker({ element: el })
                    .setLngLat(first)
                    .addTo(map)
            }
        }

        if (map.loaded()) {
            applyRoute()
        } else {
            map.once("load", applyRoute)
        }
    }, [points])

    // Update marker position on index change
    useEffect(() => {
        if (!markerRef.current || points.length === 0) return
        const pt = points[currentIndex]
        if (pt) markerRef.current.setLngLat([pt.lng, pt.lat])
    }, [currentIndex, points])

    return <div ref={mapContainer} className="w-full h-full" />
}
