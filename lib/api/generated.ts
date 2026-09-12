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

export interface AcceptInvitationResultDto {
  /** @format uuid */
  organisation_id: string;
  /**
   * Slug of the joined organisation — switch the active tenant to it. Empty string in the unlikely case the organisation row has since gone.
   * @example "acme-logistics"
   */
  organisation_slug: string;
}

export interface AccountSessionDto {
  /**
   * Account Session client secret for @stripe/connect-js. Single-use and short-lived — fetch a fresh one per mount rather than caching it.
   * @example "_RGnKPHVCJhLYYDbYDVLBOoM0YWczOTdmYTBl"
   */
  clientSecret: string;
  /**
   * The platform’s Stripe publishable key, returned so the frontend need not carry it separately.
   * @example "pk_test_51QhX1a2B3c4D5e6"
   */
  publishableKey: string;
}

export interface AddPackagesToShiftDto {
  /** Existing packages.id values. Candidate selection is bypassed, but feasibility still runs: a package that breaks a deadline is reported as a warning rather than refused. */
  packageIds: string[];
}

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
  /** Subpremise line — unit, suite or business name for a building delivery. Carried into the customer record at fulfillment; never part of distance pricing or geocoding. */
  unit?: string;
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

export interface ApiErrorDto {
  /**
   * HTTP reason phrase for the status code.
   * @example "Bad Request"
   */
  error: string;
  /**
   * A single message for a hand-thrown exception, or one entry per failed constraint when request validation is what rejected the call.
   * @example "Missing X-Organisation-Slug header"
   */
  message: string | string[];
  /**
   * Mirrors the HTTP status code of the response.
   * @example 400
   */
  statusCode: number;
}

export interface AssignedShiftDto {
  /** @format uuid */
  driverId: string | null;
  /**
   * Planner ETA (package_delivery_window.estimated_arrival). Rewritten on every replan; never a deadline.
   * @format date-time
   */
  estimatedArrival: string | null;
  /**
   * vrp_optimization.id — a shift is a vrp_optimization row.
   * @format uuid
   */
  id: string;
  /** vrp_optimization.revision at the time of assignment. Clients compare this against GET /api/v1/shifts/{id}/version to detect a replan. */
  revision: number;
  /** @format date-time */
  scheduledStart: string | null;
  /**
   * Warehouse-local service day.
   * @format date
   */
  shiftDate: string;
  /** Zero-based position of this package among the route job steps, excluding the depot start/end steps. */
  stopIndex: number;
  /** @format uuid */
  vehicleId: string | null;
}

export interface AssignmentOutcomeDto {
  /** Packages bumped off a shift to make room for this one. Each was re-assigned in the same request where possible; any that could not be are back at PENDING. Empty in the normal case. */
  evictedPackageIds: string[];
  /** `assigned` — joined an existing planned shift. `assigned_new_shift` — a new shift was opened for it, which consumes one shift from the organisation allowance. `deferred` — created but not assigned; it will be picked up by the next replan or by a dispatcher. `skipped` — assignment was not attempted. */
  outcome: AssignmentOutcomeDtoOutcomeEnum;
  /** Set for `deferred` and `skipped`; null otherwise. */
  reason?: AssignmentOutcomeDtoReasonEnum | null;
  /** Present for `assigned` and `assigned_new_shift`. */
  shift?: AssignedShiftDto | null;
}

/** `assigned` — joined an existing planned shift. `assigned_new_shift` — a new shift was opened for it, which consumes one shift from the organisation allowance. `deferred` — created but not assigned; it will be picked up by the next replan or by a dispatcher. `skipped` — assignment was not attempted. */
export type AssignmentOutcomeDtoOutcomeEnum =
  | "assigned"
  | "assigned_new_shift"
  | "deferred"
  | "skipped";

/** Set for `deferred` and `skipped`; null otherwise. */
export type AssignmentOutcomeDtoReasonEnum =
  | "no_capacity"
  | "no_free_driver_vehicle"
  | "shift_allowance_exhausted"
  | "no_geocode"
  | "auto_assign_disabled"
  | "deadline_infeasible";

export interface BatchByDbIdsDto {
  ids: string[];
}

export interface BatchByStripeIdsDto {
  stripeIds: string[];
}

export interface BillingPortalSessionDto {
  /** Stripe-hosted Billing Portal URL to redirect the browser to. */
  url: string;
}

export interface BulkCreatePackageResultDto {
  /** Failure detail for this entry. One bad entry does not fail the batch. */
  error?: string | null;
  /** Index into the submitted packages array. */
  index: number;
  /** Present when this entry succeeded. */
  result?: CreatePackageResultDto | null;
}

export interface BulkCreatePackagesDto {
  /** @maxItems 500 */
  packages: CreatePackageDto[];
}

export interface BulkCreatePackagesResultDto {
  results: BulkCreatePackageResultDto[];
}

export interface CatalogAddonDto {
  /**
   * Per-unit rate in the currency’s minor units, e.g. 1250 for $12.50. The line total is this multiplied by the derived quantity.
   * @example 1250
   */
  amount_minor: number;
  /**
   * Lower-case ISO 4217 code, Stripe-style.
   * @example "usd"
   */
  currency: string;
  /**
   * Stripe product id — the stable public handle for this item. Editing a price mints a new Stripe price but leaves this unchanged.
   * @example "prod_QhX1a2B3c4D5e6"
   */
  id: string;
  /** @example "Same-day courier" */
  name: string;
  /**
   * How the booking quantity is derived at quote time. Read from Stripe product metadata, defaulting to `per_delivery` when absent.
   * @example "per_km"
   */
  pricing_unit: CatalogAddonDtoPricingUnitEnum;
}

/**
 * How the booking quantity is derived at quote time. Read from Stripe product metadata, defaulting to `per_delivery` when absent.
 * @example "per_km"
 */
export type CatalogAddonDtoPricingUnitEnum =
  | "per_delivery"
  | "per_km"
  | "per_mi"
  | "per_kg"
  | "per_lb"
  | "per_recipient";

export interface CatalogServiceDto {
  /** Add-ons belonging to this service, oldest first. Only these are accepted in `addonIds` when quoting or paying for it. */
  addons: CatalogAddonDto[];
  /**
   * Per-unit rate in the currency’s minor units, e.g. 1250 for $12.50. The line total is this multiplied by the derived quantity.
   * @example 1250
   */
  amount_minor: number;
  /**
   * Lower-case ISO 4217 code, Stripe-style.
   * @example "usd"
   */
  currency: string;
  /**
   * Stripe product id — the stable public handle for this item. Editing a price mints a new Stripe price but leaves this unchanged.
   * @example "prod_QhX1a2B3c4D5e6"
   */
  id: string;
  /** @example "Same-day courier" */
  name: string;
  /**
   * How the booking quantity is derived at quote time. Read from Stripe product metadata, defaulting to `per_delivery` when absent.
   * @example "per_km"
   */
  pricing_unit: CatalogServiceDtoPricingUnitEnum;
}

/**
 * How the booking quantity is derived at quote time. Read from Stripe product metadata, defaulting to `per_delivery` when absent.
 * @example "per_km"
 */
