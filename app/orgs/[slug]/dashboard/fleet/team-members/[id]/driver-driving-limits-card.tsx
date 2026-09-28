"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    LIMIT_DIMENSION_LABELS,
    formatDimensionValue,
    type DrivingLimitProfile,
    type DrivingLimitValues,
    type LimitDimension,
} from "@/lib/driving-limits"
import { DRIVERS_UPDATE, describeWriteError, permissionRequiredMessage } from "@/lib/permissions"
import {
    getDriverDrivingLimitProfileId,
    getDrivingLimitProfiles,
    getOrganisationDrivingLimitDefault,
    setDriverDrivingLimitProfile,
} from "@/lib/supabase/db"

/** Select value for "no profile of their own". It cannot match a uuid. */
const NO_PROFILE = "none"

const DIMENSION_COLUMNS: { dimension: LimitDimension; column: keyof DrivingLimitValues }[] = [
    { dimension: "working", column: "max_working_seconds" },
    { dimension: "driving", column: "max_driving_seconds" },
    { dimension: "distance", column: "max_distance_m" },
    { dimension: "stops", column: "max_stops" },
]

type CardState =
    | { status: "loading" }
    | { status: "error" }
    | { status: "not-driver" }
    | {
          status: "ready"
          organisationId: string
          profiles: DrivingLimitProfile[]
          /** Null when the driver has no live profile. */
          profileId: string | null
          defaultProfile: DrivingLimitProfile | null
      }

/** The driver's driving limit profile, and each limit after the organisation default applies. */
export function DriverDrivingLimitsCard({
    driverId,
    slug,
    canEdit,
}: {
    driverId: string
    slug: string
    canEdit: boolean
}) {
    const [state, setState] = useState<CardState>({ status: "loading" })
    const [isSaving, setIsSaving] = useState(false)

    const load = useCallback(async () => {
        setState({ status: "loading" })

        try {
            const organisation = await getOrganisationDrivingLimitDefault(slug)
            const [profiles, driver] = await Promise.all([
                getDrivingLimitProfiles(organisation.organisationId),
                getDriverDrivingLimitProfileId(driverId, organisation.organisationId),
            ])

            if (!driver.isDriver) {
                setState({ status: "not-driver" })
                return
            }

            const byId = new Map(profiles.map((profile) => [profile.id, profile]))
            setState({
                status: "ready",
                organisationId: organisation.organisationId,
                profiles,
                profileId: driver.profileId && byId.has(driver.profileId) ? driver.profileId : null,
                defaultProfile: organisation.defaultProfileId ? byId.get(organisation.defaultProfileId) ?? null : null,
            })
        } catch (error) {
            console.error(error)
            setState({ status: "error" })
        }
    }, [driverId, slug])

    useEffect(() => {
        void load()
    }, [load])

    async function handleChange(value: string | null) {
        if (state.status !== "ready") return

        const nextProfileId = value && value !== NO_PROFILE ? value : null
        if (nextProfileId === state.profileId) return

        setIsSaving(true)

        try {
            // Change the picker only after the write succeeds.
            await setDriverDrivingLimitProfile(driverId, state.organisationId, nextProfileId)
            setState({ ...state, profileId: nextProfileId })

            const nextProfile = state.profiles.find((profile) => profile.id === nextProfileId)
            toast.success(
                nextProfile
                    ? `This driver is now planned within "${nextProfile.name}".`
                    : state.defaultProfile
                        ? `This driver now follows the organisation default, "${state.defaultProfile.name}".`
                        : "This driver no longer has driving limits."
            )
        } catch (error) {
            console.error(error)
            toast.error(describeWriteError(error, DRIVERS_UPDATE, "Could not change this driver's driving limits."))
        } finally {
            setIsSaving(false)
        }
    }

    const heading = (
        <div>
            <h2 className="font-medium">Driving Limits</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
                Automatic assignment plans this driver&apos;s shifts within these limits. Without a profile of
                their own, the organisation default applies. Changes apply the next time a shift is planned.
            </p>
        </div>
    )

    if (state.status === "loading") {
        return (
            <div className="space-y-4" data-testid="driver-driving-limits">
                {heading}
                <div className="h-16 w-full animate-pulse rounded-md bg-muted/40" />
            </div>
        )
    }

    if (state.status === "error") {
        return (
            <div className="space-y-4" data-testid="driver-driving-limits">
                {heading}
                <div className="flex h-24 w-full items-center justify-center rounded-md border border-destructive/40 bg-destructive/5 px-6 text-center">
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Could not load this driver&apos;s driving limits</p>
                        <Button variant="outline" size="sm" onClick={() => void load()}>
                            Try again
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    if (state.status === "not-driver") {
        return (
            <div className="space-y-4" data-testid="driver-driving-limits">
                {heading}
                <p className="text-sm text-muted-foreground" data-testid="driver-driving-limits-not-driver">
                    Driving limits apply only to drivers. This team member is not a driver.
                </p>
            </div>
        )
    }

    const { profiles, profileId, defaultProfile } = state
    const ownProfile = profiles.find((profile) => profile.id === profileId) ?? null
    const selectedLabel = ownProfile?.name ?? "No profile of their own"

    return (
        <div className="space-y-4" data-testid="driver-driving-limits">
            {heading}

            <div className="flex flex-wrap items-end gap-4">
                <div className="w-full max-w-sm space-y-2">
                    <p className="text-sm text-muted-foreground" id="driver-driving-limit-label">
                        Profile
                    </p>
                    <Select
                        value={profileId ?? NO_PROFILE}
                        onValueChange={(value) => void handleChange(value as string | null)}
                        disabled={!canEdit || isSaving}
                    >
                        <SelectTrigger aria-labelledby="driver-driving-limit-label" data-testid="driver-driving-limit-select">
                            <SelectValue>{selectedLabel}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={NO_PROFILE}>No profile of their own</SelectItem>
                            {profiles.map((profile) => (
                                <SelectItem key={profile.id} value={profile.id}>
                                    {profile.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button variant="link" size="sm" render={<Link href={`/orgs/${slug}/dashboard/fleet/driving-limits`} />}>
                    Manage profiles
                </Button>
            </div>

            {!canEdit && (
                <p className="text-sm text-muted-foreground" data-testid="driver-driving-limits-permission-note">
                    {permissionRequiredMessage(DRIVERS_UPDATE)}
                </p>
            )}

            <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4" data-testid="driver-driving-limits-effective">
                {DIMENSION_COLUMNS.map(({ dimension, column }) => {
                    const own = ownProfile?.[column] ?? null
                    const fallback = defaultProfile?.[column] ?? null
                    const value = own ?? fallback

                    return (
                        <div key={dimension}>
                            <dt className="text-muted-foreground">{LIMIT_DIMENSION_LABELS[dimension]}</dt>
                            <dd className="font-medium" data-testid={`driver-driving-limit-${dimension}`}>
                                {value == null ? "No limit" : formatDimensionValue(dimension, value)}
                            </dd>
                            {value != null && (
                                <dd className="text-xs text-muted-foreground">
                                    {own != null ? `From "${ownProfile?.name}"` : `From the organisation default, "${defaultProfile?.name}"`}
                                </dd>
                            )}
                        </div>
                    )
                })}
            </dl>
        </div>
    )
}
