import { OpenRouteService, Profile } from "ors-client";
import { cacheLife } from "next/cache";

const ORS_SERVER = process.env.NEXT_PUBLIC_ORS_SERVER

// TODO: self hosted ORS provide no auth out of the box. Have to figure out auth later on... 
export async function getRoute(profile: string, coords: [number, number][]){
    'use cache'
    cacheLife('days')
    const ors = new OpenRouteService({
        baseUrl: ORS_SERVER
    });
    const route = await ors.directions.calculateRoute(profile as Profile, {
        coordinates: coords,
        format: "geojson"
    })
    return route
}