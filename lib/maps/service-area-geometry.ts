// Converts EWKT (SRID=4326;POLYGON...) to GeoJSON Polygon feature
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon, Position } from "geojson"

/**
 * Converts a GeoJSON Polygon feature to the EWKT `service_areas.geometry`
 * accepts.
 *
 * The column is `geometry(MultiPolygon,4326)`, so this emits a MULTIPOLYGON
 * with exactly one member rather than a bare POLYGON. PostGIS enforces the
 * column's type during the assignment cast, before any trigger runs, so a
 * POLYGON is rejected outright with "Geometry type (Polygon) does not match
 * column type (MultiPolygon)". Wrapping happens here because the drawing tool
 * produces one polygon per area and there is no multi-part drawing UI, so every
 * write from this app is single-member. Rings within that member (an outer ring
 * plus any holes) are untouched, only nested one level deeper.
 */
export function polygonFeatureToEwkt(feature: Feature<Polygon>) {
    const rings = feature.geometry.coordinates.map(ring => {
        const normalizedRing = [...ring]
        const [firstLng, firstLat] = normalizedRing[0]
        const [lastLng, lastLat] = normalizedRing[normalizedRing.length - 1]
        if (firstLng !== lastLng || firstLat !== lastLat) {
            normalizedRing.push([firstLng, firstLat])
        }
        return `(${normalizedRing.map(([lng, lat]) => `${lng} ${lat}`).join(", ")})`
    })
    return `SRID=4326;MULTIPOLYGON((${rings.join(", ")}))`
}

/** The single-polygon feature the drawing tool round-trips through. */
export type EditableServiceAreaPolygon = Feature<Polygon, { mode: "polygon" }>

/**
 * Outcome of preparing a stored service area for the single-polygon editor.
 *
 * `service_areas.geometry` is a MultiPolygon, so a stored area may legitimately
 * hold several disjoint parts: a suburb plus the island off it, or a zone cut in
 * two by a river. The editor here draws exactly one polygon, so a multi-part
 * area is refused rather than reduced. Reducing it to the largest part (what
 * this used to do) meant that opening such an area and saving it wrote that one
 * part over all of them, with nothing on screen to say the others had gone.
 */
export type EditableServiceAreaGeometry =
    | { status: "editable"; feature: EditableServiceAreaPolygon }
    | { status: "multiple-parts"; partCount: number }
    | { status: "unsupported" }

export function getEditableServiceAreaPolygonFeature(geometry: unknown): EditableServiceAreaGeometry {
    const normalizedGeometry = normalizeServiceAreaGeometry(geometry)

    if (!normalizedGeometry) {
        return { status: "unsupported" }
    }

    if (normalizedGeometry.type === "Polygon") {
        return { status: "editable", feature: toEditablePolygonFeature(normalizedGeometry.coordinates) }
    }

    // Only the member count matters. Rings inside one member are its outer
    // boundary and its holes, not separate parts, so a polygon with holes is
    // still editable. A single-member MultiPolygon is what every write from this
    // app produces, and it unwraps back to the polygon that was drawn.
    if (normalizedGeometry.coordinates.length === 1) {
        return { status: "editable", feature: toEditablePolygonFeature(normalizedGeometry.coordinates[0]) }
    }

    if (normalizedGeometry.coordinates.length === 0) {
        return { status: "unsupported" }
    }

    return { status: "multiple-parts", partCount: normalizedGeometry.coordinates.length }
}

function toEditablePolygonFeature(coordinates: Position[][]): EditableServiceAreaPolygon {
    return {
        type: "Feature",
        geometry: {
            type: "Polygon",
            coordinates,
        },
        properties: {
            mode: "polygon",
        },
    }
}

type ServiceAreaRecord = {
    id: string
    name: string
    geometry: unknown
}

type ServiceAreaGeometry = Polygon | MultiPolygon

type ServiceAreaProperties = {
    id: string
    name: string
}

export type ServiceAreaMapFeature = Feature<ServiceAreaGeometry, ServiceAreaProperties>
export type ServiceAreaFeatureCollection = FeatureCollection<ServiceAreaGeometry, ServiceAreaProperties>
export type ServiceAreaBounds = [[number, number], [number, number]]

export const emptyServiceAreaFeatureCollection: ServiceAreaFeatureCollection = {
    type: "FeatureCollection",
    features: [],
}

export function createServiceAreaFeatureCollection(serviceAreas: ServiceAreaRecord[]): ServiceAreaFeatureCollection {
    return {
        type: "FeatureCollection",
        features: serviceAreas.flatMap((serviceArea) => {
            const geometry = normalizeServiceAreaGeometry(serviceArea.geometry)

            if (!geometry) {
                return []
            }

            return [{
                type: "Feature",
                geometry,
                properties: {
                    id: serviceArea.id,
                    name: serviceArea.name,
                },
            }]
        }),
    }
}

export function getServiceAreaFeatureCollectionBounds(featureCollection: ServiceAreaFeatureCollection): ServiceAreaBounds | null {
    let minLng = Number.POSITIVE_INFINITY
    let minLat = Number.POSITIVE_INFINITY
    let maxLng = Number.NEGATIVE_INFINITY
    let maxLat = Number.NEGATIVE_INFINITY

    const visitRing = (ring: Position[]) => {
        for (const coordinate of ring) {
            const [lng, lat] = coordinate
            minLng = Math.min(minLng, lng)
            maxLng = Math.max(maxLng, lng)
            minLat = Math.min(minLat, lat)
            maxLat = Math.max(maxLat, lat)
        }
    }

    for (const feature of featureCollection.features) {
        if (feature.geometry.type === "Polygon") {
            feature.geometry.coordinates.forEach(visitRing)
            continue
        }

        feature.geometry.coordinates.forEach((polygon) => {
            polygon.forEach(visitRing)
        })
    }

    if (!Number.isFinite(minLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLng) || !Number.isFinite(maxLat)) {
        return null
    }

    return [
        [minLng, minLat],
        [maxLng, maxLat],
    ]
}

