import { createClient } from '@/lib/supabase/server'

/**
 * Personal accounts get one warehouse; company orgs have no limit. The
 * `warehouse_personal_org_limit` trigger enforces this. Keep this number the
 * same as `v_limit` in that trigger.
 */
export const PERSONAL_ORG_WAREHOUSE_LIMIT = 1

export type WarehouseAllowance = {
    /** Null when the org does not exist or the caller cannot see it. */
    orgType: 'personal' | 'company' | null
    /** Null means no limit. */
    limit: number | null
    /** Counted only when there is a limit. */
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
 * Whether the org can add another warehouse. Filtered by organisation because
 * RLS shows warehouses from every org the user belongs to.
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
        // Fail closed: hide the button.
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
