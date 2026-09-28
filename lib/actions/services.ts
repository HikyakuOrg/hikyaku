"use server"

import { revalidatePath, updateTag } from "next/cache"
import type {
    CreateAddonDto,
    CreateServiceDto,
    CreateServiceDtoPricingUnitEnum,
    ServiceRefDto,
    UpdateServiceDto,
} from "@/lib/api"
import { type ActionError, buildApiContext, parseApiError } from "./api-client"

export type PricingUnit = CreateServiceDtoPricingUnitEnum

export type CreateServiceInput = CreateServiceDto

export type CreateAddonInput = CreateAddonDto

/**
 * Changes to a service or add-on. Only the given fields change; the currency
 * cannot change. Services and add-ons use the same body.
 */
export type UpdateCatalogItemInput = UpdateServiceDto

type ActionOk<T> = { success: true; data: T }

/** Refresh the catalog cache and page after a change. `updateTag` shows the change on the next read. */
function revalidateCatalog(slug: string) {
    updateTag(`catalog:${slug}`)
    revalidatePath(`/orgs/${slug}/dashboard/service-rates`)
}

async function mutate<T>(
    path: string,
    method: "POST" | "PATCH" | "DELETE",
    body?: unknown,
): Promise<ActionOk<T> | ActionError> {
    const ctx = await buildApiContext()
    if ("error" in ctx) return ctx

    let res: Response
    try {
        res = await fetch(`${ctx.apiUrl}${path}`, {
            method,
            headers: ctx.headers,
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        })
    } catch {
        return { success: false, error: "Could not reach the server. Check your connection." }
    }

    if (!res.ok) return { success: false, error: await parseApiError(res) }
    revalidateCatalog(ctx.slug)
    // Archive routes return an empty body; the others return a ServiceRefDto.
    const data = method === "DELETE" ? null : await res.json().catch(() => null)
    return { success: true, data: data as T }
}

export async function createService(input: CreateServiceInput) {
    return mutate<ServiceRefDto>("/api/v1/services", "POST", input)
}

export async function updateService(id: string, input: UpdateCatalogItemInput) {
    return mutate<ServiceRefDto>(`/api/v1/services/${id}`, "PATCH", input)
}

export async function deleteService(id: string) {
    return mutate<null>(`/api/v1/services/${id}`, "DELETE")
}

export async function createServiceAddon(serviceId: string, input: CreateAddonInput) {
    return mutate<ServiceRefDto>(`/api/v1/services/${serviceId}/addons`, "POST", input)
}

export async function updateServiceAddon(addonId: string, input: UpdateCatalogItemInput) {
    return mutate<ServiceRefDto>(`/api/v1/services/addons/${addonId}`, "PATCH", input)
}

export async function deleteServiceAddon(addonId: string) {
    return mutate<null>(`/api/v1/services/addons/${addonId}`, "DELETE")
}
