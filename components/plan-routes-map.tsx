"use client"

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { BRAND, DEPOT, STOPS, ROUTE_GEOMETRY } from "@/components/plan-routes-data"

function depotMarker(): HTMLElement {
    const el = document.createElement("div")
    el.style.cssText =
        "width:30px;height:30px;border-radius:9px;background:#0f172a;border:2px solid #fff;" +
        "box-shadow:0 2px 6px rgba(15,23,42,.35);display:flex;align-items:center;justify-content:center;"
    const dot = document.createElement("div")
    dot.style.cssText = "width:9px;height:9px;border-radius:9px;background:#fff;"
    el.appendChild(dot)
    return el
}

function stopMarker(n: number): HTMLElement {
    const el = document.createElement("div")
    el.style.cssText =
        `width:28px;height:28px;border-radius:28px;background:${BRAND};color:#fff;border:2px solid #fff;` +
        "box-shadow:0 2px 6px rgba(15,23,42,.3);display:flex;align-items:center;justify-content:center;" +
        "font:700 13px/1 Inter,system-ui,sans-serif;"
    el.textContent = String(n)
    return el
}

export function PlanRoutesMap() {
    const container = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!container.current) return

        const map = new maplibregl.Map({
            container: container.current,
            style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
            center: DEPOT.coords,
            zoom: 12.5,
            // A showcase map: pannable feel without hijacking page scroll.
            interactive: false,
            attributionControl: { compact: true },
        })

        map.on("load", () => {
            map.addSource("route", {
                type: "geojson",
                data: { type: "Feature", properties: {}, geometry: ROUTE_GEOMETRY },
            })
            map.addLayer({
                id: "route-glow",
                type: "line",
                source: "route",
                layout: { "line-join": "round", "line-cap": "round" },
                paint: { "line-color": BRAND, "line-width": 10, "line-opacity": 0.18 },
            })
            map.addLayer({
                id: "route-line",
                type: "line",
                source: "route",
                layout: { "line-join": "round", "line-cap": "round" },
                paint: { "line-color": BRAND, "line-width": 4 },
            })

            const bounds = new maplibregl.LngLatBounds()
            new maplibregl.Marker({ element: depotMarker(), anchor: "center" })
                .setLngLat(DEPOT.coords)
                .addTo(map)
            bounds.extend(DEPOT.coords)
            STOPS.forEach((s) => {
                new maplibregl.Marker({ element: stopMarker(s.n), anchor: "center" })
                    .setLngLat(s.coords)
                    .addTo(map)
                bounds.extend(s.coords)
            })

            map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 })
        })

        return () => map.remove()
    }, [])

    return <div ref={container} className="absolute inset-0 h-full w-full" aria-label="Optimised courier route through Asakusa, Tokyo" />
}
