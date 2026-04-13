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

export interface CreateDriverDto {
  email: string;
  displayName: string;
  phoneNumber: string;
  driverLicense?: string | null;
  /** @example "yyyy-MM-dd" */
  licenseExpiry?: string | null;
  /** @format binary */
  file?: File;
}

export interface ListDriverDto {
  id: string;
  email: string;
  avatar_url: string | null;
  phone_number: string;
  display_name: string;
  driver_license: string | null;
  license_expiry: string | null;
  vehicle_id?: string
  vehicle_plate?: string
  vehicle_make?: string;
  vehicle_model?: string;
}

export interface PaginationMetaDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListDriverResponseDto {
  data: ListDriverDto[];
  meta: PaginationMetaDto;
}

export interface CreateVehicleDto {
  plate?: string;
  identificationNumber?: string;
  make?: string;
  year: string;
  model?: string;
  type: string;
}

export interface ListVehicleDto {
  id: string;
  plate?: string;
  identificationNumber?: string;
  make?: string;
  year: string;
  model?: string;
  type: string;
}

export interface ListVehicleResponseDto {
  data: ListVehicleDto[];
  meta: PaginationMetaDto;
}

export interface CreateVehicleTypeDto {
  name: string;
  description?: string | null;
}

export interface ListVehicleTypeDto {
  id: string;
  type: string;
  description: string | null;
}

export type CreateDriverShiftDto = object;

export type UpdateDriverShiftDto = object;

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown>
  extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "";
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) =>
    fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter(
      (key) => "undefined" !== typeof query[key],
    );
    return keys
      .map((key) =>
        Array.isArray(query[key])
          ? this.addArrayQueryParam(query, key)
          : this.addQueryParam(query, key),
      )
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.JsonApi]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.Text]: (input: any) =>
      input !== null && typeof input !== "string"
        ? JSON.stringify(input)
        : input,
    [ContentType.FormData]: (input: any) => {
      if (input instanceof FormData) {
        return input;
      }

      return Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
              ? JSON.stringify(property)
              : `${property}`,
        );
        return formData;
      }, new FormData());
    },
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(
    params1: RequestParams,
    params2?: RequestParams,
  ): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected createAbortSignal = (
    cancelToken: CancelToken,
  ): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<HttpResponse<T, E>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(
      `${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`,
      {
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData
            ? { "Content-Type": type }
            : {}),
        },
        signal:
          (cancelToken
            ? this.createAbortSignal(cancelToken)
            : requestParams.signal) || null,
        body:
          typeof body === "undefined" || body === null
            ? null
            : payloadFormatter(body),
      },
    ).then(async (response) => {
      const r = response as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const responseToParse = responseFormat ? response.clone() : response;
      const data = !responseFormat
        ? r
        : await responseToParse[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data;
    });
  };
}

