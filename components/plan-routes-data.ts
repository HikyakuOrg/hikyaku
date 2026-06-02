// Dummy data for the "Plan routes" feature showcase.
// A single courier run threading through Asakusa, Tokyo — fitting for 飛脚 (hikyaku,
// the historical Japanese express couriers). Coordinates are [lng, lat].
//
// ROUTE_GEOMETRY is a real road path (OpenStreetMap data via OpenRouteService);
// every stop below sits on that path so the drawn line reads as one optimised run.

export const BRAND = "#312c85"; // matches the app's --primary (deep indigo)

export type Stop = {
    n: number;
    name: string;
    address: string;
    /** Promised "deliver by" time, shown muted under the address */
    window: string;
    /** Optimiser's estimated arrival */
    eta: string;
    coords: [number, number];
};

export const DEPOT = {
    name: "Asakusa Depot",
    address: "1 Kaminarimon, Taitō",
    depart: "8:00 AM",
    coords: [139.7737674, 35.6639678] as [number, number],
};

export const STOPS: Stop[] = [
    { n: 1, name: "Mei Tanaka",      address: "Asakusa 2-chōme",          window: "by 10:00", eta: "8:14",  coords: [139.7686412, 35.6681536] },
    { n: 2, name: "Ren Kobayashi",   address: "Nishi-Asakusa 1-chōme",    window: "by 10:00", eta: "8:31",  coords: [139.7711684, 35.6707698] },
    { n: 3, name: "Yui Nakamura",    address: "Kuramae 4-chōme",          window: "by 11:00", eta: "8:49",  coords: [139.7725688, 35.6736085] },
    { n: 4, name: "Haruto Saitō",    address: "Komagata 2-chōme",         window: "by 11:00", eta: "9:06",  coords: [139.7748758, 35.6781538] },
    { n: 5, name: "Aoi Watanabe",    address: "Mukōjima 1-chōme",         window: "by 12:30", eta: "9:34",  coords: [139.7768097, 35.6849708] },
    { n: 6, name: "Sora Yamamoto",   address: "Higashi-Mukōjima 3-chōme", window: "by 12:30", eta: "10:01", coords: [139.7783705, 35.6951083] },
];

export const ROUTE_SUMMARY = "6 stops · 9.4 km · 2h 01m";

export const ROUTE_GEOMETRY: GeoJSON.LineString = {
    type: "LineString",
    coordinates: [
        [139.7737674, 35.6639678], [139.7739274, 35.6640875], [139.7742164, 35.6638259],
        [139.7737143, 35.663451], [139.7729574, 35.6641312], [139.7715264, 35.6655684],
        [139.7705662, 35.6665518], [139.7696473, 35.6673281], [139.7686412, 35.6681536],
        [139.7679315, 35.6675768], [139.7678756, 35.6674144], [139.7678193, 35.6671109],
        [139.7672578, 35.6676148], [139.7683719, 35.6685507], [139.7685104, 35.6686436],
        [139.7697613, 35.6696902], [139.7698878, 35.6696978], [139.770622, 35.6702673],
        [139.7711684, 35.6707698], [139.7716069, 35.6712003], [139.7716912, 35.671234],
        [139.7718768, 35.6715062], [139.7723322, 35.6728715], [139.7724697, 35.6732267],
        [139.7725688, 35.6736085], [139.772632, 35.6745206], [139.7726735, 35.674631],
        [139.7736496, 35.6762111], [139.7741751, 35.6770226], [139.7748758, 35.6781538],
        [139.7756882, 35.6794295], [139.7763743, 35.6805942], [139.7768278, 35.6813844],
        [139.77731, 35.6821747], [139.7781267, 35.6833912], [139.7783063, 35.6836685],
        [139.7783455, 35.6838917], [139.7783168, 35.6840492], [139.7782391, 35.6841971],
        [139.7780722, 35.6843513], [139.7779291, 35.6844246], [139.7772614, 35.6845914],
        [139.7771004, 35.6846625], [139.7769401, 35.6847822], [139.7768097, 35.6849708],
        [139.7767473, 35.6851791], [139.7766497, 35.686438], [139.7766888, 35.6864968],
        [139.7766945, 35.6869437], [139.7766656, 35.6871279], [139.7762162, 35.6881975],
        [139.7752221, 35.6905314], [139.7750581, 35.690763], [139.7749804, 35.690809],
        [139.7746579, 35.6916702], [139.7746681, 35.6918621], [139.7749931, 35.6941897],
        [139.7757118, 35.694404], [139.7783705, 35.6951083],
    ],
};
