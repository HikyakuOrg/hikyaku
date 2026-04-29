import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon, Position } from "geojson"

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