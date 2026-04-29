// Converts EWKT (SRID=4326;POLYGON...) to GeoJSON Polygon feature
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon, Position } from "geojson"

// Converts GeoJSON Polygon feature to EWKT
export function polygonFeatureToEwkt(feature: Feature<Polygon, any>) {
    const rings = feature.geometry.coordinates.map(ring => {
        const normalizedRing = [...ring]
        const [firstLng, firstLat] = normalizedRing[0]
        const [lastLng, lastLat] = normalizedRing[normalizedRing.length - 1]
        if (firstLng !== lastLng || firstLat !== lastLat) {
            normalizedRing.push([firstLng, firstLat])
        }
        return `(${normalizedRing.map(([lng, lat]) => `${lng} ${lat}`).join(", ")})`
    })
    return `SRID=4326;POLYGON(${rings.join(", ")})`
}

export function getEditableServiceAreaPolygonFeature(geometry: unknown): Feature<Polygon, { mode: "polygon" }> | null {
    const normalizedGeometry = normalizeServiceAreaGeometry(geometry)

    if (!normalizedGeometry) {
        return null
    }

    if (normalizedGeometry.type === "Polygon") {
        return {
            type: "Feature",
            geometry: normalizedGeometry,
            properties: {
                mode: "polygon",
            },
        }
    }

    const largestPolygon = normalizedGeometry.coordinates.reduce((largest, polygon) => {
        return getPolygonRingArea(polygon[0]) > getPolygonRingArea(largest[0]) ? polygon : largest
    })

    return {
        type: "Feature",
        geometry: {
            type: "Polygon",
            coordinates: largestPolygon,
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

export function isPointWithinServiceAreas(
    serviceAreas: Array<{ geometry: unknown }>,
    point: [number, number],
) {
    return serviceAreas.some((serviceArea) => {
        const geometry = normalizeServiceAreaGeometry(serviceArea.geometry)

        if (!geometry) {
            return false
        }

        if (geometry.type === "Polygon") {
            return isPointWithinPolygonGeometry(geometry.coordinates, point)
        }

        return geometry.coordinates.some((polygonCoordinates) => {
            return isPointWithinPolygonGeometry(polygonCoordinates, point)
        })
    })
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

function isPointWithinPolygonGeometry(
    polygonCoordinates: Position[][],
    point: [number, number],
) {
    const [outerRing, ...holes] = polygonCoordinates

    if (!outerRing || !isPointInRing(outerRing, point)) {
        return false
    }

    return !holes.some((hole) => isPointInRing(hole, point))
}

function isPointInRing(ring: Position[], point: [number, number]) {
    if (ring.length < 3) {
        return false
    }

    for (let index = 0; index < ring.length - 1; index += 1) {
        if (isPointOnSegment(ring[index], ring[index + 1], point)) {
            return true
        }
    }

    const [pointLng, pointLat] = point
    let isInside = false

    for (
        let currentIndex = 0, previousIndex = ring.length - 1;
        currentIndex < ring.length;
        previousIndex = currentIndex, currentIndex += 1
    ) {
        const [currentLng, currentLat] = ring[currentIndex]
        const [previousLng, previousLat] = ring[previousIndex]

        const intersects = ((currentLat > pointLat) !== (previousLat > pointLat))
            && (pointLng < ((previousLng - currentLng) * (pointLat - currentLat)) / (previousLat - currentLat) + currentLng)

        if (intersects) {
            isInside = !isInside
        }
    }

    return isInside
}

function isPointOnSegment(start: Position, end: Position, point: [number, number]) {
    const epsilon = 1e-9
    const [startLng, startLat] = start
    const [endLng, endLat] = end
    const [pointLng, pointLat] = point

    const crossProduct = (pointLat - startLat) * (endLng - startLng)
        - (pointLng - startLng) * (endLat - startLat)

    if (Math.abs(crossProduct) > epsilon) {
        return false
    }

    const dotProduct = (pointLng - startLng) * (endLng - startLng)
        + (pointLat - startLat) * (endLat - startLat)

    if (dotProduct < -epsilon) {
        return false
    }

    const squaredLength = (endLng - startLng) ** 2 + (endLat - startLat) ** 2

    if (dotProduct - squaredLength > epsilon) {
        return false
    }

    return true
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

function getPolygonRingArea(ring: Position[]) {
    let area = 0

    for (let index = 0; index < ring.length - 1; index += 1) {
        const [currentLng, currentLat] = ring[index]
        const [nextLng, nextLat] = ring[index + 1]
        area += currentLng * nextLat - nextLng * currentLat
    }

    return Math.abs(area / 2)
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