"use client"

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"


const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

export default function MapView(mapOptions: maplibregl.MapOptions) {

    const mapContainer = useRef<HTMLDivElement>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)
    // Construction-time options only: the map is built once and later prop changes
    // are not meant to rebuild it, so the initial value is captured in a ref.
    const initialMapOptions = useRef(mapOptions)

    useEffect(() => {
        if (!mapContainer.current || mapRef.current) return

        const map = new maplibregl.Map({
            ...initialMapOptions.current,
            container: mapContainer.current,
            style: MAP_STYLE,
        })

        mapRef.current = map

        return () => map.remove()
    }, [])


    return (
        <div
            ref={mapContainer}
            className="w-full h-[500px] rounded-md border"
        />
    )
}