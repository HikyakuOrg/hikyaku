import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getAppRoles, getAppPermissions } from "@/lib/supabase/db-server"
import { listMyOrganisations } from "@/lib/actions/organisations"
import { TeamMembersList } from "./team-members-list"

async function getPermissions(supabase: Awaited<ReturnType<typeof createClient>>) {
    const [addResult, editResult, deleteResult] = await Promise.all([
        supabase.rpc("has_permission", { p_permission: "team_members.add" }),
        supabase.rpc("has_permission", { p_permission: "team_members.edit" }),
        supabase.rpc("has_permission", { p_permission: "team_members.delete" }),
    ])
    return {
        canAdd: addResult.data ?? false,
        canEdit: editResult.data ?? false,
        canDelete: deleteResult.data ?? false,
    }
}

export default async function TeamMembersPage() {
    const supabase = await createClient()
    const [permissions, roles, appPermissions, organisations, hdrs] = await Promise.all([
        getPermissions(supabase),
        getAppRoles(),
        getAppPermissions(),
        listMyOrganisations(),
        headers(),
    ])

    const roleNames = roles.map((r) => r.name)
    const slug = hdrs.get("x-org-slug")
    const orgId = organisations.find((o) => o.slug === slug)?.id ?? null

    return (
        <TeamMembersList
            canAdd={permissions.canAdd}
            canEdit={permissions.canEdit}
            canDelete={permissions.canDelete}
            roles={roleNames}
            permissions={appPermissions}
            orgId={orgId}
        />
    )
}
