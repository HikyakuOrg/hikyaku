"use server"

import { getAccessToken, getApiUrl, getOrgSlug } from "./api-client"
import type { CustomerFormValues } from "@/components/customers/customer-schema"

const API_URL = getApiUrl() ?? "http://localhost:3002"

async function buildHeaders(): Promise<Record<string, string>> {
    const auth = await getAccessToken()
    if ("error" in auth) throw new Error(auth.error)

    const orgSlug = await getOrgSlug()
    if (!orgSlug) throw new Error("No active organisation.")

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.accessToken}`,
        "X-Organisation-Slug": orgSlug,
    }
}

async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
    const hdrs = await buildHeaders()
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: { ...hdrs, ...(options.headers ?? {}) },
        cache: "no-store",
    })
    if (!res.ok) {
        const body = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
        throw new Error(body?.message ?? `HTTP ${res.status}`)
    }
    return res.json()
}

function toApiBody(values: CustomerFormValues) {
    return {
        name: values.customerName,
        phone: values.customerPhone,
        email: values.customerEmail || undefined,
        address: {
            street: values.customerAddress,
            suburb: values.customerSuburb,
            state: values.customerState,
            postcode: values.customerPostcode,
            country: values.customerCountry,
        },
        lat: values.customerLat,
        lon: values.customerLon,
        confidence: values.customerConfidence,
        peliasGid: values.customerPeliasGid,
        peliasRaw: values.customerPeliasRaw,
    }
}

// ── Write ──────────────────────────────────────────────────────────────────────

export async function createCustomerAction(values: CustomerFormValues): Promise<Customer> {
    return apiCall<Customer>("/api/v1/customers", {
        method: "POST",
        body: JSON.stringify(toApiBody(values)),
    })
}

export async function updateCustomerAction(customerId: string, values: CustomerFormValues): Promise<Customer> {
    return apiCall<Customer>(`/api/v1/customers/${customerId}`, {
        method: "PUT",
        body: JSON.stringify(toApiBody(values)),
    })
}

// ── Read ───────────────────────────────────────────────────────────────────────

export async function listCustomersAction(page: number, pageSize: number): Promise<{ data: Customer[]; total: number }> {
    return apiCall<{ data: Customer[]; total: number }>(
        `/api/v1/customers?page=${page}&pageSize=${pageSize}`,
    )
}

export async function getCustomerAction(customerId: string): Promise<Customer> {
    return apiCall<Customer>(`/api/v1/customers/${customerId}`)
}

export async function searchCustomersAction(query: string): Promise<Customer[]> {
    if (!query || query.length < 2) return []
    return apiCall<Customer[]>(`/api/v1/customers/search?q=${encodeURIComponent(query)}`)
}

export async function getCustomersByIdsAction(ids: string[]): Promise<Customer[]> {
    if (!ids.length) return []
    return apiCall<Customer[]>("/api/v1/customers/by-ids", {
        method: "POST",
        body: JSON.stringify({ ids }),
    })
}

/**
 * Batch-fetch customers by their Stripe customer IDs.
 * Returns a map of stripeCustomerId → Customer for easy lookup in enrichment.
 */
export async function getCustomersByStripeIdsAction(
    stripeIds: string[],
): Promise<Record<string, Customer>> {
    if (!stripeIds.length) return {}
    const customers = await apiCall<Customer[]>("/api/v1/customers/by-stripe-ids", {
        method: "POST",
        body: JSON.stringify({ stripeIds }),
    })
    return Object.fromEntries(
        customers
            .filter((c) => c.stripe_customer_id)
            .map((c) => [c.stripe_customer_id!, c]),
    )
}