export type CatalogServiceDtoPricingUnitEnum =
  | "per_delivery"
  | "per_km"
  | "per_mi"
  | "per_kg"
  | "per_lb"
  | "per_recipient";

export interface CheckDigitResultDto {
  /** Actual check digit character from the VIN. */
  actual: string;
  /** Check digit calculated from the VIN. */
  expected?: string;
  isValid: boolean;
  /** Position in the VIN, typically 9. */
  position: number;
}

export interface CheckoutResultDto {
  /**
   * Stripe-hosted Checkout URL. Redirect the browser to it — do not fetch or embed it.
   * @example "https://checkout.stripe.com/c/pay/cs_test_a1B2c3D4e5"
   */
  checkoutUrl: string;
  /**
   * Checkout Session id, echoed back to the success URL as `session_id` so the confirmation page can identify the booking.
   * @example "cs_test_a1B2c3D4e5"
   */
  sessionId: string;
}

export interface ConnectStatusDto {
  /**
   * Connected account id, or null before onboarding begins.
   * @example "acct_1QhX1a2B3c4D5e6"
   */
  accountId: string | null;
  /**
   * Stripe capability state — `active`, `pending`, `inactive`, or null when never requested. Fuel cards need `active`.
   * @example "active"
   */
  cardIssuingStatus: string | null;
  /** Whether the account can take payments. Gates the service-rates and booking features. */
  chargesEnabled: boolean;
  /**
   * ISO 3166-1 alpha-2 country, fixed at account creation and immutable afterwards.
   * @example "US"
   */
  country: string | null;
  /**
   * Account default currency, lower-case ISO 4217.
   * @example "usd"
   */
  currency: string | null;
  /** Whether the org finished Stripe’s onboarding form. */
  detailsSubmitted: boolean;
  /** Whether Stripe will pay out to the account. */
  payoutsEnabled: boolean;
}

export interface CoverageAreaDto {
  /**
   * How many drivers at this warehouse are staffed on this area. Zero means the territory was drawn and then left unstaffed, which reads identically to "no territory here" from the driver list alone.
   * @example 2
   */
  driverCount: number;
  /** GeoJSON MultiPolygon, present only when `includeGeometry=true` was passed. Omitted by default: a handful of city-sized territories is megabytes of coordinates that a coverage question does not need. */
  geometry?: Record<string, any> | null;
  /**
   * service_areas.id.
   * @format uuid
   */
  id: string;
  /** The name a dispatcher gave the territory. */
  name: string;
}

export interface CoverageAssignmentDto {
  /** Shorthand for `matchedBy` being explicit or floater. False on an assignment coverage does not explain, which is the case worth escalating. */
  covered: boolean;
  /**
   * The driver on that shift, or null.
   * @format uuid
   */
  driverId: string | null;
  /** How the driver that actually got this package relates to the coverage above. `explicit` and `floater` mirror the driver list. `not_covering` is the interesting one: the package went to a driver no territory selects and who is not a floater either, so coverage did not produce this assignment. `unassigned` means no shift or no driver on it yet. */
  matchedBy: CoverageAssignmentDtoMatchedByEnum;
  /**
   * What the assignment engine recorded WHEN IT PLACED THIS PACKAGE (`package_assignment.coverage_outcome`), as opposed to `matchedBy` above, which is recomputed against the territories as they stand right now.
   *
   * The two disagreeing is not a bug, it is the most useful thing on this response: it means the map changed after the package was placed. A package recorded as `covered` that now reads `not_covering` was routed correctly and then had its territory redrawn underneath it.
   *
   * `floater` is kept distinct from `covered` because during rollout most matches are floater matches, and merging them would report the feature as working better than it is. `disabled` means SERVICE_AREA_MATCHING was off and no coverage question was asked. Null means no automatic assignment wrote this row: the package was pinned by a dispatcher, or it predates this column.
   */
  recordedOutcome?: CoverageAssignmentDtoRecordedOutcomeEnum | null;
  /**
   * vrp_optimization.id, or null if not on a shift yet.
   * @format uuid
   */
  shiftId: string | null;
  /**
   * Status of the shift the package sits on.
   * @example "planned"
   */
  shiftStatus: string | null;
}

/** How the driver that actually got this package relates to the coverage above. `explicit` and `floater` mirror the driver list. `not_covering` is the interesting one: the package went to a driver no territory selects and who is not a floater either, so coverage did not produce this assignment. `unassigned` means no shift or no driver on it yet. */
export type CoverageAssignmentDtoMatchedByEnum =
  | "explicit"
  | "floater"
  | "not_covering"
  | "unassigned";

/**
 * What the assignment engine recorded WHEN IT PLACED THIS PACKAGE (`package_assignment.coverage_outcome`), as opposed to `matchedBy` above, which is recomputed against the territories as they stand right now.
 *
 * The two disagreeing is not a bug, it is the most useful thing on this response: it means the map changed after the package was placed. A package recorded as `covered` that now reads `not_covering` was routed correctly and then had its territory redrawn underneath it.
 *
 * `floater` is kept distinct from `covered` because during rollout most matches are floater matches, and merging them would report the feature as working better than it is. `disabled` means SERVICE_AREA_MATCHING was off and no coverage question was asked. Null means no automatic assignment wrote this row: the package was pinned by a dispatcher, or it predates this column.
 */
export type CoverageAssignmentDtoRecordedOutcomeEnum =
  | "covered"
  | "floater"
  | "fallback_no_covering_capacity"
  | "fallback_no_covering_driver"
  | "disabled";

export interface CoverageDiagnosticDto {
  /** True when at least one territory covers the point. Kept separate from the driver list so "nobody covers this", "territories exist but none match here" and "everyone matches, as floaters" are three distinguishable answers rather than one empty array. */
  anyAreaCovers: boolean;
  /** Every live territory containing the point, staffed or not, ordered by name. Not filtered by warehouse: an unstaffed territory over the address is the most useful thing this endpoint can show. */
  areas: CoverageAreaDto[];
  /** Null for the coordinate form. For the package form, who actually got it and whether coverage explains that. */
  assignment: CoverageAssignmentDto | null;
  /** Every driver at the warehouse who covers the point, explicit matches first, each group ordered by id. */
  drivers: CoverageDriverDto[];
  /**
   * One sentence a support engineer can paste into a ticket. Derived entirely from the fields below; it adds no information of its own.
   * @example "No territory covers this address; 3 driver(s) match only because they have no territories at all."
   */
  explanation: string;
  /**
   * Live (not soft-deleted) territories in the whole organisation. Zero means nothing has been configured yet, which is the expected state during rollout and is very different from territories existing and not matching.
   * @example 4
   */
  organisationAreaCount: number;
  /**
   * Echo of `packageId`, or null for the coordinate form.
   * @format uuid
   */
  packageId: string | null;
  /** The point coverage was evaluated at. Null when it could not be resolved. Echoed back because roughly half of these questions turn out to be a bad geocode rather than a bad territory, and seeing the coordinates is what makes that obvious immediately. */
  point: CoveragePointDto | null;
  /** Whether coverage could be evaluated at all. The two failure values are answers, not errors: a package with no geocode is exactly what AssignmentService skips as `no_geocode` and never assigns, and an empty driver list would otherwise be indistinguishable from a geocoded address that genuinely nobody covers. */
  resolution: CoverageDiagnosticDtoResolutionEnum;
  /** Null for the coordinate form (there is no package to check requirements for), for a package with no skill requirement, and whenever `resolution` is not `evaluated`. Present and `satisfied: false` is the skills-specific unassigned reason this endpoint exists to surface, independent of the territory/driver coverage above. */
  skills: CoverageSkillsDto | null;
  /** The package’s tracking number, since a support question usually starts from one. */
  trackingNumber: string | null;
  /**
   * The warehouse whose drivers were considered. Resolved from the package, or from `warehouseId`, or from the organisation when it has exactly one warehouse.
   * @format uuid
   */
  warehouseId: string | null;
}

