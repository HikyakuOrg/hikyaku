
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { getAppRoles, getAppPermissions, getVehicleTypes } from "@/lib/supabase/db-server";
import AddTeamMemberForm from "./add-team-member-form";

async function TeamMemberFormLoader() {
    const [roles, permissions, vehicleTypes] = await Promise.all([
        getAppRoles(),
        getAppPermissions(),
        getVehicleTypes(),
    ]);
    return <AddTeamMemberForm roles={roles} permissions={permissions} vehicleTypes={vehicleTypes} />;
}

export default function Page() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-[300px]">
                    <Loader2 className="w-10 h-10 animate-spin" />
                </div>
            }
        >
            <TeamMemberFormLoader />
        </Suspense>
    );
}
