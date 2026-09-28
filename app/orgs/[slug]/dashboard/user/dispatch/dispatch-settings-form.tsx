"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useId, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field"
import { sameDispatchSettings, type DispatchSettings } from "@/lib/dispatch-settings"
import { ORGANISATION_EDIT, describeWriteError, permissionRequiredMessage } from "@/lib/permissions"
import { orgPath } from "@/lib/subdomain"
import { saveOrganisationDispatchSettings } from "@/lib/supabase/db"

export function DispatchSettingsForm({
    slug,
    organisationId,
    settings,
    canEdit,
}: {
    slug: string
    organisationId: string
    settings: DispatchSettings
    /** Whether the user has `organisation.edit`. For the UI only; RLS enforces it. */
    canEdit: boolean
}) {
    const router = useRouter()
    const [saved, setSaved] = useState(settings)
    const [draft, setDraft] = useState(settings)
    const [isSaving, setIsSaving] = useState(false)

    const isDirty = !sameDispatchSettings(draft, saved)
    const disabled = !canEdit || isSaving

    async function handleSave() {
        setIsSaving(true)

        try {
            const stored = await saveOrganisationDispatchSettings(organisationId, draft)
            setSaved(stored)
            setDraft(stored)
            toast.success("Dispatch settings saved. They apply from the next package.")
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error(describeWriteError(error, ORGANISATION_EDIT, "Could not save the dispatch settings."))
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Card data-testid="dispatch-settings">
            <CardHeader>
                <CardTitle>Automatic assignment</CardTitle>
                <CardDescription>
                    How new packages go on your drivers&apos; shifts. Changes apply to new packages only.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <FieldGroup className="gap-3">
                    <SettingOption
                        testId="dispatch-settings-assignment-mode"
                        title="Assign new packages automatically"
                        checked={draft.assignmentMode === "instant"}
                        onCheckedChange={(checked) =>
                            setDraft((current) => ({ ...current, assignmentMode: checked ? "instant" : "manual" }))
                        }
                        disabled={disabled}
                    >
                        Each new package goes on a driver&apos;s shift when it is created. If no shift has space, a
                        new shift starts. When off, new packages wait until a dispatcher assigns them.
                    </SettingOption>

                    <SettingOption
                        testId="dispatch-settings-load-spread"
                        title="Spread packages across vehicles"
                        checked={draft.loadSpreadEnabled}
                        onCheckedChange={(checked) =>
                            setDraft((current) => ({ ...current, loadSpreadEnabled: checked }))
                        }
                        disabled={disabled}
                    >
                        Use the vehicle with fewer stops when the extra driving is small, instead of filling one
                        vehicle first. Routes get longer, so on busy days this can start an extra shift. Applies to
                        automatic assignment only.
                    </SettingOption>

                    <SettingOption
                        testId="dispatch-settings-service-area-matching"
                        title="Match packages to service areas"
                        checked={draft.serviceAreaMatching}
                        onCheckedChange={(checked) =>
                            setDraft((current) => ({ ...current, serviceAreaMatching: checked }))
                        }
                        disabled={disabled}
                    >
                        Give each package to a driver whose service area includes the address, even if this starts a
                        new shift. Dispatchers get a warning when they assign a package outside the driver&apos;s area.
                        Drivers with no service area cover everywhere. Turn this on after you draw your{" "}
                        <Link href={orgPath(slug, "/dashboard/service/areas")}>service areas</Link> and add drivers
                        to them.
                    </SettingOption>
                </FieldGroup>

                {!canEdit && (
                    <p className="text-sm text-muted-foreground" data-testid="dispatch-settings-permission-note">
                        {permissionRequiredMessage(ORGANISATION_EDIT)}
                    </p>
                )}
            </CardContent>
            {canEdit && (
                <CardFooter className="justify-end gap-2">
                    <Button variant="outline" disabled={!isDirty || isSaving} onClick={() => setDraft(saved)}>
                        Reset
                    </Button>
                    <Button
                        disabled={!isDirty || isSaving}
                        onClick={() => void handleSave()}
                        data-testid="dispatch-settings-save"
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </Button>
                </CardFooter>
            )}
        </Card>
    )
}

/** One setting. The title labels the checkbox; the text describes it. */
function SettingOption({
    testId,
    title,
    checked,
    onCheckedChange,
    disabled,
    children,
}: {
    testId: string
    title: string
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    disabled: boolean
    children: ReactNode
}) {
    const id = useId()
    const titleId = `${id}-title`
    const descriptionId = `${id}-description`

    return (
        <FieldLabel>
            <Field orientation="horizontal" data-disabled={disabled}>
                <Checkbox
                    checked={checked}
                    onCheckedChange={(next) => onCheckedChange(next === true)}
                    disabled={disabled}
                    aria-labelledby={titleId}
                    aria-describedby={descriptionId}
                    data-testid={testId}
                />
                <FieldContent>
                    <FieldTitle id={titleId}>{title}</FieldTitle>
                    <FieldDescription id={descriptionId}>{children}</FieldDescription>
                </FieldContent>
            </Field>
        </FieldLabel>
    )
}
