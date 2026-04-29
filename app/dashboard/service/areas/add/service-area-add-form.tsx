"use client"

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react"
import maplibregl, { LngLatBoundsLike } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import {
    TerraDraw,
    TerraDrawPolygonMode,
    TerraDrawSelectMode,
} from "terra-draw"
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter"
import { PostgrestError } from "@supabase/supabase-js"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createServiceArea } from "@/lib/supabase/db"

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
const MELBOURNE_CENTER: [number, number] = [144.9436365307524, -37.81073062548168]
const UPLOAD_SOURCE_ID = "service-area-upload-lines"
const UPLOAD_LAYER_ID = "service-area-upload-lines-layer"

type TerraDrawInstance = TerraDraw
type PolygonProperties = Record<string, unknown> & {
    mode: "polygon"
}

type PolygonFeature = GeoJSON.Feature<GeoJSON.Polygon, PolygonProperties>

type DataSubmission = {
    name: string
    polygon: PolygonFeature
}

type SupportedGeometry =
    | GeoJSON.LineString
    | GeoJSON.MultiLineString
    | GeoJSON.Polygon
    | GeoJSON.MultiPolygon
    | GeoJSON.GeometryCollection

function roundCoordinate(value: number, decimalPlaces = 6) {
    return Number(value.toFixed(decimalPlaces))
}

function normalizePolygonPrecision(feature: PolygonFeature, decimalPlaces = 6): PolygonFeature {
    return {
        ...feature,
        geometry: {
            ...feature.geometry,
            coordinates: feature.geometry.coordinates.map((ring) =>
                ring.map(([lng, lat]) => [
                    roundCoordinate(lng, decimalPlaces),
                    roundCoordinate(lat, decimalPlaces),
                ])
            ),
        },
    }
}

function getRingArea(ring: GeoJSON.Position[]) {
    let area = 0

    for (let index = 0; index < ring.length - 1; index += 1) {
        const [currentLng, currentLat] = ring[index]
        const [nextLng, nextLat] = ring[index + 1]
        area += currentLng * nextLat - nextLng * currentLat
    }

    return Math.abs(area / 2)
}

function extractPolygonFeatures(input: GeoJSON.GeoJSON): PolygonFeature[] {
    const polygonFeatures: PolygonFeature[] = []

    const appendGeometry = (geometry: GeoJSON.Geometry, properties: GeoJSON.GeoJsonProperties = {}) => {
        switch (geometry.type) {
            case "Polygon":
                polygonFeatures.push(normalizePolygonPrecision({
                    type: "Feature",
                    geometry,
                    properties: {
                        ...properties,
                        mode: "polygon",
                    },
                }))
                break
            case "MultiPolygon":
                for (const coordinates of geometry.coordinates) {
                    polygonFeatures.push(normalizePolygonPrecision({
                        type: "Feature",
                        geometry: {
                            type: "Polygon",
                            coordinates,
                        },
                        properties: {
                            ...properties,
                            mode: "polygon",
                        },
                    }))
                }
                break
            case "GeometryCollection":
                for (const child of geometry.geometries) {
                    appendGeometry(child, properties)
                }
                break
        }
    }

    switch (input.type) {
        case "FeatureCollection":
            for (const feature of input.features) {
                appendGeometry(feature.geometry, feature.properties ?? {})
            }
            break
        case "Feature":
            appendGeometry(input.geometry, input.properties ?? {})
            break
        default:
            appendGeometry(input)
            break
    }

    return polygonFeatures
}

function getLargestPolygonFeature(features: PolygonFeature[]) {
    return features.reduce<PolygonFeature | null>((largest, feature) => {
        if (!largest) {
            return feature
        }

        return getRingArea(feature.geometry.coordinates[0]) > getRingArea(largest.geometry.coordinates[0])
            ? feature
            : largest
    }, null)
}

