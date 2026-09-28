"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    LIMIT_DIMENSION_LABELS,
    formatDimensionValue,
    type DrivingLimitProfile,
    type DrivingLimitValues,
    type LimitDimension,
} from "@/lib/driving-limits"
import { ORGANISATION_EDIT, describeWriteError, permissionRequiredMessage } from "@/lib/permissions"
import { setOrganisationDrivingLimitDefault } from "@/lib/supabase/db"

/** Select value for "no default". It cannot match a uuid. */
const NO_DEFAULT = "none"

const DIMENSION_COLUMNS: { dimension: LimitDimension; column: keyof DrivingLimitValues }[] = [
    { dimension: "working", column: "max_working_seconds" },
    { dimension: "driving", column: "max_driving_seconds" },
    { dimension: "distance", column: "max_distance_m" },
    { dimension: "stops", column: "max_stops" },
]

export function OrganisationDrivingLimitDefaultForm({
    slug,
    organisationId,
    profiles,
    defaultProfileId,
    canEdit,
}: {
    slug: string
    organisationId: string
    profiles: DrivingLimitProfile[]
    defaultProfileId: string | null
    /** Whether the user has `organisation.edit`. For the UI only; RLS enforces it. */
    canEdit: boolean
}) {
    const router = useRouter()
    const [savedId, setSavedId] = useState(defaultProfileId)
    const [selectedId, setSelectedId] = useState(defaultProfileId)
    const [isSaving, setIsSaving] = useState(false)

    const selectedProfile = profiles.find((profile) => profile.id === selectedId) ?? null
    const isDirty = selectedId !== savedId

    async function handleSave() {
        setIsSaving(true)

        try {
            await setOrganisationDrivingLimitDefault(organisationId, selectedId)
            setSavedId(selectedId)
            toast.success(
                selectedProfile
                    ? `Drivers without a profile of their own now follow "${selectedProfile.name}".`
                    : "The organisation has no default. Drivers without a profile of their own have no driving limits."
            )
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error(describeWriteError(error, ORGANISATION_EDIT, "Could not save the organisation default."))
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Card data-testid="organisation-driving-limit-default">
            <CardHeader>
                <CardTitle>Organisation default</CardTitle>
                <CardDescription>
                    With no default, drivers without a profile of their own have no driving limits. Changes apply
                    the next time a shift is planned.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {profiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground" data-testid="organisation-driving-limit-no-profiles">
                        There are no profiles yet.{" "}
                        <Link
                            href={`/orgs/${slug}/dashboard/fleet/driving-limits/add`}
                            className="underline underline-offset-2 hover:text-foreground"
                        >
                            Create one under Fleet
                        </Link>
                        .
                    </p>
                ) : (
                    <div className="max-w-sm space-y-2">
                        <p className="text-sm text-muted-foreground" id="organisation-driving-limit-label">
                            Default profile
                        </p>
                        <Select
                            value={selectedId ?? NO_DEFAULT}
                            onValueChange={(value) => {
                                const next = value as string | null
                                setSelectedId(next && next !== NO_DEFAULT ? next : null)
                            }}
                            disabled={!canEdit || isSaving}
                        >
                            <SelectTrigger
                                aria-labelledby="organisation-driving-limit-label"
                                data-testid="organisation-driving-limit-select"
                            >
                                <SelectValue>{selectedProfile?.name ?? "No default"}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_DEFAULT}>No default</SelectItem>
                                {profiles.map((profile) => (
                                    <SelectItem key={profile.id} value={profile.id}>
                                        {profile.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {selectedProfile && (
                    <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                        {DIMENSION_COLUMNS.map(({ dimension, column }) => {
                            const value = selectedProfile[column]
                            return (
                                <div key={dimension}>
                                    <dt className="text-muted-foreground">{LIMIT_DIMENSION_LABELS[dimension]}</dt>
                                    <dd className="font-medium">
                                        {value == null ? "No limit" : formatDimensionValue(dimension, value)}
                                    </dd>
                                </div>
                            )
                        })}
                    </dl>
                )}

                {!canEdit && (
                    <p className="text-sm text-muted-foreground" data-testid="organisation-driving-limit-permission-note">
                        {permissionRequiredMessage(ORGANISATION_EDIT)}
                    </p>
                )}
            </CardContent>
            {canEdit && profiles.length > 0 && (
                <CardFooter className="justify-end gap-2">
                    <Button variant="outline" disabled={!isDirty || isSaving} onClick={() => setSelectedId(savedId)}>
                        Reset
                    </Button>
                    <Button
                        disabled={!isDirty || isSaving}
                        onClick={() => void handleSave()}
                        data-testid="organisation-driving-limit-save"
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </Button>
                </CardFooter>
            )}
        </Card>
    )
}
