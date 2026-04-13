"use client"

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"


const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

export default function MapView(mapOptions: maplibregl.MapOptions) {

    const mapContainer = useRef<HTMLDivElement>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)

    useEffect(() => {
        if (!mapContainer.current || mapRef.current) return

        const map = new maplibregl.Map({
            ...mapOptions,
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