function normalizeServiceAreaGeometry(geometry: unknown): ServiceAreaGeometry | null {
    if (typeof geometry === "string") {
        return parseGeometryText(geometry)
    }

    if (!geometry || typeof geometry !== "object") {
        return null
    }

    if (isFeatureCollection(geometry)) {
        for (const feature of geometry.features) {
            const normalizedGeometry = normalizeServiceAreaGeometry(feature)

            if (normalizedGeometry) {
                return normalizedGeometry
            }
        }

        return null
    }

    if (isFeature(geometry)) {
        return normalizeServiceAreaGeometry(geometry.geometry)
    }

    if (isPolygonGeometry(geometry) || isMultiPolygonGeometry(geometry)) {
        return geometry
    }

    if ("geometry" in geometry) {
        return normalizeServiceAreaGeometry((geometry as { geometry?: unknown }).geometry)
    }

    return null
}

function parseGeometryText(value: string): ServiceAreaGeometry | null {
    const normalizedValue = value.trim().replace(/^SRID=\d+;/i, "").trim()
    const uppercaseValue = normalizedValue.toUpperCase()

    if (uppercaseValue.startsWith("POLYGON")) {
        return parsePolygonText(normalizedValue)
    }

    if (uppercaseValue.startsWith("MULTIPOLYGON")) {
        return parseMultiPolygonText(normalizedValue)
    }

    return null
}

function parsePolygonText(value: string): Polygon | null {
    const content = extractWrappedContent(value)

    if (!content) {
        return null
    }

    const coordinates = splitTopLevelGroups(content)
        .map(parseRing)
        .filter((ring): ring is Position[] => ring !== null)

    if (coordinates.length === 0) {
        return null
    }

    return {
        type: "Polygon",
        coordinates,
    }
}

function parseMultiPolygonText(value: string): MultiPolygon | null {
    const content = extractWrappedContent(value)

    if (!content) {
        return null
    }

    const coordinates = splitTopLevelGroups(content)
        .map((polygonText) => {
            const polygonCoordinates = splitTopLevelGroups(polygonText)
                .map(parseRing)
                .filter((ring): ring is Position[] => ring !== null)

            return polygonCoordinates.length > 0 ? polygonCoordinates : null
        })
        .filter((polygon): polygon is Position[][] => polygon !== null)

    if (coordinates.length === 0) {
        return null
    }

    return {
        type: "MultiPolygon",
        coordinates,
    }
}

function parseRing(value: string): Position[] | null {
    const coordinates = value
        .split(",")
        .map((coordinateText) => parsePosition(coordinateText))
        .filter((coordinate): coordinate is Position => coordinate !== null)

    if (coordinates.length < 3) {
        return null
    }

    const [firstLng, firstLat] = coordinates[0]
    const [lastLng, lastLat] = coordinates[coordinates.length - 1]

    if (firstLng !== lastLng || firstLat !== lastLat) {
        coordinates.push([firstLng, firstLat])
    }

    return coordinates
}

function parsePosition(value: string): Position | null {
    const parts = value.trim().split(/\s+/)

    if (parts.length < 2) {
        return null
    }

    const lng = Number(parts[0])
    const lat = Number(parts[1])

    if (Number.isNaN(lng) || Number.isNaN(lat)) {
        return null
    }

    return [lng, lat]
}

function extractWrappedContent(value: string): string | null {
    const firstParenthesis = value.indexOf("(")
    const lastParenthesis = value.lastIndexOf(")")

    if (firstParenthesis === -1 || lastParenthesis === -1 || lastParenthesis <= firstParenthesis) {
        return null
    }

    return value.slice(firstParenthesis + 1, lastParenthesis)
}

function splitTopLevelGroups(value: string): string[] {
    const groups: string[] = []
    let depth = 0
    let current = ""

    for (const character of value) {
        if (character === "(") {
            if (depth > 0) {
                current += character
            }

            depth += 1
            continue
        }

        if (character === ")") {
            depth -= 1

            if (depth > 0) {
                current += character
                continue
            }

            if (current.trim()) {
                groups.push(current.trim())
            }

            current = ""
            continue
        }

        if (character === "," && depth === 0) {
            continue
        }

        if (depth > 0 || character.trim()) {
            current += character
        }
    }

    return groups
}

function isFeature(value: unknown): value is Feature {
    return typeof value === "object"
        && value !== null
        && "type" in value
        && (value as { type?: unknown }).type === "Feature"
        && "geometry" in value
}

function isFeatureCollection(value: unknown): value is FeatureCollection {
    return typeof value === "object"
        && value !== null
        && "type" in value
        && (value as { type?: unknown }).type === "FeatureCollection"
        && "features" in value
        && Array.isArray((value as { features?: unknown }).features)
}

function isPolygonGeometry(value: unknown): value is Polygon {
    return isGeometryOfType(value, "Polygon")
}

function isMultiPolygonGeometry(value: unknown): value is MultiPolygon {
    return isGeometryOfType(value, "MultiPolygon")
}

function isGeometryOfType<TGeometry extends Geometry>(value: unknown, type: TGeometry["type"]): value is TGeometry {
    return typeof value === "object"
        && value !== null
        && "type" in value
        && (value as { type?: unknown }).type === type
        && "coordinates" in value
}