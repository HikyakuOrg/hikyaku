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
    /** Whether the signed-in user holds `organisation.edit`. UI gating only; RLS refuses the write regardless. */
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
            toast.error(describeWriteError(error, ORGANISATION_EDIT, "Failed to save the dispatch settings."))
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Card data-testid="dispatch-settings">
            <CardHeader>
                <CardTitle>Automatic assignment</CardTitle>
                <CardDescription>
                    How new packages are placed on your drivers&apos; shifts. A change applies from the next package
                    placed; packages already on a shift are not moved.
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
                        Each new package is placed on a driver&apos;s shift as soon as it is created, and a new shift
                        is opened when no van already out has room. When off, new packages stay pending until a
                        dispatcher assigns them.
                    </SettingOption>

                    <SettingOption
                        testId="dispatch-settings-load-spread"
                        title="Spread packages across vans"
                        checked={draft.loadSpreadEnabled}
                        onCheckedChange={(checked) =>
                            setDraft((current) => ({ ...current, loadSpreadEnabled: checked }))
                        }
                        disabled={disabled}
                    >
                        Prefer the van carrying fewer stops when the extra driving is small, instead of filling one van
                        before starting the next. Routes get longer, so on a busy day this can open a shift that would
                        not otherwise have been needed. Only affects automatic assignment.
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
                        Give each package to a driver whose service area covers the delivery address, opening a shift
                        for one of them before sending it to a driver who does not work there, and warn dispatchers
                        who assign a package outside its driver&apos;s area. Drivers with no service area cover
                        everywhere. Turn this on once your{" "}
                        <Link href={orgPath(slug, "/dashboard/service/areas")}>service areas</Link> are drawn and
                        drivers are assigned to them.
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

/**
 * One setting as a choice card. The checkbox is named by the title alone and
 * described by the paragraph, rather than taking the whole card's text as its
 * accessible name.
 */
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
