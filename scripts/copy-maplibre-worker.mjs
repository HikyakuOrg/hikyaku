#!/usr/bin/env node
// Copies the MapLibre GL v6 worker into public/maplibre so the browser can load
// it from a stable same-origin URL (see lib/maplibre.ts).
//
// Why this exists: v6 is ESM-only and finds its worker via import.meta.url,
// which Turbopack rewrites to a bundled chunk. The worker then 404s and maps
// mount without ever loading tiles. The worker imports maplibre-gl-shared.mjs
// by relative path, so both files have to land in the same directory.
//
// Runs before `dev` and `build` so it always matches the installed version.

import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const dist = path.join(path.dirname(createRequire(import.meta.url).resolve("maplibre-gl/package.json")), "dist");
const dest = path.join(process.cwd(), "public", "maplibre");

mkdirSync(dest, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
    copyFileSync(path.join(dist, file), path.join(dest, file));
}
