import { Path } from '@/app/models/path';


export function calculateDistance(pointA: Path, pointB: Path){
    const radius = 6371; // km

    const deltaLatitude = (pointB.lat - pointA.lat) * Math.PI / 180;
    const deltaLongitude = (pointB.lng - pointA.lng) * Math.PI / 180;

    const halfChordLength = Math.cos(
        pointA.lat * Math.PI / 180) * Math.cos(pointB.lat * Math.PI / 180)
        * Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2)
        + Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2);

    const angularDistance = 2 * Math.atan2(Math.sqrt(halfChordLength), Math.sqrt(1 - halfChordLength));

    // returns km
    return radius * angularDistance;
}


export function decodePolyline(encoded: string, precision: number = 1e5): [number, number][] {
    const points: [number, number][] = [];
    const len = encoded.length;
    let index = 0;
    let lat = 0, lng = 0;

    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        points.push([lng / precision, lat / precision]);
    }
    return points;
}
