"use server"

export async function snapToRoads(path: { lat: number; lng: number }[]) {
    const pathParam = path
        .map(p => `${p.lat},${p.lng}`)
        .join('|');

        // TODO: Use a restricted key for this
    const res = await fetch(
        `https://roads.googleapis.com/v1/snapToRoads?path=${pathParam}&interpolate=true&key=${process.env.NEXT_PUBLIC_MAP_KEY}`
    );

    const data = await res.json();

    return data.snappedPoints.map((p: any) => ({
        lat: p.location.latitude,
        lng: p.location.longitude
    }));
}
