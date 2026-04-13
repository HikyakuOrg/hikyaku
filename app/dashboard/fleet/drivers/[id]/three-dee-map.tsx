"use client"

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import "maplibre-gl/dist/maplibre-gl.css"

interface MapProps {
    lat: number
    lng: number
    modelUrl: string
}

export default function Map3D({ lat, lng, modelUrl }: MapProps) {
    const mapContainer = useRef<HTMLDivElement>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)

    const locationRef = useRef({ lat, lng })

    useEffect(() => {
        locationRef.current = { lat, lng }
        if (mapRef.current) {
            mapRef.current.setCenter([lng, lat])
            mapRef.current.triggerRepaint()
        }
    }, [lat, lng])

    useEffect(() => {
        const currentMapContainer = mapContainer.current
        if (!currentMapContainer) {
            return
        }
        if (mapRef.current) {
            return
        }
        const map = new maplibregl.Map({
            container: currentMapContainer,
            style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
            center: [locationRef.current.lng, locationRef.current.lat],
            zoom: 14,
        })
        mapRef.current = map

        map.on("style.load", () => {
            let camera = new THREE.Camera()
            let scene = new THREE.Scene()
            let renderer: THREE.WebGLRenderer

            const customLayer: maplibregl.CustomLayerInterface = {
                id: "3d-model",
                type: "custom",
                renderingMode: "3d",

                onAdd: function (map, gl) {
                    camera = new THREE.Camera()
                    scene = new THREE.Scene()

                    const light = new THREE.DirectionalLight(0xffffff)
                    light.position.set(0, -70, 100).normalize()
                    scene.add(light)

                    const loader = new GLTFLoader()

                    loader.load(modelUrl, (gltf) => {
                        const model = gltf.scene
                        model.scale.set(50, 50, 50)
                        model.rotation.x = Math.PI
                        model.rotation.y = 0
                        model.rotation.z = Math.PI
                        scene.add(model)
                    })

                    renderer = new THREE.WebGLRenderer({
                        canvas: map.getCanvas(),
                        context: gl,
                        antialias: true
                    })

                    renderer.autoClear = false
                },

                render: function (gl, matrix) {
                    const modelAltitude = 0
                    const modelRotate = [Math.PI / 2, 0, 0]

                    const mercator = maplibregl.MercatorCoordinate.fromLngLat(
                        { lng: locationRef.current.lng, lat: locationRef.current.lat },
                        modelAltitude
                    )

                    const modelTransform = {
                        translateX: mercator.x,
                        translateY: mercator.y,
                        translateZ: mercator.z,
                        rotateX: modelRotate[0],
                        rotateY: modelRotate[1],
                        rotateZ: modelRotate[2],
                        scale: mercator.meterInMercatorCoordinateUnits()
                    }

                    const rotationX = new THREE.Matrix4().makeRotationAxis(
                        new THREE.Vector3(1, 0, 0),
                        modelTransform.rotateX
                    )

                    const rotationY = new THREE.Matrix4().makeRotationAxis(
                        new THREE.Vector3(0, 1, 0),
                        modelTransform.rotateY
                    )

                    const rotationZ = new THREE.Matrix4().makeRotationAxis(
                        new THREE.Vector3(0, 0, 1),
                        modelTransform.rotateZ
                    )

                    const m = new THREE.Matrix4().fromArray(matrix.defaultProjectionData.mainMatrix);

                    const l = new THREE.Matrix4()
                        .makeTranslation(
                            modelTransform.translateX,
                            modelTransform.translateY,
                            modelTransform.translateZ
                        )
                        .scale(
                            new THREE.Vector3(
                                modelTransform.scale,
                                -modelTransform.scale,
                                modelTransform.scale
                            )
                        )
                        .multiply(rotationX)
                        .multiply(rotationY)
                        .multiply(rotationZ)

                    camera.projectionMatrix = m.multiply(l)

                    renderer.resetState()
                    renderer.render(scene, camera)
                    map.triggerRepaint()
                }
            }

            map.addLayer(customLayer)
        })

        return () => map.remove()


    }, [modelUrl])

    return <div ref={mapContainer} className="w-full h-[600px]" />
}