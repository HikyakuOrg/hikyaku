
// Ambient global: this file has no imports/exports, so `Point` is available
// project-wide without an import. ESLint cannot see those cross-file uses.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Point {
    // Literal, not `string`, so a Point is assignable to the generated GeoJSON
    // DTOs (e.g. CustomerLocationDto) which pin this to "Point".
    type: "Point"
    // lng, lat
    coordinates: [number, number]
}