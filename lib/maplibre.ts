import { setWorkerUrl } from "maplibre-gl"

// MapLibre v6 cannot find its worker after Turbopack bundles it, so use the copy
// in public/maplibre. Import maplibre from here so the URL is set first.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")

export * from "maplibre-gl"
