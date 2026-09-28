import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DRIVERS_UPDATE } from "@/lib/permissions"
import { hasOrgPermission } from "@/lib/supabase/server"

import { DrivingLimitProfileForm } from "../driving-limit-profile-form"

export default async function AddDrivingLimitProfilePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    // Check here too: users can open this URL directly.
    const canEdit = await hasOrgPermission(slug, DRIVERS_UPDATE)

    return (
        <div className="space-y-6 p-6">
            <Button variant="ghost" size="sm" render={<Link href={`/orgs/${slug}/dashboard/fleet/driving-limits`} />}>
                <ChevronLeft className="size-4" />
                All driving limit profiles
            </Button>

            <div>
                <h1 className="mb-2 text-3xl font-bold tracking-tight">Add Driving Limit Profile</h1>
                <p className="text-muted-foreground">
                    Name the profile and fill in the limits you need. Blank fields have no limit.
                </p>
            </div>

            <div className="max-w-4xl">
                <DrivingLimitProfileForm canEdit={canEdit} />
            </div>
        </div>
    )
}