/**
 * @title Whendan Logistics API
 * @version 1.0
 * @contact
 *
 * API Documentation for Whendan Logistics Server
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  api = {
    /**
     * No description
     *
     * @tags Drivers
     * @name DriversControllerCreate
     * @summary Create drivers
     * @request POST:/api/v1/drivers
     * @secure
     */
    driversControllerCreate: (
      data: CreateDriverDto,
      params: RequestParams = {},
    ) =>
      this.request<ListDriverDto, any>({
        path: `/api/v1/drivers`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.FormData,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Drivers
     * @name DriversControllerFindAll
     * @summary Get drivers
     * @request GET:/api/v1/drivers
     * @secure
     */
    driversControllerFindAll: (
      query?: {
        /** @example 30 */
        limit?: any;
        /** @example 1 */
        page?: any;
      },
      params: RequestParams = {},
    ) =>
      this.request<ListDriverResponseDto, any>({
        path: `/api/v1/drivers`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Drivers
     * @name DriversControllerFindOne
     * @summary Get driver
     * @request GET:/api/v1/drivers/{id}
     * @secure
     */
    driversControllerFindOne: (id: string, params: RequestParams = {}) =>
      this.request<ListDriverDto, any>({
        path: `/api/v1/drivers/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Drivers
     * @name DriversControllerUpdate
     * @summary Update driver
     * @request PATCH:/api/v1/drivers/{id}
     * @secure
     */
    driversControllerUpdate: (
      id: string,
      data: CreateDriverDto,
      params: RequestParams = {},
    ) =>
      this.request<ListDriverDto, any>({
        path: `/api/v1/drivers/${id}`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Drivers
     * @name DriversControllerRemove
     * @summary Delete driver
     * @request DELETE:/api/v1/drivers/{id}
     * @secure
     */
    driversControllerRemove: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/drivers/${id}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Vehicles
     * @name VehiclesControllerCreate
     * @summary Create a new vehicle
     * @request POST:/api/v1/vehicles
     * @secure
     */
    vehiclesControllerCreate: (
      data: CreateVehicleDto,
      params: RequestParams = {},
    ) =>
      this.request<ListVehicleDto, any>({
        path: `/api/v1/vehicles`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Vehicles
     * @name VehiclesControllerFindAll
     * @summary Get all vehicles
     * @request GET:/api/v1/vehicles
     * @secure
     */
    vehiclesControllerFindAll: (
      query?: {
        /** @example 30 */
        limit?: any;
        /** @example 1 */
        page?: any;
      },
      params: RequestParams = {},
    ) =>
      this.request<ListVehicleResponseDto, any>({
        path: `/api/v1/vehicles`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Vehicles
     * @name VehiclesControllerFindOne
     * @summary Get a specific vehicle by ID
     * @request GET:/api/v1/vehicles/{id}
     * @secure
     */
    vehiclesControllerFindOne: (id: string, params: RequestParams = {}) =>
      this.request<ListVehicleDto, any>({
        path: `/api/v1/vehicles/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Vehicles
     * @name VehiclesControllerUpdate
     * @summary Update a specific vehicle by ID
     * @request PATCH:/api/v1/vehicles/{id}
     * @secure
     */
    vehiclesControllerUpdate: (
      id: string,
      data: CreateVehicleDto,
      params: RequestParams = {},
    ) =>
      this.request<ListVehicleDto, any>({
        path: `/api/v1/vehicles/${id}`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Vehicles
     * @name VehiclesControllerRemove
     * @summary Delete a specific vehicle by ID
     * @request DELETE:/api/v1/vehicles/{id}
     * @secure
     */
    vehiclesControllerRemove: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/vehicles/${id}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Vehicle Types
     * @name VehicleTypesControllerCreate
     * @summary Create vehicle type
     * @request POST:/api/v1/vehicle-types
     * @secure
     */
    vehicleTypesControllerCreate: (
      data: CreateVehicleTypeDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/v1/vehicle-types`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Vehicle Types
     * @name VehicleTypesControllerFindAll
     * @summary Get vehicle types
     * @request GET:/api/v1/vehicle-types
     * @secure
     */
    vehicleTypesControllerFindAll: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/vehicle-types`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Vehicle Types
     * @name VehicleTypesControllerFindOne
     * @summary Get vehicle type
     * @request GET:/api/v1/vehicle-types/{id}
     * @secure
     */
    vehicleTypesControllerFindOne: (
      id: string,
      data: ListVehicleTypeDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/v1/vehicle-types/${id}`,
        method: "GET",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Vehicle Types
     * @name VehicleTypesControllerUpdate
     * @summary Update vehicle type
     * @request PATCH:/api/v1/vehicle-types/{id}
     * @secure
     */
    vehicleTypesControllerUpdate: (
      id: string,
      data: CreateVehicleTypeDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/v1/vehicle-types/${id}`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Vehicle Types
     * @name VehicleTypesControllerRemove
     * @summary Delete vehicle type
     * @request DELETE:/api/v1/vehicle-types/{id}
     * @secure
     */
    vehicleTypesControllerRemove: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/vehicle-types/${id}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags DriverShifts
     * @name DriverShiftsControllerCreate
     * @request POST:/api/v1/driver-shifts
     */
    driverShiftsControllerCreate: (
      data: CreateDriverShiftDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/v1/driver-shifts`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags DriverShifts
     * @name DriverShiftsControllerFindAll
     * @request GET:/api/v1/driver-shifts
     */
    driverShiftsControllerFindAll: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/driver-shifts`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags DriverShifts
     * @name DriverShiftsControllerFindOne
     * @request GET:/api/v1/driver-shifts/{id}
     */
    driverShiftsControllerFindOne: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/driver-shifts/${id}`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags DriverShifts
     * @name DriverShiftsControllerUpdate
     * @request PATCH:/api/v1/driver-shifts/{id}
     */
    driverShiftsControllerUpdate: (
      id: string,
      data: UpdateDriverShiftDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/v1/driver-shifts/${id}`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags DriverShifts
     * @name DriverShiftsControllerRemove
     * @request DELETE:/api/v1/driver-shifts/{id}
     */
    driverShiftsControllerRemove: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/driver-shifts/${id}`,
        method: "DELETE",
        ...params,
      }),
  };
}
