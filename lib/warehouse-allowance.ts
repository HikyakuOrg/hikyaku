import { createClient } from '@/lib/supabase/server'

/**
 * Personal accounts get one warehouse; company orgs are unlimited.
 *
 * This mirrors the `warehouse_personal_org_limit` trigger in hikyaku-api
 * (migration 1786790000000). The database is the enforcement point — the app
 * writes to public.warehouse directly through PostgREST, so this module only
 * decides whether the UI offers the action. Keep the number here and the
 * `v_limit` constant in that migration in step.
 */
export const PERSONAL_ORG_WAREHOUSE_LIMIT = 1

export type WarehouseAllowance = {
    /** null when the org doesn't exist or the caller can't see it. */
    orgType: 'personal' | 'company' | null
    /** null means unlimited. */
    limit: number | null
    /** Only counted for capped orgs; always 0 when the limit is null. */
    used: number
    canAdd: boolean
}

const DENIED: WarehouseAllowance = {
    orgType: null,
    limit: null,
    used: 0,
    canAdd: false,
}

/**
 * Whether `slug`'s org may add another warehouse, and why not if it may not.
 *
 * Counting is scoped to the org by an explicit `organisation_id` filter rather
 * than left to RLS: a company-org member viewing their personal org can see
 * warehouses from both, and an unfiltered count would mix them.
 */
export async function getWarehouseAllowance(
    slug: string,
): Promise<WarehouseAllowance> {
    const supabase = await createClient()

    const { data: org } = await supabase
        .from('organisations')
        .select('id, org_type')
        .eq('slug', slug)
        .maybeSingle()

    if (!org) return DENIED

    if (org.org_type === 'company') {
        return { orgType: 'company', limit: null, used: 0, canAdd: true }
    }

    const { count, error } = await supabase
        .from('warehouse')
        .select('id', { count: 'exact', head: true })
        .eq('organisation_id', org.id)

    if (error) {
        // Fail closed. A count we couldn't read is a request that would most
        // likely fail on insert too, and hiding the button is a better outcome
        // than a form that 400s on submit.
        console.error(error)
        return { orgType: 'personal', limit: PERSONAL_ORG_WAREHOUSE_LIMIT, used: 0, canAdd: false }
    }

    const used = count ?? 0

    return {
        orgType: 'personal',
        limit: PERSONAL_ORG_WAREHOUSE_LIMIT,
        used,
        canAdd: used < PERSONAL_ORG_WAREHOUSE_LIMIT,
    }
}
