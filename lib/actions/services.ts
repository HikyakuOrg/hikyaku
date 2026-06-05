"use server"

import { revalidatePath, updateTag } from "next/cache"
import { type ActionError, buildApiContext, parseApiError } from "./api-client"

export type PricingUnit =
    | "per_delivery"
    | "per_km"
    | "per_mi"
    | "per_kg"
    | "per_lb"
    | "per_recipient"

export interface CreateServiceInput {
    name: string
    amountMajor: number
    pricingUnit: PricingUnit
    currency?: string
}

export interface CreateAddonInput {
    name: string
    amountMajor: number
    pricingUnit: PricingUnit
}

/** Edit a service/add-on. Only the supplied fields change; currency is fixed. */
export interface UpdateCatalogItemInput {
    name?: string
    amountMajor?: number
    pricingUnit?: PricingUnit
}

type ActionOk<T> = { success: true; data: T }

/**
 * Invalidate the catalog cache + dashboard page after a mutation. `updateTag`
 * (Next 16) is the Server-Action variant — 1 arg, with read-your-own-writes so
 * the dashboard refetch immediately reflects the change.
 */
function revalidateCatalog(slug: string) {
    updateTag(`catalog:${slug}`)
    revalidatePath(`/orgs/${slug}/dashboard/service-rates`)
}

async function mutate(
    path: string,
    method: "POST" | "PATCH" | "DELETE",
    body?: unknown,
): Promise<ActionOk<unknown> | ActionError> {
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
    const data = method === "DELETE" ? null : await res.json().catch(() => null)
    return { success: true, data }
}

export async function createService(input: CreateServiceInput) {
    return mutate("/api/v1/services", "POST", input)
}

export async function updateService(id: string, input: UpdateCatalogItemInput) {
    return mutate(`/api/v1/services/${id}`, "PATCH", input)
}

export async function deleteService(id: string) {
    return mutate(`/api/v1/services/${id}`, "DELETE")
}

export async function createServiceAddon(serviceId: string, input: CreateAddonInput) {
    return mutate(`/api/v1/services/${serviceId}/addons`, "POST", input)
}

export async function updateServiceAddon(addonId: string, input: UpdateCatalogItemInput) {
    return mutate(`/api/v1/services/addons/${addonId}`, "PATCH", input)
}

export async function deleteServiceAddon(addonId: string) {
    return mutate(`/api/v1/services/addons/${addonId}`, "DELETE")
}
