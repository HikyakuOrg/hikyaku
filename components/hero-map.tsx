"use client"

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

// [lng, lat] — coordinates provided as [lat, lng] in the request, converted here
const START: [number, number] = [139.77375703568816, 35.66397701159627]
const END: [number, number] = [139.77836909229316, 35.695125899559336]

const CENTER_LNG = (START[0] + END[0]) / 2
const CENTER_LAT = (START[1] + END[1]) / 2

const ROUTE_LINE_STRING = `{"type":"Feature","geometry":{"coordinates":[[139.7737674,35.6639678],[139.77392740000002,35.6640875],[139.7742164,35.6638259],[139.7737143,35.663450999999995],[139.7729574,35.6641312],[139.7715264,35.6655684],[139.7705662,35.6665518],[139.7696473,35.6673281],[139.7686412,35.6681536],[139.7679315,35.6675768],[139.7678756,35.6674144],[139.76781929999999,35.6671109],[139.76725779999998,35.667614799999996],[139.7683719,35.6685507],[139.76851040000003,35.668643599999996],[139.7697613,35.6696902],[139.7698878,35.6696978],[139.770622,35.6702673],[139.7711684,35.670769799999995],[139.7716069,35.671200299999995],[139.7716912,35.671234],[139.7718768,35.671506199999996],[139.7723322,35.6728715],[139.7724697,35.6732267],[139.7725688,35.6736085],[139.772632,35.6745206],[139.7726735,35.674631],[139.7736496,35.676211099999996],[139.77417509999998,35.6770226],[139.7748758,35.6781538],[139.7756882,35.6794295],[139.7763743,35.6805942],[139.7768278,35.6813844],[139.77731,35.6821747],[139.7781267,35.683391199999996],[139.7783063,35.683668499999996],[139.7783455,35.6838917],[139.7783168,35.6840492],[139.7782391,35.6841971],[139.7780722,35.684351299999996],[139.7779291,35.6844246],[139.7772614,35.684591399999995],[139.7771004,35.6846625],[139.7769401,35.6847822],[139.7768097,35.684970799999995],[139.77674729999998,35.6851791],[139.7766497,35.686437999999995],[139.7766888,35.6864968],[139.7766945,35.6869437],[139.7766656,35.6871279],[139.7762162,35.6881975],[139.7752221,35.6905314],[139.7750581,35.690763],[139.7749804,35.690809],[139.7746579,35.6916702],[139.77466809999999,35.6918621],[139.77499310000002,35.694189699999995],[139.77571179999998,35.694404],[139.7783705,35.6951083]],"type":"LineString"},"properties":{"origin":["35.66397701159627","139.77375703568816"],"destination":["35.695125899559336","139.77836909229316"]}}`

// Parse the real route coordinates from the linestring ([lng, lat] pairs)
const ROUTE_COORDS: [number, number][] = JSON.parse(ROUTE_LINE_STRING).geometry.coordinates as [number, number][]

// Precompute cumulative planar distances for proportional interpolation
const CUMULATIVE_DISTS: number[] = (() => {
    const d = [0]
    for (let i = 1; i < ROUTE_COORDS.length; i++) {
        const dx = ROUTE_COORDS[i][0] - ROUTE_COORDS[i - 1][0]
        const dy = ROUTE_COORDS[i][1] - ROUTE_COORDS[i - 1][1]
        d.push(d[i - 1] + Math.sqrt(dx * dx + dy * dy))
    }
    return d
})()
const TOTAL_DIST = CUMULATIVE_DISTS[CUMULATIVE_DISTS.length - 1]

/** Returns the position at proportion t ∈ [0, 1] along the route */
function getPositionAtT(t: number): { lng: number; lat: number } {
    const target = t * TOTAL_DIST
    let i = 0
    while (i < CUMULATIVE_DISTS.length - 2 && CUMULATIVE_DISTS[i + 1] < target) i++
    const a = ROUTE_COORDS[i]
    const b = ROUTE_COORDS[Math.min(i + 1, ROUTE_COORDS.length - 1)]
    const segLen = CUMULATIVE_DISTS[i + 1] - CUMULATIVE_DISTS[i]
    const segT = segLen > 0 ? (target - CUMULATIVE_DISTS[i]) / segLen : 0
    return {
        lng: a[0] + (b[0] - a[0]) * segT,
        lat: a[1] + (b[1] - a[1]) * segT,
    }
}

const ROUTE_DURATION_MS = 10_000 // 10 s per loop

export function HeroMap() {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!containerRef.current) return

        const map = new maplibregl.Map({
            container: containerRef.current,
            style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
            center: [CENTER_LNG, CENTER_LAT],
            zoom: 13,
            interactive: false,
            attributionControl: false,
        })

        let animFrame: number
        let startTime: number | null = null

        map.on("style.load", () => {
            // ── route linestring ──────────────────────────────────────
            map.addSource("route", {
                type: "geojson",
                data: {
                    type: "Feature",
                    properties: {},
                    geometry: JSON.parse(ROUTE_LINE_STRING).geometry,
                },
            })

            // soft amber glow behind the line
            map.addLayer({
                id: "route-glow",
                type: "line",
                source: "route",
                layout: { "line-join": "round", "line-cap": "round" },
                paint: {
                    "line-color": "#3b82f6",
                    "line-width": 10,
                    "line-opacity": 0.2,
                },
            })

            // solid amber line
            map.addLayer({
                id: "route-line",
                type: "line",
                source: "route",
                layout: { "line-join": "round", "line-cap": "round" },
                paint: {
                    "line-color": "#3b82f6",
                    "line-width": 3,
                },
            })

            // ── dot position source + circle layer ────────────────────
            const initialPos = getPositionAtT(0)
            map.addSource("marker-pos", {
                type: "geojson",
                data: {
                    type: "Feature",
                    properties: {},
                    geometry: { type: "Point", coordinates: [initialPos.lng, initialPos.lat] },
                },
            })

            map.addLayer({
                id: "marker-layer",
                type: "circle",
                source: "marker-pos",
                paint: {
                    "circle-radius": 7,
                    "circle-color": "#3b82f6",
                    "circle-stroke-width": 2,
                    "circle-stroke-color": "#fff",
                },
            })

            // ── animate dot position along the route ──────────────────
            function animate(time: number) {
                if (startTime === null) startTime = time
                const t = ((time - startTime) % ROUTE_DURATION_MS) / ROUTE_DURATION_MS
                const pos = getPositionAtT(t)
                    ; (map.getSource("marker-pos") as maplibregl.GeoJSONSource).setData({
                        type: "Feature",
                        properties: {},
                        geometry: { type: "Point", coordinates: [pos.lng, pos.lat] },
                    })
                animFrame = requestAnimationFrame(animate)
            }
            animFrame = requestAnimationFrame(animate)
        })

        return () => {
            cancelAnimationFrame(animFrame)
            map.remove()
        }
    }, [])

    return <div ref={containerRef} className="h-full w-full" aria-hidden />
}
