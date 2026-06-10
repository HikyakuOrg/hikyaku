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
