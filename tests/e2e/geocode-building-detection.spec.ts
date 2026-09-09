import { expect, test } from "@playwright/test"

import { isLikelyBuilding, parsePhotonFeatureCollection } from "@/lib/maps/geocode-autocomplete"

import apartmentBlock from "@/lib/maps/__fixtures__/photon/apartment-block.json"
import officeTower from "@/lib/maps/__fixtures__/photon/office-tower.json"
import standaloneHouse from "@/lib/maps/__fixtures__/photon/standalone-house.json"
import shop from "@/lib/maps/__fixtures__/photon/shop.json"
import bareStreet from "@/lib/maps/__fixtures__/photon/bare-street.json"
import suburbCentroid from "@/lib/maps/__fixtures__/photon/suburb-centroid.json"

// parsePhotonFeatureCollection's param type, derived rather than re-declared
// so the fixtures stay checked against whatever shape the parser actually takes.
type PhotonFeatureCollection = Parameters<typeof parsePhotonFeatureCollection>[0]

// Fixtures are real responses captured from the public Photon demo
// (https://photon.komoot.io), the same geocoder hikyaku-api proxies, so the
// heuristic is tuned against real OSM tagging rather than hand-written objects.
const CASES: Array<{ name: string; fixture: PhotonFeatureCollection; expected: boolean }> = [
    { name: "apartment block (building=residential)", fixture: apartmentBlock as PhotonFeatureCollection, expected: true },
    { name: "office tower (building=commercial)", fixture: officeTower as PhotonFeatureCollection, expected: true },
    { name: "standalone house (place=house)", fixture: standaloneHouse as PhotonFeatureCollection, expected: true },
    { name: "shop (shop=electronics, no footprint extent)", fixture: shop as PhotonFeatureCollection, expected: false },
    { name: "bare street (highway=primary, no housenumber)", fixture: bareStreet as PhotonFeatureCollection, expected: false },
    { name: "suburb centroid (place=suburb)", fixture: suburbCentroid as PhotonFeatureCollection, expected: false },
]

test.describe("isLikelyBuilding", () => {
    for (const { name, fixture, expected } of CASES) {
        test(name, () => {
            const [suggestion] = parsePhotonFeatureCollection(fixture)
            expect(isLikelyBuilding(suggestion)).toBe(expected)
        })
    }
})
