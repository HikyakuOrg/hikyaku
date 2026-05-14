import { createClient } from "@/lib/supabase/server"
import { getAppRoles } from "@/lib/supabase/db-server"
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
    const [permissions, roles] = await Promise.all([
        getPermissions(supabase),
        getAppRoles(),
    ])

    const roleNames = roles.map((r) => r.name)

    return (
        <TeamMembersList
            canAdd={permissions.canAdd}
            canEdit={permissions.canEdit}
            canDelete={permissions.canDelete}
            roles={roleNames}
        />
    )
}
