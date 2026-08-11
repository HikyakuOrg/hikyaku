/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface AddressDto {
  country: string;
  /**
   * @min -90
   * @max 90
   */
  lat: number;
  /**
   * @min -180
   * @max 180
   */
  lon: number;
  state: string;
  street: string;
  suburb: string;
}

export interface AdhocOptimisationDto {
  /**
   * drivers.id — the driver this shift is assigned to. Must share a warehouse with vehicleId.
   * @format uuid
   */
  driverId: string;
  /** Existing packages.id values to deliver on this shift. Each must sit at startingLocationId and not already belong to another optimisation. */
  packages: string[];
  /** ISO-8601 timestamp the vehicle sets off. */
  startDateTime: string;
  /**
   * warehouse.id — the start/end location.
   * @format uuid
   */
  startingLocationId: string;
  /**
   * vehicles.id — the vehicle this shift is assigned to; also resolves the routing profile via vehicles.vehicle_type. Must share a warehouse with driverId.
   * @format uuid
   */
  vehicleId: string;
}

export interface AdhocOptimisationResultDto {
  /**
   * vrp_optimization.id of the persisted optimisation.
   * @format uuid
   */
  id: string;
  /**
   * vrp_route.id of the single routed vehicle, or null when VROOM produced no route.
   * @format uuid
   */
  routeId: string | null;
  /** Requested packages VROOM could not fit into the shift. Empty when every package was assigned. */
  unassignedPackageIds: string[];
}

export interface BatchByDbIdsDto {
  ids: string[];
}

export interface BatchByStripeIdsDto {
  stripeIds: string[];
}

export interface CreateAccountSessionDto {
  /** ISO 3166-1 alpha-2 country, e.g. "US" */
  country: string;
}

export interface CreateAddonDto {
  /** Per-unit rate in major units (e.g. dollars). */
  amountMajor: number;
  name: string;
  pricingUnit: CreateAddonDtoPricingUnitEnum;
}

export type CreateAddonDtoPricingUnitEnum =
  | "per_delivery"
  | "per_km"
  | "per_mi"
  | "per_kg"
  | "per_lb"
  | "per_recipient";

export interface CreateEphemeralKeyDto {
  /** Stripe API version pinned by the client SDK */
  apiVersion: string;
  /** Single-use nonce from stripe.createEphemeralKeyNonce() */
  nonce: string;
}

export interface CreateInvitationDto {
  /** Must match the X-Organisation-Slug org id */
  org_id: string;
  /** Array of app_permission.permission strings */
  permissions: string[];
  /** Role name, must match an existing app_roles.name */
  role: string;
  user_email: string;
}

export interface CreateServiceDto {
  /** Per-unit rate in major units (e.g. dollars). */
  amountMajor: number;
  /** ISO currency code; defaults to the account default. */
  currency?: string;
  name: string;
  pricingUnit: CreateServiceDtoPricingUnitEnum;
}

export type CreateServiceDtoPricingUnitEnum =
  | "per_delivery"
  | "per_km"
  | "per_mi"
  | "per_kg"
  | "per_lb"
  | "per_recipient";

export interface CreateUserDto {
  user_avatar?: boolean;
  user_display_name: string;
  user_email: string;
  /** Required when user_role is "Driver" */
  user_metadata?: DriverMetadataDto;
  /** Array of app_permission.permission strings */
  user_permission?: string[];
  user_phone_number: string;
  /** Role name, must match an existing app_roles.name */
  user_role: string;
}

export interface CustomerAddressDto {
  country: string;
  postcode: string;
  state: string;
  street: string;
  suburb: string;
}

export type DeactivateUsersDto = object;

export interface DriverMetadataDto {
  country_of_issue?: string;
  driver_license?: string;
  driver_under_probation?: boolean;
  /** ISO 8601 date string, e.g. 2028-06-30 */
  license_expiry?: string;
  /** UUID FK to vehicle_type.id (the driver license class) */
  license_type?: string;
  /** UUID of the warehouse the driver belongs to */
  warehouse_id?: string;
}

