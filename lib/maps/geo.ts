import { Path } from '@/app/models/path';


export function calculateDistance(pointA: Path, pointB: Path){
    var radius = 6371; // km     

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


export async function geocodeAddress({ street, suburb, state, country, postcode }: { street: string, suburb: string, state: string, country: string, postcode: string }) {
    const params = new URLSearchParams({
        street: street,
        city: suburb,
        state: state,
        country: country,
        postalcode: postcode,
        format: "json",
        limit: "1"
    });

    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

    const response = await fetch(url, {
        headers: {
            "User-Agent": "Whendan Logistics"
        }
    });

    if (!response.ok) {
        throw new Error(`Nominatim error: ${response.status}`);
    }

    const data = await response.json();

    if (data.length === 0) {
        return null;
    }

    return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name
    };
}

export function decodePolyline(encoded: string): [number, number][] {
    const points: [number, number][] = [];
    let index = 0, len = encoded.length;
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

        points.push([lng / 1E5, lat / 1E5]);
    }
    return points;
}