/** Whether coverage could be evaluated at all. The two failure values are answers, not errors: a package with no geocode is exactly what AssignmentService skips as `no_geocode` and never assigns, and an empty driver list would otherwise be indistinguishable from a geocoded address that genuinely nobody covers. */
export type CoverageDiagnosticDtoResolutionEnum =
  | "evaluated"
  | "package_not_geocoded"
  | "package_has_no_warehouse";

export interface CoverageDriverDto {
  /**
   * drivers.id.
   * @format uuid
   */
  driverId: string;
  /** `explicit`: a territory this driver is staffed on contains the point. `floater`: this driver has no territories at all and so covers everywhere, which is what keeps an unconfigured organisation behaving exactly as it did before territories existed. */
  matchedBy: CoverageDriverDtoMatchedByEnum;
}

/** `explicit`: a territory this driver is staffed on contains the point. `floater`: this driver has no territories at all and so covers everywhere, which is what keeps an unconfigured organisation behaving exactly as it did before territories existed. */
export type CoverageDriverDtoMatchedByEnum = "explicit" | "floater";

export interface CoverageFallbackPackageDto {
  /**
   * When the package was placed on that shift.
   * @format date-time
   */
  assignedAt: string;
  /**
   * The driver who got it despite not covering the point.
   * @format uuid
   */
  driverId: string | null;
  /** Which of the two fallback outcomes this was. */
  outcome: CoverageFallbackPackageDtoOutcomeEnum;
  /** @format uuid */
  packageId: string;
  /** @format uuid */
  shiftId: string | null;
  trackingNumber: string | null;
}

/** Which of the two fallback outcomes this was. */
export type CoverageFallbackPackageDtoOutcomeEnum =
  | "fallback_no_covering_capacity"
  | "fallback_no_covering_driver";

export interface CoverageOutcomeCountsDto {
  /** A territory the driver is staffed on contains the point. */
  covered: number;
  /** SERVICE_AREA_MATCHING was off when the package was placed, so no coverage question was asked. Excluded from `decisions` and from the rate below. */
  disabled: number;
  /** Somebody covers the point, but no covering driver had room and none was idle. An understaffed territory, or a busy day. */
  fallbackNoCoveringCapacity: number;
  /** Nobody covers the point at all. Usually a territory that was never drawn, or one drawn and left unstaffed. */
  fallbackNoCoveringDriver: number;
  /** The driver matched only because they have no territories at all. Expect this to be most of the traffic while the map is being drawn, which is exactly why it is not folded into `covered`. */
  floater: number;
}

export interface CoveragePointDto {
  /**
   * Latitude, WGS84.
   * @example 1.29027
   */
  lat: number;
  /**
   * Longitude, WGS84. Always in lon/lat order, as PostGIS is.
   * @example 103.851959
   */
  lon: number;
}

export interface CoverageSkillsDto {
  /**
   * Vehicles at this warehouse holding every required skill at once. Zero means no single vehicle can take this package regardless of territory, even if every individual skill exists somewhere in the fleet.
   * @example 0
   */
  matchingVehicleCount: number;
  /** The subset of requiredSkillIds that NO vehicle at this warehouse holds at all — the specific "no vehicle holds skill X" reason. A skill can be missing here even when `satisfied` below also fails for a different one, or when every required skill exists somewhere in the fleet but never all on the same vehicle. */
  missingSkillIds: string[];
  /** The package's required skills (package_skills.skill_id). */
  requiredSkillIds: string[];
  /** requiredSkillIds is empty, or matchingVehicleCount is greater than zero. False is the skills-specific unassigned reason this endpoint exists to surface. */
  satisfied: boolean;
}