export interface GeoJsonFeatureCollectionDto {
  features: GeoJsonFeatureDto[];
  /** @example "FeatureCollection" */
  type: GeoJsonFeatureCollectionDtoTypeEnum;
}

/** @example "FeatureCollection" */
export type GeoJsonFeatureCollectionDtoTypeEnum = "FeatureCollection";

export interface GeoJsonFeatureDto {
  geometry: GeoJsonPointDto;
  properties: GeoJsonFeaturePropertiesDto;
  /** @example "Feature" */
  type: GeoJsonFeatureDtoTypeEnum;
}

/** @example "Feature" */
export type GeoJsonFeatureDtoTypeEnum = "Feature";

export interface GeoJsonFeaturePropertiesDto {
  city?: string;
  country?: string;
  /** ISO 3166-1 alpha-2 country code. */
  countrycode?: string;
  district?: string;
  /** Bounding box as [minLon, minLat, maxLon, maxLat]. */
  extent?: number[];
  housenumber?: string;
  /** Primary display name of the result. */
  name?: string;
  /** OSM element id. */
  osm_id?: number;
  /** OSM key, e.g. `place`, `amenity`. */
  osm_key?: string;
  /** OSM element type: N, W or R. */
  osm_type?: string;
  /** OSM value, e.g. `city`, `fuel`. */
  osm_value?: string;
  postcode?: string;
  state?: string;
  street?: string;
}

export interface GeoJsonPointDto {
  /**
   * Position as [lon, lat] — GeoJSON order, not [lat, lon].
   * @example [103.85,1.29]
   */
  coordinates: number[];
  /** @example "Point" */
  type: GeoJsonPointDtoTypeEnum;
}

/** @example "Point" */
export type GeoJsonPointDtoTypeEnum = "Point";

export interface IssueCardDto {
  /** ISO currency matching the platform Stripe account (usd/eur/gbp) */
  currency: string;
  /** Driver (user) id to issue the card to */
  driverId: string;
  /** @default "daily" */
  interval?: IssueCardDtoIntervalEnum;
  /** Major-unit spend cap, e.g. 150 for $150.00. Omit for no card-level limit. */
  spendingLimitMajor?: number;
  /** Vehicle to associate the card with */
  vehicleId?: string;
}

/** @default "daily" */
export type IssueCardDtoIntervalEnum =
  | "per_authorization"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "all_time";

export interface LatestOptimisationRunDto {
  /** Failure detail when status is `failed`, or the reason no packages were eligible when status is `skipped`. Always null otherwise. */
  error: string | null;
  /** @format uuid */
  id: string;
  /**
   * Earliest time another run is allowed. Null when this run does not count toward the rate limit (failed or skipped).
   * @format date-time
   */
  nextAllowedAt?: string | null;
  /**
   * vrp_optimization.id once the run has produced one.
   * @format uuid
   */
  optimisationId: string | null;
  /**
   * When the run was requested.
   * @format date-time
   */
  requestedAt: string;
  /** Run lifecycle state, e.g. `queued`, `failed`, `skipped`. */
  status: string;
}

export interface ParcelDto {
  /** @min 0 */
  height: number;
  /** @min 0 */
  length: number;
  /** @min 0 */
  weight: number;
  /** @min 0 */
  width: number;
}

export interface PayBookingDto {
  /** Selected add-on UUIDs. */
  addonIds?: string[];
  /** Free-text notes shown to the driver. */
  deliveryNotes?: string;
  /** @minItems 1 */
  receiver: ReceiverDto[];
  sender: SenderDto;
  /** UUID of the chosen service. */
  serviceId: string;
}

export interface QuoteBookingDto {
  /** Selected add-on UUIDs. */
  addonIds?: string[];
  /** @minItems 1 */
  receiver: ReceiverDto[];
  sender: SenderDto;
  /** UUID of the chosen service. */
  serviceId: string;
}

export type ReactivateUsersDto = object;

