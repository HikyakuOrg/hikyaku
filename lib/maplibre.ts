import { setWorkerUrl } from "maplibre-gl"

// MapLibre v6 can't locate its worker once Turbopack has bundled it, so serve
// the copy that scripts/copy-maplibre-worker.mjs puts in public/maplibre.
// Import maplibre through this module so the URL is set before any map mounts.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")

export * from "maplibre-gl"