function polygonFeatureToEwkt(feature: PolygonFeature) {
    const rings = feature.geometry.coordinates.map((ring) => {
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

function isPolygonFeature(feature: GeoJSON.Feature): feature is PolygonFeature {
    const properties = feature.properties ?? {}

    return feature.geometry.type === "Polygon"
        && properties.mode === "polygon"
        && !properties.midPoint
        && !properties.selectionPoint
        && !properties.closingPoint
        && !properties.snappingPoint
}

function getPolygonBounds(feature: PolygonFeature): LngLatBoundsLike {
    const coordinates = feature.geometry.coordinates[0]
    let minLng = coordinates[0][0]
    let maxLng = coordinates[0][0]
    let minLat = coordinates[0][1]
    let maxLat = coordinates[0][1]

    for (const [lng, lat] of coordinates) {
        minLng = Math.min(minLng, lng)
        maxLng = Math.max(maxLng, lng)
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
    }

    return [
        [minLng, minLat],
        [maxLng, maxLat],
    ]
}

function getFeatureBounds(features: GeoJSON.Feature[]): LngLatBoundsLike | null {
    let minLng = Number.POSITIVE_INFINITY
    let minLat = Number.POSITIVE_INFINITY
    let maxLng = Number.NEGATIVE_INFINITY
    let maxLat = Number.NEGATIVE_INFINITY

    const visitGeometry = (geometry: GeoJSON.Geometry) => {
        switch (geometry.type) {
            case "Point": {
                const [lng, lat] = geometry.coordinates
                minLng = Math.min(minLng, lng)
                maxLng = Math.max(maxLng, lng)
                minLat = Math.min(minLat, lat)
                maxLat = Math.max(maxLat, lat)
                break
            }
            case "MultiPoint":
            case "LineString": {
                for (const [lng, lat] of geometry.coordinates) {
                    minLng = Math.min(minLng, lng)
                    maxLng = Math.max(maxLng, lng)
                    minLat = Math.min(minLat, lat)
                    maxLat = Math.max(maxLat, lat)
                }
                break
            }
            case "MultiLineString":
            case "Polygon": {
                for (const ring of geometry.coordinates) {
                    for (const [lng, lat] of ring) {
                        minLng = Math.min(minLng, lng)
                        maxLng = Math.max(maxLng, lng)
                        minLat = Math.min(minLat, lat)
                        maxLat = Math.max(maxLat, lat)
                    }
                }
                break
            }
            case "MultiPolygon": {
                for (const polygon of geometry.coordinates) {
                    for (const ring of polygon) {
                        for (const [lng, lat] of ring) {
                            minLng = Math.min(minLng, lng)
                            maxLng = Math.max(maxLng, lng)
                            minLat = Math.min(minLat, lat)
                            maxLat = Math.max(maxLat, lat)
                        }
                    }
                }
                break
            }
            case "GeometryCollection": {
                for (const child of geometry.geometries) {
                    visitGeometry(child)
                }
                break
            }
        }
    }

    for (const feature of features) {
        visitGeometry(feature.geometry)
    }

    if (!Number.isFinite(minLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLng) || !Number.isFinite(maxLat)) {
        return null
    }

    return [
        [minLng, minLat],
        [maxLng, maxLat],
    ]
}

function supportedGeometryToLineFeatures(geometry: SupportedGeometry, properties: GeoJSON.GeoJsonProperties): GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>[] {
    switch (geometry.type) {
        case "LineString":
        case "MultiLineString":
            return [{ type: "Feature", geometry, properties }]
        case "Polygon":
            return geometry.coordinates.map((ring) => ({
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: ring,
                },
                properties,
            }))
        case "MultiPolygon":
            return geometry.coordinates.flatMap((polygon) =>
                polygon.map((ring) => ({
                    type: "Feature",
                    geometry: {
                        type: "LineString",
                        coordinates: ring,
                    },
                    properties,
                }))
            )
        case "GeometryCollection":
            return geometry.geometries.flatMap((child) => {
                if (
                    child.type === "LineString"
                    || child.type === "MultiLineString"
                    || child.type === "Polygon"
                    || child.type === "MultiPolygon"
                    || child.type === "GeometryCollection"
                ) {
                    return supportedGeometryToLineFeatures(child, properties)
                }

                return []
            })
    }
}

function geoJsonToLineFeatureCollection(input: GeoJSON.GeoJSON): GeoJSON.FeatureCollection<GeoJSON.LineString | GeoJSON.MultiLineString> {
    const lineFeatures: GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>[] = []

    const appendGeometry = (geometry: GeoJSON.Geometry, properties: GeoJSON.GeoJsonProperties = {}) => {
        if (
            geometry.type === "LineString"
            || geometry.type === "MultiLineString"
            || geometry.type === "Polygon"
            || geometry.type === "MultiPolygon"
            || geometry.type === "GeometryCollection"
        ) {
            lineFeatures.push(...supportedGeometryToLineFeatures(geometry, properties))
        }
    }

    switch (input.type) {
        case "FeatureCollection":
            for (const feature of input.features) {
                appendGeometry(feature.geometry, feature.properties ?? {})
            }
            break
        case "Feature":
            appendGeometry(input.geometry, input.properties ?? {})
            break
        default:
            appendGeometry(input)
            break
    }

    return {
        type: "FeatureCollection",
        features: lineFeatures,
    }
}

export function ServiceAreaAddForm() {
    const [name, setName] = useState("")
    const [polygon, setPolygon] = useState<PolygonFeature | null>(null)
    const [mapReady, setMapReady] = useState(false)
    const [activeMode, setActiveMode] = useState<"polygon" | "select">("polygon")
    const [lastSubmission, setLastSubmission] = useState<DataSubmission | null>(null)
    const [uploadedGeoJsonName, setUploadedGeoJsonName] = useState<string | null>(null)
    const [confirmUploadOpen, setConfirmUploadOpen] = useState(false)
    const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const mapContainerRef = useRef<HTMLDivElement | null>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)
    const drawRef = useRef<TerraDrawInstance | null>(null)
    const uploadInputRef = useRef<HTMLInputElement | null>(null)
    const syncingRef = useRef(false)

    const canSubmit = useMemo(() => name.trim().length > 0 && polygon !== null, [name, polygon])
    const drawingLocked = uploadedGeoJsonName !== null

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) {
            return
        }

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: MAP_STYLE,
            center: MELBOURNE_CENTER,
            zoom: 10,
        })

        mapRef.current = map

        const syncPolygonState = () => {
            if (!drawRef.current || syncingRef.current) {
                return
            }

            const snapshot = drawRef.current.getSnapshot()
            const polygonFeatures = snapshot.filter(isPolygonFeature) as PolygonFeature[]

            if (polygonFeatures.length > 1) {
                syncingRef.current = true
                const newest = polygonFeatures[polygonFeatures.length - 1]
                const staleIds = polygonFeatures
                    .slice(0, -1)
                    .map((feature) => feature.id)
                    .filter((id): id is string => typeof id === "string")

                if (staleIds.length > 0) {
                    drawRef.current.removeFeatures(staleIds)
                }

                setPolygon(newest)
                syncingRef.current = false
                return
            }

            setPolygon(polygonFeatures[0] ?? null)
        }

        const handleStyleLoad = () => {
            const draw = new TerraDraw({
                adapter: new TerraDrawMapLibreGLAdapter({
                    map,
                }),
                modes: [
                    new TerraDrawPolygonMode({
                        editable: true,
                        showCoordinatePoints: true,
                    }),
                    new TerraDrawSelectMode({
                        flags: {
                            polygon: {
                                feature: {
                                    draggable: true,
                                    coordinates: {
                                        draggable: true,
                                        deletable: true,
                                        midpoints: true,
                                    },
                                },
                            },
                        },
                    }),
                ],
            })

            draw.start()
            draw.setMode("polygon")
            draw.on("change", syncPolygonState)
            draw.on("finish", syncPolygonState)

            map.addSource(UPLOAD_SOURCE_ID, {
                type: "geojson",
                data: {
                    type: "FeatureCollection",
                    features: [],
                },
            })

            map.addLayer({
                id: UPLOAD_LAYER_ID,
                type: "line",
                source: UPLOAD_SOURCE_ID,
                paint: {
                    "line-color": "#0f766e",
                    "line-width": 2,
                    "line-opacity": 0.9,
                },
                layout: {
                    "line-cap": "round",
                    "line-join": "round",
                },
            })

            drawRef.current = draw
            setMapReady(true)
        }

        map.on("style.load", handleStyleLoad)

        return () => {
            if (drawRef.current) {
                ; (drawRef.current as { stop?: () => void }).stop?.()
                drawRef.current = null
            }

            map.remove()
            mapRef.current = null
            setMapReady(false)
        }
    }, [])

    useEffect(() => {
        if (!polygon || !mapRef.current) {
            return
        }

        mapRef.current.fitBounds(getPolygonBounds(polygon), {
            padding: 40,
            maxZoom: 13,
            duration: 0,
        })
    }, [polygon])

    const switchMode = (mode: "polygon" | "select") => {
        if (!drawRef.current) {
            return
        }

        if (mode === "polygon" && drawingLocked) {
            return
        }

        drawRef.current.setMode(mode)
        setActiveMode(mode)
    }

    const processGeoJsonUpload = async (file: File, options?: { clearDrawnArea?: boolean }) => {
        if (!mapRef.current || !drawRef.current) {
            return
        }

        try {
            const rawText = await file.text()
            const parsed = JSON.parse(rawText) as GeoJSON.GeoJSON
            const lineCollection = geoJsonToLineFeatureCollection(parsed)
            const polygonFeatures = extractPolygonFeatures(parsed)
            const uploadedPolygon = getLargestPolygonFeature(polygonFeatures)

            if (lineCollection.features.length === 0) {
                toast.error("The uploaded GeoJSON did not contain any line or polygon geometry to display.")
                return
            }

            const source = mapRef.current.getSource(UPLOAD_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
            if (!source) {
                toast.error("Map upload layer is not ready yet.")
                return
            }

            if (options?.clearDrawnArea) {
                drawRef.current.clear()
                setPolygon(null)
            }

            if (uploadedPolygon) {
                drawRef.current.clear()

                const featuresToAdd = [uploadedPolygon] as Parameters<TerraDrawInstance["addFeatures"]>[0]
                const [result] = drawRef.current.addFeatures(featuresToAdd)
                if (!result?.valid) {
                    toast.error(result?.reason ? `Failed to load the uploaded GeoJSON area: ${result.reason}` : "Failed to load the uploaded GeoJSON area.")
                    return
                }

                const snapshot = drawRef.current.getSnapshot()
                const addedPolygon = ((snapshot.filter(isPolygonFeature) as PolygonFeature[])
                    .find((feature) => feature.id === result.id) ?? uploadedPolygon) as PolygonFeature

                setPolygon(addedPolygon)
                drawRef.current.setMode("select")
                setActiveMode("select")

                if (result.id) {
                    drawRef.current.selectFeature(result.id)
                }
            } else {
                setPolygon(null)
                drawRef.current.setMode("select")
                setActiveMode("select")
            }

            source.setData(lineCollection)
            setUploadedGeoJsonName(file.name)

            const bounds = uploadedPolygon
                ? getPolygonBounds(uploadedPolygon)
                : getFeatureBounds(lineCollection.features)
            if (bounds) {
                mapRef.current.fitBounds(bounds, {
                    padding: 40,
                    maxZoom: 13,
                    duration: 0,
                })
            }

            if (polygonFeatures.length > 1) {
                toast.success(`Loaded ${file.name}. The largest polygon was selected as the editable service area.`)
                return
            }

            toast.success(`Loaded ${file.name}`)
        } catch {
            toast.error("Failed to parse the uploaded GeoJSON file.")
        }
    }

    const handleGeoJsonUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]

        if (!file || !mapRef.current) {
            return
        }

        if (polygon) {
            setPendingUploadFile(file)
            setConfirmUploadOpen(true)
            event.target.value = ""
            return
        }

        await processGeoJsonUpload(file)
        event.target.value = ""
    }

    const openGeoJsonPicker = () => {
        uploadInputRef.current?.click()
    }

    const clearUploadedGeoJson = () => {
        if (!mapRef.current) {
            return
        }

        const source = mapRef.current.getSource(UPLOAD_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
        source?.setData({
            type: "FeatureCollection",
            features: [],
        })
        setUploadedGeoJsonName(null)
        if (drawRef.current) {
            const nextMode = polygon ? "select" : "polygon"
            drawRef.current.setMode(nextMode)
            setActiveMode(nextMode)
        }
        toast.success("Uploaded GeoJSON overlay cleared.")
    }

    const handleConfirmUploadReplacement = async () => {
        if (!pendingUploadFile) {
            setConfirmUploadOpen(false)
            return
        }

        await processGeoJsonUpload(pendingUploadFile, { clearDrawnArea: true })
        setPendingUploadFile(null)
        setConfirmUploadOpen(false)
    }

    const handleCancelUploadReplacement = () => {
        setPendingUploadFile(null)
        setConfirmUploadOpen(false)
    }

    const handleClearArea = () => {
        if (!drawRef.current) {
            return
        }

        drawRef.current.clear()
        setPolygon(null)
        setActiveMode("polygon")
        drawRef.current.setMode("polygon")
        toast.success("Service area cleared.")
    }

    const handleSubmit = () => {
        void (async () => {
            if (!polygon) {
                toast.error("Draw or upload a polygon-based service area before submitting.")
                return
            }

            const trimmedName = name.trim()
            const payload = {
                name: trimmedName,
                polygon,
            }

            try {
                setIsSubmitting(true)
                await createServiceArea(trimmedName, polygonFeatureToEwkt(polygon))
                setLastSubmission(payload)
                toast.success("Service area created.")
            } catch (error) {
                const message = error instanceof PostgrestError || error instanceof Error
                    ? error.message
                    : "Failed to create the service area."

                toast.error(message)
            } finally {
                setIsSubmitting(false)
            }
        })()
    }

    return (
        <>
            <AlertDialog open={confirmUploadOpen} onOpenChange={setConfirmUploadOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Replace the current drawn area?</AlertDialogTitle>
                        <AlertDialogDescription data-testid="service-area-upload-confirmation-description">
                            Uploading a GeoJSON file will remove the area you have already drawn. Select OK to discard your drawing and use the uploaded GeoJSON instead.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancelUploadReplacement} data-testid="service-area-upload-confirmation-cancel">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmUploadReplacement} data-testid="service-area-upload-confirmation-ok">
                            OK
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Card>
                <CardHeader>
                    <CardTitle>Service Area Details</CardTitle>
                    <CardDescription>
                        Enter a name, draw one polygon for the service area, and optionally upload a GeoJSON file to display reference boundary lines.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="service-area-name">Service Area Name</Label>
                        <Input
                            id="service-area-name"
                            data-testid="service-area-name-input"
                            placeholder="Central delivery zone"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                        />
                        <p className="text-sm text-muted-foreground">
                            Use a name that dispatch can recognize immediately.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant={activeMode === "polygon" ? "default" : "outline"}
                                onClick={() => switchMode("polygon")}
                                disabled={!mapReady || drawingLocked}
                            >
                                Draw Area
                            </Button>
                            <Button
                                type="button"
                                variant={activeMode === "select" ? "default" : "outline"}
                                onClick={() => switchMode("select")}
                                disabled={!mapReady || polygon === null}
                            >
                                Edit Area
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={openGeoJsonPicker}
                                disabled={!mapReady}
                                data-testid="service-area-upload-button"
                            >
                                Upload GeoJSON
                            </Button>
                            <Input
                                ref={uploadInputRef}
                                type="file"
                                accept=".geojson,application/geo+json,application/json"
                                className="hidden"
                                onChange={handleGeoJsonUpload}
                                data-testid="service-area-upload-input"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={clearUploadedGeoJson}
                                disabled={!mapReady || uploadedGeoJsonName === null}
                            >
                                Clear GeoJSON
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleClearArea}
                                disabled={!mapReady || polygon === null}
                            >
                                Clear Area
                            </Button>
                        </div>

                        <div
                            ref={mapContainerRef}
                            data-testid="service-area-map-container"
                            className="h-[420px] w-full overflow-hidden rounded-xl border bg-muted/20"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                            <p>
                                {drawingLocked
                                    ? "GeoJSON overlay loaded. You can edit the service area, but drawing new geometry is locked until the upload is cleared."
                                    : "Upload a GeoJSON file to show boundary lines, then draw one polygon to define the service area."}
                            </p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex-col items-stretch gap-4 border-t">
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit || isSubmitting}
                        data-testid="service-area-submit-button"
                    >
                        {isSubmitting ? "Creating Service Area..." : "Create Service Area"}
                    </Button>

                    {lastSubmission && (
                        <div
                            className="rounded-md border bg-muted/30 p-3 text-sm"
                            data-testid="service-area-last-submission"
                        >

                            <p className="font-medium">Last saved service area</p>
                            <p className="text-muted-foreground">{lastSubmission.name}</p>
                        </div>
                    )}
                </CardFooter>
            </Card>
        </>
    )
}