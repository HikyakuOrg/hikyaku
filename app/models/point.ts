
// Ambient global: this file has no imports/exports, so `Point` is available
// project-wide without an import. ESLint cannot see those cross-file uses.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Point {
    type: string
    // lng, lat
    coordinates: [number, number]
}