export interface CoverageSummaryDto {
  byOutcome: CoverageOutcomeCountsDto;
  /**
   * THE NUMBER. The fraction of `decisions` that reached a driver who covers the delivery point, counting both `covered` and `floater`. 1 means coverage placed everything; the shortfall is the fallback rate. Null when `decisions` is zero, because a rate over no samples is not zero, it is unknown.
   * @example 0.94
   */
  coveredRate: number | null;
  /** `totalAssigned` minus the `disabled` ones: the packages a coverage question was actually asked about. The denominator of `coveredRate`. */
  decisions: number;
  /**
   * One sentence a dispatcher can act on, derived entirely from the fields above.
   * @example "94% of 312 coverage decision(s) reached a covering driver over the last 7 day(s), across 6 live territory (or territories)."
   */
  explanation: string;
  /** The most recent packages in the window that went to a driver who does not cover them, newest first, capped at 50. This is the "which packages, and why" answer; pass any of these ids to GET /api/v1/dispatch/coverage for the full explanation of one. */
  fallbacks: CoverageFallbackPackageDto[];
  /** Live (not soft-deleted) territories in this organisation. Zero means nothing has been drawn, so every driver covers everywhere and a 100% floater rate is the correct answer rather than a good one. */
  liveServiceAreaCount: number;
  /** Whether service area matching is switched on for the process answering this request. False means new packages are being recorded as `disabled` and the rate below describes history, not what is happening now. Process-wide, not per organisation. */
  serviceAreaMatching: boolean;
  /**
   * The start of that window, so the counts can be quoted.
   * @format date-time
   */
  since: string;
  /** Packages placed by automatic assignment in the window. Excludes anything a dispatcher pinned by hand and anything placed before outcomes were recorded, neither of which took a coverage decision. */
  totalAssigned: number;
  /**
   * How many days back the counts cover.
   * @example 7
   */
  windowDays: number;
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

export interface CreateBillingPortalSessionDto {
  /**
   * Where Stripe redirects the browser after the customer leaves the Billing Portal — typically the page the "Add payment method" button was clicked from.
   * @example "https://acme.hikyaku.org/dashboard/settings/billing"
   */
  returnUrl: string;
}

export interface CreateEphemeralKeyDto {
  /** Stripe API version pinned by the client SDK */
  apiVersion: string;
  /** Single-use nonce from stripe.createEphemeralKeyNonce() */
  nonce: string;
}

export interface CreateInvitationDto {
  /**
   * Id of the organisation to invite into. Must be the same organisation the `X-Organisation-Slug` header resolves to — a mismatch is rejected with 400. Redundant by design: it makes the caller state which tenant they believe they are acting on.
   * @format uuid
   */
  org_id: string;
  /** Array of app_permission.permission strings */
  permissions: string[];
  /** Role name, must match an existing app_roles.name */
  role: string;
  user_email: string;
}

export interface CreateInvitationResultDto {
  /**
   * Lower-cased — compare case-insensitively against the request.
   * @format email
   */
  email: string;
  /**
   * The invitation row. Re-inviting an address that already has an outstanding invitation updates that one and returns its existing id rather than creating a second.
   * @format uuid
   */
  id: string;
  /**
   * Always `pending`: the invitation exists but has not been acted on. The email is sent best-effort afterwards, so a 201 does not confirm delivery.
   * @example "pending"
   */
  status: CreateInvitationResultDtoStatusEnum;
}

/**
 * Always `pending`: the invitation exists but has not been acted on. The email is sent best-effort afterwards, so a 201 does not confirm delivery.
 * @example "pending"
 */
export type CreateInvitationResultDtoStatusEnum = "pending";

export interface CreatePackageDto {
  /**
   * Run assignment immediately after creation. The mobile create-shift wizard MUST send false: it creates packages then hands their ids to POST /api/v1/optimisation/adhoc, which rejects a package that already belongs to an optimisation.
   * @default true
   */
  autoAssign?: boolean;
  /**
   * Hard deadline — the promise made to the customer, stored in package_delivery_window.scheduled_arrival and never overwritten by the planner. Packages WITHOUT a deadline are the ones eligible to be bumped off a shift to make room for one that has a deadline.
   * @format date-time
   */
  deadlineAt?: string;
  /** Free-text notes for the driver. */
  deliveryNotes?: string;
  dimensions: PackageDimensionsDto;
  /**
   * customer.id of the sender.
   * @format uuid
   */
  fromCustomerId: string;
  /**
   * Client-supplied packages.id. Both clients mint a UUID before the call so they can name the storage path for photos; supplying it here keeps that working and makes the create idempotent on replay. Omitted, the server generates one.
   * @format uuid
   */
  id?: string;
  /** Required skills (skills.id) this delivery needs, from the caller's organisation catalog. An unknown, archived, or another organisation's id is rejected with 400. The optimiser only routes this package onto a vehicle holding every one of them (see vehicle_skills) — a hard constraint, mirroring VROOM. Omitted or empty means no skill requirement. */
  skillIds?: string[];
  /**
   * customer.id of the recipient. Its customer_location is the routed stop; a recipient with no geocode cannot be assigned.
   * @format uuid
   */
  toCustomerId: string;
  /** Human-facing tracking number. Omitted, the packages_set_tracking_number trigger generates one. Re-sending an existing number with an identical payload replays the original package instead of creating a second. */
  trackingNumber?: string;
  /**
   * warehouse.id the package is dispatched from. Must belong to the active organisation.
   * @format uuid
   */
  warehouseId: string;
}

export interface CreatePackageResultDto {
  assignment: AssignmentOutcomeDto;
  package: PackageDto;
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

export interface CreateShiftDto {
  /**
   * drivers.id. Must share a warehouse with vehicleId.
   * @format uuid
   */
  driverId: string;
  /**
   * When the vehicle sets off. Omitted, the shift stays open to automatic assignment indefinitely; set, it closes 15 minutes before this time so nothing is added to a van about to roll.
   * @format date-time
   */
  scheduledStart?: string;
  /**
   * Warehouse-local service day (YYYY-MM-DD). A driver or vehicle can hold at most one open shift per day.
   * @format date
   * @example "2026-09-01"
   */
  shiftDate: string;
  /**
   * vehicles.id. Also resolves the routing profile via vehicles.vehicle_type.
   * @format uuid
   */
  vehicleId: string;
  /**
   * warehouse.id the shift starts and ends at.
   * @format uuid
   */
  warehouseId: string;
}

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

export interface CreateUserResultDto {
  /**
   * When the invitation email was issued.
   * @format date-time
   */
  invited_at: string | null;
  /** Short-lived signed URL for uploading the avatar directly to storage. Present only when the request set `user_avatar` — image bytes never pass through this API. */
  user_avatar_upload_url?: string;
  user_display_name: string;
  /** @format email */
  user_email: string;
  /**
   * Supabase auth id of the invited user.
   * @format uuid
   */
  user_id: string;
  /**
   * The granted permissions as a JSON-encoded string array, not an array — `JSON.parse` before use. Deduplicated against the request.
   * @example "["team_members.view","vehicles.view"]"
   */
  user_permission: string;
  user_phone_number: string;
  /** Role name, echoed from the request. */
  user_role: string;
}

export interface CustomerAddressDto {
  country: string;
  postcode: string;
  state: string;
  street: string;
  suburb: string;
  /** Subpremise line — unit, suite or business name for a building delivery. Last-metre instruction only: never part of the geocoded street line. Whitespace-only values are stored as unset. */
  unit?: string;
}

export interface CustomerDto {
  /** @format date-time */
  created_at: string;
  /** Street line. Empty string when unset. */
  customer_address: string;
  /** Empty string when unset. */
  customer_country: string;
  /** Empty string when unset. */
  customer_email: string;
  /** Geocoded position as GeoJSON. */
  customer_location: CustomerLocationDto | null;
  /** Empty string when the column is null, never null itself. */
  customer_name: string;
  /** E.164 where known. Empty string when unset. */
  customer_phone: string;
  /** Empty string when unset. */
  customer_postcode: string;
  /** Empty string when unset. */
  customer_state: string;
  /** Empty string when unset. */
  customer_suburb: string;
  /** Subpremise line — unit, suite or business name for a building delivery. Separate from the geocoded street line, and never fed back into geocoding or routing. Empty string when unset. */
  customer_unit: string;
  /** This customer’s id in the external platform’s system. Null unless external_platform is also set. */
  external_customer_id: string | null;
  /** Lowercase slug of the external storefront this customer was created from (e.g. "shopify"). Null unless external_customer_id is also set. */
  external_platform: string | null;
  /** Pelias geocode confidence (0–1). Only set for addresses entered through the geocoded manual-entry form. */
  geocode_confidence: number | null;
  /** @format uuid */
  id: string;
  /** @format uuid */
  organisation_id: string;
  /** Pelias global id, for stable re-lookup of the address. */
  pelias_gid: string | null;
  /** Raw Pelias feature kept for provenance. Opaque — do not read fields off it. */
  pelias_raw: Record<string, any> | null;
  /**
   * Linked Stripe customer on the organisation’s connected account. Null until the organisation enables payments, and null if the best-effort Stripe sync failed.
   * @example "cus_QhX1a2B3c4D5e6"
   */
  stripe_customer_id: string | null;
}

export interface CustomerLocationDto {
  /**
   * GeoJSON order: [longitude, latitude].
   * @maxItems 2
   * @minItems 2
   * @example [103.8607,1.2834]
   */
  coordinates: number[];
  /** @example "Point" */
  type: CustomerLocationDtoTypeEnum;
}

/** @example "Point" */
export type CustomerLocationDtoTypeEnum = "Point";

export interface DeactivateUsersDto {
  /**
   * Users to deactivate. Each is processed independently — see the response’s `failed` array rather than assuming all-or-nothing. The caller cannot deactivate themselves, and accounts holding every permission are refused.
   * @minItems 1
   */
  user_ids: string[];
}

export interface DeactivateUsersResultDto {
  /** Users banned and signed out of every session. */
  deactivated: string[];
  /** Users left untouched, with the reason for each. */
  failed: UserBatchFailureDto[];
}

export interface DeclineInvitationResultDto {
  /**
   * Always true — a failure to decline surfaces as a 404, never as `false`.
   * @example true
   */
  ok: DeclineInvitationResultDtoOkEnum;
}

/**
 * Always true — a failure to decline surfaces as a 404, never as `false`.
 * @example true
 */
export type DeclineInvitationResultDtoOkEnum = true;

export interface DecodeErrorDto {
  /** Validation errors only: the actual value. */
  actual?: string;
  category: DecodeErrorDtoCategoryEnum;
  /**
   * Numeric-string error code, e.g. `100` (invalid length), `200` (invalid check digit), `300` (WMI not found).
   * @example "300"
   */
  code: string;
  details?: string;
  /** Validation errors only: the expected value. */
  expected?: string;
  message: string;
  /** VIN positions this error covers. */
  positions?: number[];
  /** Lookup errors only: the key that was searched for. */
  searchKey?: string;
  /** Lookup errors only: what kind of lookup ran. */
  searchType?: string;
  severity: DecodeErrorDtoSeverityEnum;
}

export type DecodeErrorDtoCategoryEnum =
  | "validation"
  | "structure"
  | "lookup"
  | "pattern"
  | "database";

export type DecodeErrorDtoSeverityEnum = "warning" | "error" | "fatal";

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

export interface DrivingLimitBreachingShiftDto {
  dimensions: DrivingLimitDimensionBreachDto[];
  /** @format uuid */
  driverId: string | null;
  /** @format date */
  shiftDate: string | null;
  /**
   * vrp_optimization.id.
   * @format uuid
   */
  shiftId: string;
}

export interface DrivingLimitDimensionBreachDto {
  /** What this shift actually measured on this dimension. */
  actual: number;
  /** packages.id for each of the affectedStopCount stops above. */
  affectedPackageIds: string[];
  /** Job stops on the part of the route past the point the cumulative figure first crosses the cap — the honest proxy for how much work would need re-placing were this cap enforced today. Not a claim about which stops an actual re-solve would drop. */
  affectedStopCount: number;
  /** `working`: elapsed departure-to-return time. `driving`: travel-only time, ESTIMATED as elapsed time minus total service time (see the top-level `drivingSecondsIsEstimated` note — this codebase does not persist VROOM’s own travel-time figure on the path most shifts take). `distance`: total route distance. `stops`: job stop count. */
  dimension: DrivingLimitDimensionBreachDtoDimensionEnum;
  /** The proposed cap it exceeded. */
  limit: number;
}

/** `working`: elapsed departure-to-return time. `driving`: travel-only time, ESTIMATED as elapsed time minus total service time (see the top-level `drivingSecondsIsEstimated` note — this codebase does not persist VROOM’s own travel-time figure on the path most shifts take). `distance`: total route distance. `stops`: job stop count. */
export type DrivingLimitDimensionBreachDtoDimensionEnum =
  | "working"
  | "driving"
  | "distance"
  | "stops";

export interface DrivingLimitDistributionDto {
  distanceM: DrivingLimitDistributionStatsDto;
  /** ESTIMATED, not measured — see `drivingSecondsIsEstimated` on the parent response. */
  drivingSeconds: DrivingLimitDistributionStatsDto;
  stopCount: DrivingLimitDistributionStatsDto;
  workingSeconds: DrivingLimitDistributionStatsDto;
}

export interface DrivingLimitDistributionStatsDto {
  /** The median day. */
  p50: number;
  /** The 90th percentile — a sane starting cap sits above this, not above the median, or one day in ten already breaches it before the flag is even switched on. */
  p90: number;
  /** Realised shifts this dimension was computed over. */
  count: number;
  /** The worst day in the window. */
  max: number;
  /** The best day. */
  min: number;
}

export interface DrivingLimitsDto {
  maxDistanceM: number | null;
  maxDrivingSeconds: number | null;
  maxStops: number | null;
  maxWorkingSeconds: number | null;
}

export interface DrivingLimitsSummaryDto {
  /** Every realised shift breaching at least one proposed cap, most recent shift_date first. Empty when no cap was proposed at all, which is a different answer from "none breached" — see `proposedLimits`. */
  breachingShifts: DrivingLimitBreachingShiftDto[];
  /** Null when shiftCount is zero — nothing to summarise yet. */
  distribution: DrivingLimitDistributionDto | null;
  /** Whether DRIVING_LIMITS is switched on right now, so "we have not turned it on yet" is distinguishable from "we turned it on and nothing breached". Process-wide, not per organisation. */
  drivingLimitsEnabled: boolean;
  /** True for every response: `driving` breaches and the driving-hours distribution are computed as elapsed time minus total service time, not from a measured travel-time figure. `ShiftPlanWriter`, the write path every Tier 1 placement and every continuous replan uses, never persists VROOM’s own travel-time column, so that figure is null for effectively every shift under the "instant" assignment mode this codebase runs. The estimate is exact unless a delivery deadline made the vehicle wait, which reads as extra driving here. */
  drivingSecondsIsEstimated: boolean;
  /**
   * One sentence a dispatcher can act on, derived entirely from the fields above.
   * @example "30 realised shift(s) over the last 30 day(s); a 200,000 m distance cap would have breached 4 of them (11 packages on the affected portion of those routes). DRIVING_LIMITS is currently off."
   */
  explanation: string;
  proposedLimits: ProposedDrivingLimitsDto;
  /** Realised shifts (status dispatched or completed) considered in the window. Zero means the distribution and breach list below are both empty for lack of data, not because nothing would breach. */
  shiftCount: number;
  /**
   * The start of that window, so the figures can be quoted.
   * @format date-time
   */
  since: string;
  /** breachingShifts.length, for a client that only needs the count. */
  totalBreachingShifts: number;
  /**
   * How many days back the figures cover.
   * @example 30
   */
  windowDays: number;
}

export interface EngineInfoDto {
  cylinders?: string;
  /** Displacement in liters. */
  displacement?: string;
  fuel?: string;
  /** Engine model code. */
  model?: string;
  /** Engine power in HP. */
  power?: string;
  type?: string;
}

export interface EphemeralKeyDto {
  /**
   * Short-lived Stripe ephemeral key secret. Pass it straight to Issuing Elements to render full card details client-side — the PAN never touches this server. Do not log or persist it.
   * @example "ek_test_YWNjdF8xUWhYMWEyQjNjNEQ1ZTY"
   */
  ephemeralKeySecret: string;
}

export interface FundingBankTransferDto {
  /**
   * ISO 3166-1 alpha-2 country of the receiving bank.
   * @example "US"
   */
  country: string;
  /** Bank coordinates to wire to. The fields vary by rail — ACH exposes routing and account numbers, SEPA an IBAN — so this is left opaque rather than modelled per country. Render it, do not branch on it. */
  financial_addresses: Record<string, any>[];
  /**
   * Transfer rail, derived from the account currency — one of `us_bank_transfer`, `gb_bank_transfer`, `eu_bank_transfer`.
   * @example "us_bank_transfer"
   */
  type: string;
}

export interface FundingInstructionsDto {
  bank_transfer: FundingBankTransferDto;
  /**
   * Lower-case ISO 4217 code the account is funded in.
   * @example "usd"
   */
  currency: string;
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

export interface HealthDto {
  /**
   * Always "ok" — the endpoint only reports process liveness.
   * @example "ok"
   */
  status: string;
}

export interface InvitationOrganisationDto {
  /** @format uuid */
  id: string;
  /** @example "Acme Logistics" */
  name: string;
  /** @example "acme-logistics" */
  slug: string;
}

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

export interface IssuingBalanceDto {
  /**
   * Available to spend, in minor units. Can be zero, and is not the account’s payments balance — Issuing funds are held separately.
   * @example 250000
   */
  amount: number;
  /**
   * Lower-case ISO 4217 code.
   * @example "usd"
   */
  currency: string;
}

export interface IssuingCardDto {
  /**
   * Last four digits of the PAN. The full number never leaves Stripe.
   * @example "4242"
   */
  last4: string | null;
  /**
   * Stripe cardholder id for the driver. Empty string in the unlikely case Stripe returned no cardholder.
   * @example "ich_1QhX1a2B3c4D5e6"
   */
  cardholderId: string;
  /** @format date-time */
  createdAt: string;
  /**
   * Lower-case ISO 4217 code.
   * @example "usd"
   */
  currency: string;
  /**
   * Stripe card id — the same value as `stripeCardId`.
   * @example "ic_1QhX1a2B3c4D5e6"
   */
  id: string;
  /** @format uuid */
  organisationId: string;
  /**
   * Window the limit resets over. Null when there is no limit.
   * @example "daily"
   */
  spendingInterval: IssuingCardDtoSpendingIntervalEnum | null;
  /**
   * Spend cap in minor units for the interval below. Null when the card carries no card-level limit.
   * @example 15000
   */
  spendingLimitMinor: number | null;
  /**
   * Stripe card status: `active`, `inactive` (frozen) or `canceled` (permanent).
   * @example "active"
   */
  status: string;
  /**
   * Stripe card id. Duplicates `id`; kept for clarity at call sites.
   * @example "ic_1QhX1a2B3c4D5e6"
   */
  stripeCardId: string;
  /**
   * Always `virtual` — physical cards are not issued.
   * @example "virtual"
   */
  type: string;
  /**
   * Stripe exposes no update timestamp on cards, so this mirrors `createdAt` to keep the shape stable. Do not treat it as a real modification time.
   * @format date-time
   */
  updatedAt: string;
  /**
   * Vehicle the card is associated with, from Stripe card metadata. Null when the card was issued without one.
   * @format uuid
   */
  vehicleId: string | null;
}

/**
 * Window the limit resets over. Null when there is no limit.
 * @example "daily"
 */
export type IssuingCardDtoSpendingIntervalEnum =
  | "per_authorization"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "all_time";

export interface IssuingTransactionDto {
  /**
   * Magnitude in minor units, always positive. Stripe reports spend as a negative amount; the sign is dropped here, so use `type` to tell a refund from a capture.
   * @example 6350
   */
  amountMinor: number;
  /**
   * Mirrors `createdAt` — Stripe exposes one timestamp here.
   * @format date-time
   */
  authorizedAt: string | null;
  /** @example "ic_1QhX1a2B3c4D5e6" */
  cardId: string | null;
  /** @example "ich_1QhX1a2B3c4D5e6" */
  cardholderId: string | null;
  /** @format date-time */
  createdAt: string;
  /**
   * Lower-case ISO 4217 code.
   * @example "usd"
   */
  currency: string;
  /**
   * From the cardholder’s Stripe metadata.
   * @format uuid
   */
  driverId: string | null;
  /**
   * Stripe transaction id — the same value as `stripeTransactionId`.
   * @example "ipi_1QhX1a2B3c4D5e6"
   */
  id: string;
  /**
   * Stripe merchant category, e.g. `service_stations`.
   * @example "service_stations"
   */
  merchantCategory: string | null;
  merchantCity: string | null;
  /**
   * ISO 3166-1 alpha-2 country code.
   * @example "US"
   */
  merchantCountry: string | null;
  /** @example "SHELL 1234" */
  merchantName: string | null;
  /** @format uuid */
  organisationId: string;
  /** The authorization this transaction settled, where there was one. */
  stripeAuthorizationId: string | null;
  /** @example "ipi_1QhX1a2B3c4D5e6" */
  stripeTransactionId: string;
  /**
   * Anything Stripe does not report as a refund is a capture.
   * @example "capture"
   */
  type: IssuingTransactionDtoTypeEnum;
  /**
   * From the card’s Stripe metadata; null if the card has no vehicle.
   * @format uuid
   */
  vehicleId: string | null;
}

/**
 * Anything Stripe does not report as a refund is a capture.
 * @example "capture"
 */
export type IssuingTransactionDtoTypeEnum = "capture" | "refund";

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

export interface ModelYearResultDto {
  /** Confidence in the year, from 0 to 1. */
  confidence: number;
  source: ModelYearResultDtoSourceEnum;
  /** @example 2023 */
  year: number;
}

export type ModelYearResultDtoSourceEnum =
  | "position"
  | "override"
  | "calculated";

export interface OrderDeliveryAddressDto {
  line1: string | null;
  line2: string | null;
  city: string | null;
  company: string | null;
  country: string | null;
  country_code: string | null;
  postcode: string | null;
  province: string | null;
  province_code: string | null;
}

export interface OrderDeliveryDto {
  address: OrderDeliveryAddressDto | null;
  email: string | null;
  instructions: string | null;
  /**
   * @min -90
   * @max 90
   */
  latitude: number | null;
  /**
   * @min -180
   * @max 180
   */
  longitude: number | null;
  phone: string | null;
  recipient_name: string | null;
  /** Whether this order needs physical delivery at all — false for a fully digital/no-shipping order. */
  required: boolean;
  shipping_method: string | null;
}

export interface OrderEventCustomerDto {
  email: string | null;
  first_name: string | null;
  /** The customer's id in the source platform's system. */
  id: string | null;
  last_name: string | null;
  phone: string | null;
}

export interface OrderEventDto {
  customer: OrderEventCustomerDto;
  delivery: OrderDeliveryDto;
  event: OrderEventInfoDto;
  order: OrderInfoDto;
  source: OrderEventSourceDto;
}

export interface OrderEventInfoDto {
  /** The source platform's API version string. */
  api_version: string;
  /** The connector-assigned id for this event. Shopify uses its webhook delivery id, which also doubles as the Idempotency-Key header value. */
  id: string;
  /** @format date-time */
  occurred_at: string;
  /**
   * Event type, e.g. "order.paid". An open string, not a closed enum, so a connector can introduce a new event type without a hikyaku-api change.
   * @example "order.paid"
   */
  type: string;
}

export interface OrderEventSourceDto {
  /** The connector app's own version string. */
  app_version: string;
  /**
   * Lowercase connector slug (e.g. "shopify"). An open, validated string — never a closed enum. hikyaku-api never learns a platform name as code; every future connector needs zero hikyaku-api changes to add one.
   * @example "shopify"
   */
  platform: string;
  /** The storefront's own domain, when the platform has one. */
  shop_domain?: string | null;
}

export interface OrderInfoDto {
  /** @format date-time */
  created_at: string;
  /** ISO 4217 currency code. */
  currency: string;
  financial_status: string | null;
  fulfillment_status: string | null;
  /** The order's id in the source platform's system. Shopify sends its GraphQL global id here. */
  id: string;
  /** The order's numeric/legacy id in the source platform, where one exists. */
  legacy_id: number;
  line_items: OrderLineItemDto[];
  /** Human-facing order name/number, e.g. "#1001". */
  name: string;
  note: string | null;
  /** @format date-time */
  processed_at: string | null;
  subtotal_price: string | null;
  tags: string[];
  /** Decimal string, matching `currency`. */
  total_price: string;
  /** Decimal string, matching `currency`. */
  total_shipping: string;
  total_tax: string | null;
  total_weight_grams: number | null;
}

export interface OrderLineItemDto {
  grams: number;
  id: string;
  /** Decimal string, matching the source currency. */
  price: string;
  quantity: number;
  requires_shipping: boolean;
  sku: string | null;
  title: string;
  variant_title: string | null;
}

export interface OrgIssuingStatusDto {
  /**
   * As on the status endpoint. Null when the org has no account.
   * @example "active"
   */
  cardIssuingStatus: string | null;
  /** Whether the connected account can accept payments — gates "Service Rates". */
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  /**
   * Organisation slug.
   * @example "acme-logistics"
   */
  slug: string;
}

export interface PackageDimensionsDto {
  /**
   * Height in centimetres.
   * @example 15
   */
  heightCm: number;
  /**
   * Length in centimetres.
   * @example 30
   */
  lengthCm: number;
  /**
   * Weight in kilograms.
   * @example 2.5
   */
  weightKg: number;
  /**
   * Width in centimetres.
   * @example 20
   */
  widthCm: number;
}

export interface PackageDto {
  /** @format date-time */
  createdAt: string;
  /**
   * The hard deadline (package_delivery_window.scheduled_arrival). Null means the package has no promise and may be bumped to make room.
   * @format date-time
   */
  deadlineAt: string | null;
  deliveryNotes: string | null;
  /** @format uuid */
  fromCustomerId: string;
  /** @format uuid */
  id: string;
  /** @format uuid */
  organisationId: string;
  /** Required skills (skills.id) this delivery needs. Empty means no skill requirement. */
  skillIds: string[];
  /** Latest package_timeline status enum, e.g. PENDING, ASSIGNED. */
  status: string;
  /** @format uuid */
  toCustomerId: string;
  /** Generated or client-supplied tracking number. */
  trackingNumber: string;
  /** @format uuid */
  warehouseId: string | null;
}

export interface PaginatedCustomersDto {
  /** One page of customers, newest first. Shorter than `pageSize` on the last page, and empty past the end. */
  data: CustomerDto[];
  /**
   * Total customers in the organisation, ignoring pagination — divide by `pageSize` for the page count.
   * @example 137
   */
  total: number;
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

export interface PendingInvitationDto {
  /** @format date-time */
  created_at: string;
  /** @format uuid */
  id: string;
  organisation: InvitationOrganisationDto;
  /**
   * Permissions granted alongside the role. Empty when the invitation carries none.
   * @example ["team_members.view","vehicles.view"]
   */
  permissions: string[];
  /**
   * Role the invitee is granted on acceptance.
   * @example "Driver"
   */
  role: string;
}

export interface PlantInfoDto {
  /** Manufacturing city. */
  city?: string;
  /** Plant code, from VIN position 11. */
  code: string;
  /** Manufacturing country. */
  country: string;
  manufacturer?: string;
}

export interface ProposedDrivingLimitsDto {
  /** Proposed cap on total route distance, metres. */
  maxDistanceM: number | null;
  /** Proposed cap on travel-only time, seconds. */
  maxDrivingSeconds: number | null;
  /** Proposed cap on job stop count. */
  maxStops: number | null;
  /** Proposed cap on elapsed departure-to-return time, seconds. */
  maxWorkingSeconds: number | null;
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

export interface QuoteLineDto {
  /**
   * Line total in minor units — `rate × quantity`, rounded.
   * @example 10500
   */
  amount_minor: number;
  /**
   * Stripe product id of the service or add-on this line bills.
   * @example "prod_QhX1a2B3c4D5e6"
   */
  id: string;
  /** @example "Same-day courier" */
  name: string;
  /** @example "per_km" */
  pricing_unit: QuoteLineDtoPricingUnitEnum;
  /**
   * Units billed, derived server-side from the booking: 1 for `per_delivery`, the recipient count for `per_recipient`, and the measured route distance or parcel weight otherwise. Fractional for the distance and weight units.
   * @example 8.4
   */
  quantity: number;
  /**
   * Per-unit rate in major units (e.g. dollars), for display beside the quantity. Derived from the Stripe price.
   * @example 12.5
   */
  rate: number;
}

/** @example "per_km" */
export type QuoteLineDtoPricingUnitEnum =
  | "per_delivery"
  | "per_km"
  | "per_mi"
  | "per_kg"
  | "per_lb"
  | "per_recipient";

export interface QuoteResultDto {
  /**
   * Lower-case ISO 4217 code shared by every line, taken from the first line. Falls back to `usd` for an empty quote.
   * @example "usd"
   */
  currency: string;
  /** The chosen service first, then each selected add-on in the order it was requested. */
  lines: QuoteLineDto[];
  /**
   * `total_minor` expressed in major units, for display. Never use it to reconcile against Stripe — `total_minor` is the exact figure.
   * @example 117.5
   */
  total: number;
  /**
   * Sum of every line’s `amount_minor`.
   * @example 11750
   */
  total_minor: number;
}

export interface ReactivateUsersDto {
  /**
   * Users to lift the deactivation ban from. Each is processed independently — see the response’s `failed` array.
   * @minItems 1
   */
  user_ids: string[];
}

export interface ReactivateUsersResultDto {
  /** Users left untouched, with the reason for each. */
  failed: UserBatchFailureDto[];
  /** Users whose deactivation ban was lifted. */
  reactivated: string[];
}

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

export interface RecordedOrderEventDto {
  /**
   * The integration_order_event row id.
   * @format uuid
   */
  id: string;
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

export interface ServiceCatalogDto {
  /** The organisation’s bookable services, oldest first. Empty when the organisation has not connected a Stripe account, or when no `x-org-slug` was supplied. */
  services: CatalogServiceDto[];
}

export interface ServiceRefDto {
  /**
   * Stripe product id of the created or updated item. Stable across price edits.
   * @example "prod_QhX1a2B3c4D5e6"
   */
  id: string;
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

export interface ShiftDto {
  /** @format uuid */
  driverId: string | null;
  drivingLimits: DrivingLimitsDto;
  /** Whether DRIVING_LIMITS is on for this process. Lets a client tell "off" apart from "on, nothing configured" without a second call to the diagnostics summary endpoint. */
  drivingLimitsEnabled: boolean;
  /**
   * vrp_optimization.id.
   * @format uuid
   */
  id: string;
  /** @format uuid */
  organisationId: string;
  /** Bumped on every plan rewrite. */
  revision: number;
  /**
   * vrp_route.id of the single route, or null while the shift is empty.
   * @format uuid
   */
  routeId: string | null;
  /** @format date-time */
  scheduledStart: string | null;
  /** @format date */
  shiftDate: string;
  /** `planned` is the only state open to automatic assignment, and only until 15 minutes before scheduledStart. */
  status: ShiftDtoStatusEnum;
  /** Job steps on the route, excluding depot start/end. */
  stopCount: number;
  /** @format date-time */
  updatedAt: string;
  /** @format uuid */
  vehicleId: string | null;
  /** @format uuid */
  warehouseId: string | null;
}

/** `planned` is the only state open to automatic assignment, and only until 15 minutes before scheduledStart. */
export type ShiftDtoStatusEnum =
  | "planned"
  | "dispatched"
  | "completed"
  | "cancelled";

export interface ShiftPackageOutcomeDto {
  /** False when the package was already claimed elsewhere. */
  added: boolean;
  /** @format uuid */
  packageId: string;
  /** Set when the package was added but breaks something — e.g. its own deadline, or another stop’s. The dispatcher decided; we record it. */
  warning?: string | null;
}

export interface ShiftPlanDto {
  packages: ShiftPackageOutcomeDto[];
  shift: ShiftDto;
}

export interface ShiftUsageStatusDto {
  /**
   * Shifts included before overage billing applies. PLACEHOLDER — see create-stripe-subscriptions.ps1 for the actual figure per org type.
   * @example 30
   */
  freeAllowance: number;
  /**
   * Whether the organisation has a payment method on file. Once `shiftsUsedThisPeriod` reaches `freeAllowance`, further shift creation is blocked (HTTP 400 / check_violation) unless this is true.
   * @example false
   */
  hasPaymentMethod: boolean;
  /**
   * ISO 8601 instant the free allowance resets (start of next calendar month).
   * @example "2026-09-01T00:00:00.000Z"
   */
  periodEnd: string;
  /**
   * Shifts created by this organisation so far this calendar month.
   * @example 23
   */
  shiftsUsedThisPeriod: number;
}

export interface ShiftVersionDto {
  /** @format uuid */
  id: string;
  /** Compare against the loaded value; differs means replan. */
  revision: number;
  status: ShiftVersionDtoStatusEnum;
  stopCount: number;
  /** @format date-time */
  updatedAt: string;
}

export type ShiftVersionDtoStatusEnum =
  | "planned"
  | "dispatched"
  | "completed"
  | "cancelled";

export interface TrialStatusDto {
  /**
   * Whole days remaining, floored — so the final day reads 0, not 1. Null when `state` is `none`, and 0 rather than negative once expired.
   * @example 6
   */
  daysRemaining: number | null;
  /**
   * `none` — no trial applies to this organisation, which is the case for personal orgs and for orgs created before trials existed. They are unrestricted, NOT expired. `active` — trial running. `expired` — the deadline has passed and tenant-scoped endpoints answer 402.
   * @example "active"
   */
  state: TrialStatusDtoStateEnum;
  /**
   * ISO 8601 instant the trial ends, or null when `state` is `none`. Returned raw so the dashboard can render it in the viewer’s locale.
   * @example "2026-08-22T04:12:57.000Z"
   */
  trialEndsAt: string | null;
}

/**
 * `none` — no trial applies to this organisation, which is the case for personal orgs and for orgs created before trials existed. They are unrestricted, NOT expired. `active` — trial running. `expired` — the deadline has passed and tenant-scoped endpoints answer 402.
 * @example "active"
 */
export type TrialStatusDtoStateEnum = "none" | "active" | "expired";

export interface TzdataStatusDto {
  /** Present only when importState is "failed". */
  error?: string;
  /** What this instance has observed/done for the background boot-time import. */
  importState: TzdataStatusDtoImportStateEnum;
  /** Live check: whether tzdata.timezone currently has rows. Authoritative regardless of whether this instance ran the import itself. */
  populated: boolean;
  /** ISO timestamp of the last state transition on this instance. */
  updatedAt: string;
}

/** What this instance has observed/done for the background boot-time import. */
export type TzdataStatusDtoImportStateEnum =
  | "idle"
  | "checking"
  | "downloading"
  | "importing"
  | "completed"
  | "skipped_already_populated"
  | "skipped_locked_elsewhere"
  | "failed";

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

export interface UpdateUserRoleDto {
  /**
   * Role name, must match an existing app_roles.name — e.g. `Driver`. An unknown name is rejected with 400.
   * @example "Driver"
   */
  role_name: string;
  /**
   * The team member whose role changes. Must already belong to the organisation resolved from `X-Organisation-Slug`.
   * @format uuid
   */
  user_id: string;
}

export interface UpdateUserRoleResultDto {
  /**
   * The role now in effect, resolved from the requested name.
   * @example "Driver"
   */
  role: string;
  /** @format uuid */
  user_id: string;
}

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

export interface UserBatchFailureDto {
  /** Human-readable cause, e.g. "Cannot deactivate your own account". For display only — do not branch on the text. */
  reason: string;
  /** @format uuid */
  user_id: string;
}

export interface VanityUrlStatusDto {
  /**
   * Whether the organisation is currently entitled to a vanity booking subdomain (<vanity_slug>.hikyaku.org). True for a grandfathered company org unconditionally, otherwise mirrors the live vanity_url Stripe entitlement synced from that org's Billing customer.
   * @example true
   */
  hasVanityUrlEntitlement: boolean;
}

export interface VehicleInfoDto {
  /** @example "SUV" */
  bodyStyle?: string;
  doors?: string;
  /** @example "AWD" */
  driveType?: string;
  engineType?: string;
  fuelType?: string;
  /** Gross Vehicle Weight Rating. */
  gvwr?: string;
  /** @example "Hyundai" */
  make: string;
  manufacturer?: string;
  /** @example "Kona" */
  model: string;
  series?: string;
  transmission?: string;
  trim?: string;
  /** @example 2023 */
  year: number;
}

export interface VinComponentsDto {
  checkDigit?: CheckDigitResultDto;
  engine?: EngineInfoDto;
  modelYear?: ModelYearResultDto;
  plant?: PlantInfoDto;
  vehicle?: VehicleInfoDto;
  wmi?: WmiResultDto;
}

export interface VinDecodeResultDto {
  components: VinComponentsDto;
  errors: DecodeErrorDto[];
  /** False when the VIN failed structural validation (length, check digit) or its WMI is unknown — see `errors` for why. `components` may still carry partial data in that case. */
  valid: boolean;
  /** The VIN that was decoded, as submitted. */
  vin: string;
}

export interface WmiResultDto {
  /** 3-character World Manufacturer Identifier. */
  code: string;
  /** Manufacturing country. */
  country: string;
  make: string;
  manufacturer: string;
  /** Geographic region. */
  region: string;
  vehicleType: string;
}
