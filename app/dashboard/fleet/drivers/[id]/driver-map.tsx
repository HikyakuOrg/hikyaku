"use client"

import Map3D from "./three-dee-map"


type Props = {
    lat: number
    lng: number
}


export default function DriverMap({ lat, lng, }: Props) {
    return (
        <Map3D
            lat={lat}
            lng={lng}
            modelUrl="/truck.glb"
        />

    )
}