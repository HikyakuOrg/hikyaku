"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"

import { emptyServiceAreaFeatureCollection, type ServiceAreaBounds, type ServiceAreaFeatureCollection } from "@/lib/maps/service-area-geometry"

import { getVisibleServiceAreas } from "./actions"

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
const DEFAULT_CENTER: [number, number] = [144.9631, -37.8136]
const SOURCE_ID = "service-areas"
const FILL_LAYER_ID = "service-areas-fill"
const OUTLINE_LAYER_ID = "service-areas-outline"
const FETCH_DEBOUNCE_MS = 150

type ServiceAreasMapProps = {
    initialBounds: ServiceAreaBounds | null
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

export function ServiceAreasMap({ initialBounds }: ServiceAreasMapProps) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const latestFeatureCollectionRef = useRef<ServiceAreaFeatureCollection>(emptyServiceAreaFeatureCollection)
    const latestBoundsKeyRef = useRef<string | null>(null)
    const requestSequenceRef = useRef(0)
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [hasLoaded, setHasLoaded] = useState(false)
    const [hasError, setHasError] = useState(false)
    const [visibleFeatureCount, setVisibleFeatureCount] = useState(0)

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

        const updateMapData = (featureCollection: ServiceAreaFeatureCollection) => {
            latestFeatureCollectionRef.current = featureCollection

            const source = map.getSource(SOURCE_ID)
            if (!source || !(source instanceof maplibregl.GeoJSONSource)) {
                return
            }

            source.setData(featureCollection)
        }

        const fetchVisibleServiceAreas = async () => {
            const mapBounds = map.getBounds()
            if (!mapBounds) {
                return
            }

            const bounds = {
                minLng: mapBounds.getWest(),
                minLat: mapBounds.getSouth(),
                maxLng: mapBounds.getEast(),
                maxLat: mapBounds.getNorth(),
            }

            const boundsKey = createBoundsKey(bounds)

            if (latestBoundsKeyRef.current === boundsKey) {
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
                updateMapData(nextFeatureCollection)
                setVisibleFeatureCount(nextFeatureCollection.features.length)
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
        }

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

            if (initialBounds) {
                map.fitBounds(initialBounds, {
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

            map.on("click", FILL_LAYER_ID, (event) => {
                const clickedFeature = event.features?.[0]
                const id = clickedFeature?.properties?.id
                if (typeof id === "string") {
                    router.push(`/dashboard/service/areas/edit/${id}`)
                }
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
        }
    }, [initialBounds, router])

    if (!initialBounds) {
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
        <div className="relative h-[560px] w-full overflow-hidden rounded-xl border bg-muted/20">
            <div
                ref={mapContainerRef}
                className="h-full w-full"
            />

            {(isLoading || hasError || (hasLoaded && visibleFeatureCount === 0)) ? (
                <div className="pointer-events-none absolute left-4 top-4 rounded-md border bg-background/95 px-3 py-2 text-sm shadow-sm backdrop-blur">
                    {isLoading ? "Loading visible service areas..." : null}
                    {hasError ? "Unable to load service areas for this view." : null}
                    {!isLoading && !hasError && hasLoaded && visibleFeatureCount === 0
                        ? "No service areas in this view."
                        : null}
                </div>
            ) : null}
        </div>
    )
}