export interface ReceiverDto {
  address: AddressDto;
  /**
   * ISO date YYYY-MM-DD
   * @example "2025-01-03"
   */
  deliveryDate: string;
  email: string;
  name: string;
  phoneNumber: string;
}

export interface RouteLegDto {
  /** Distance in meters. */
  distance: number;
  /** Travel time in seconds. */
  duration: number;
}

export interface RoutePreviewDto {
  /**
   * Whole-route path as [lng, lat] pairs, legs concatenated with shared boundary points de-duplicated.
   * @example [[103.85,1.29],[103.8555,1.2945],[103.86,1.3]]
   */
  coordinates: number[][];
  /** Per stop-pair legs — n stops yield n-1 legs. */
  legs: RouteLegDto[];
  summary: RouteSummaryDto;
  /**
   * Index into `coordinates` of each stop. wayPoints[0] is 0 and the last entry is coordinates.length - 1.
   * @example [0,2]
   */
  wayPoints: number[];
}

export interface RouteRequestDto {
  /**
   * Stops to route through, as [lng, lat] pairs in visit order.
   * @minItems 2
   * @example [[103.85,1.29],[103.86,1.3]]
   */
  coordinates: number[][];
  /** ORS-style vehicle profile, e.g. 'driving-car'. */
  profile: string;
}

export interface RouteSummaryDto {
  /** Total distance in meters. */
  distance: number;
  /** Total travel time in seconds. */
  duration: number;
}

export interface RunOptimisationDto {
  setOffOverrides?: SetOffOverrideDto[];
  /**
   * Warehouse to optimise.
   * @format uuid
   */
  warehouseId: string;
}

export interface RunOptimisationResultDto {
  /**
   * optimisation_run.id of the queued run.
   * @format uuid
   */
  runId: string;
  /** @example "queued" */
  status: RunOptimisationResultDtoStatusEnum;
}

/** @example "queued" */
export type RunOptimisationResultDtoStatusEnum = "queued";

export interface SenderDto {
  address: AddressDto;
  /**
   * ISO date YYYY-MM-DD
   * @example "2025-01-01"
   */
  collectionDate: string;
  email: string;
  name: string;
  parcel: ParcelDto;
  phoneNumber: string;
}

export interface SetCardStatusDto {
  /** 'inactive' freezes the card; 'canceled' is permanent. */
  status: SetCardStatusDtoStatusEnum;
}

/** 'inactive' freezes the card; 'canceled' is permanent. */
export type SetCardStatusDtoStatusEnum = "active" | "inactive" | "canceled";

export interface SetOffOverrideDto {
  /** ISO timestamp the vehicle should set off. */
  setOffAt: string;
  /** @format uuid */
  vehicleId: string;
}

export interface UpdateAddonDto {
  /** Per-unit rate in major units (e.g. dollars). */
  amountMajor?: number;
  name?: string;
  pricingUnit?: UpdateAddonDtoPricingUnitEnum;
}

export type UpdateAddonDtoPricingUnitEnum =
  | "per_delivery"
  | "per_km"
  | "per_mi"
  | "per_kg"
  | "per_lb"
  | "per_recipient";

export interface UpdateServiceDto {
  /** Per-unit rate in major units (e.g. dollars). */
  amountMajor?: number;
  name?: string;
  pricingUnit?: UpdateServiceDtoPricingUnitEnum;
}

export type UpdateServiceDtoPricingUnitEnum =
  | "per_delivery"
  | "per_km"
  | "per_mi"
  | "per_kg"
  | "per_lb"
  | "per_recipient";

export type UpdateUserRoleDto = object;

export interface UpsertCustomerDto {
  address: CustomerAddressDto;
  /** Pelias geocode confidence (0–1) */
  confidence?: number;
  email?: string;
  /**
   * @min -90
   * @max 90
   */
  lat: number;
  /**
   * @min -180
   * @max 180
   */
  lon: number;
  name: string;
  /** Pelias global id for stable re-lookup */
  peliasGid?: string;
  /** Raw Pelias feature (stored as jsonb) */
  peliasRaw?: object;
  phone: string;
}
