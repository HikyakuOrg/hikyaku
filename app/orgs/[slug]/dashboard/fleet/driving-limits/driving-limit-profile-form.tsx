"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { InfinityIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import {
    MAX_STOPS_CEILING,
    formatDimensionValue,
    formatHours,
    formatKilometres,
    formatStops,
    hoursToSeconds,
    kilometresToMetres,
    metresToKilometresInput,
    secondsToHoursInput,
    type DrivingLimitProfile,
    type DrivingLimitValues,
    type LimitDimension,
} from "@/lib/driving-limits"
import { DRIVERS_UPDATE, describeWriteError, isUniqueViolationError, permissionRequiredMessage } from "@/lib/permissions"
import {
    createDrivingLimitProfile,
    getOrganisationIdBySlug,
    updateDrivingLimitProfile,
    type DrivingLimitProfileInput,
} from "@/lib/supabase/db"
import { useOrgSlug } from "@/lib/use-org"
import { cn } from "@/lib/utils"

import { DRIVING_LIMIT_TEMPLATES, type DrivingLimitTemplate } from "./templates"

/** Every limit column is a Postgres `integer`. */
const MAX_STORED_VALUE = 2_147_483_647

type LimitField = {
    dimension: LimitDimension
    label: string
    unit: string
    description: string
    inputMode: "decimal" | "numeric"
    invalidNumber: string
}

const LIMIT_FIELDS: LimitField[] = [
    {
        dimension: "working",
        label: "Working time",
        unit: "hours",
        description: "Depot to depot, including 15 minutes at each stop.",
        inputMode: "decimal",
        invalidNumber: "Enter a number of hours, like 10 or 7.5.",
    },
    {
        dimension: "driving",
        label: "Driving time",
        unit: "hours",
        description: "Time on the road only. Time at stops does not count.",
        inputMode: "decimal",
        invalidNumber: "Enter a number of hours, like 8 or 6.5.",
    },
    {
        dimension: "distance",
        label: "Distance",
        unit: "km",
        description: "The planned length of the whole route, depot to depot.",
        inputMode: "decimal",
        invalidNumber: "Enter a number of kilometres, like 250.",
    },
    {
        dimension: "stops",
        label: "Stops",
        unit: "stops",
        description: `Deliveries on one shift. The maximum is ${MAX_STOPS_CEILING}.`,
        inputMode: "numeric",
        invalidNumber: "Enter a whole number of stops, like 40.",
    },
]

type LimitInputs = Record<LimitDimension, string>

type ParsedLimit = { ok: true; value: number | null } | { ok: false; error: string }

const EMPTY_INPUTS: LimitInputs = { working: "", driving: "", distance: "", stops: "" }

/**
 * Converts hours and kilometres to seconds and metres. Blank means no limit.
 * Zero is refused: the user probably meant no limit.
 */
function parseLimit(field: LimitField, text: string): ParsedLimit {
    const trimmed = text.trim()
    if (trimmed === "") return { ok: true, value: null }

    const number = Number(trimmed)
    if (!Number.isFinite(number)) {
        return { ok: false, error: field.invalidNumber }
    }
    if (number <= 0) {
        return { ok: false, error: "Must be more than zero. Leave the field blank for no limit." }
    }

    if (field.dimension === "stops") {
        if (!Number.isInteger(number)) {
            return { ok: false, error: field.invalidNumber }
        }
        // Explain here, not with a database constraint error.
        if (number > MAX_STOPS_CEILING) {
            return {
                ok: false,
                error: `At most ${MAX_STOPS_CEILING}. The planner puts no more than ${MAX_STOPS_CEILING} stops on one shift.`,
            }
        }
        return { ok: true, value: number }
    }

    const stored = field.dimension === "distance" ? kilometresToMetres(number) : hoursToSeconds(number)
    if (stored < 1) {
        return { ok: false, error: "Too small to be a limit. Leave the field blank for no limit." }
    }
    if (stored > MAX_STORED_VALUE) {
        return { ok: false, error: "Too large to be a limit." }
    }
    return { ok: true, value: stored }
}

/** Stored values as input text. */
function inputsFromValues(values: DrivingLimitValues): LimitInputs {
    return {
        working: secondsToHoursInput(values.max_working_seconds),
        driving: secondsToHoursInput(values.max_driving_seconds),
        distance: metresToKilometresInput(values.max_distance_m),
        stops: values.max_stops == null ? "" : String(values.max_stops),
    }
}

function summariseTemplate(values: DrivingLimitValues): string {
    return [
        values.max_working_seconds == null ? "no working-time limit" : `${formatHours(values.max_working_seconds)} working`,
        values.max_driving_seconds == null ? "no driving-time limit" : `${formatHours(values.max_driving_seconds)} driving`,
        values.max_distance_m == null ? "no distance limit" : formatKilometres(values.max_distance_m),
        values.max_stops == null ? "no stop limit" : formatStops(values.max_stops),
    ].join(" · ")
}

function valueOf(parsed: ParsedLimit): number | null {
    return parsed.ok ? parsed.value : null
}

function LimitInput({
    field,
    text,
    parsed,
    disabled,
    onChange,
}: {
    field: LimitField
    text: string
    parsed: ParsedLimit
    disabled: boolean
    onChange: (text: string) => void
}) {
    const inputId = `driving-limit-${field.dimension}`
    const statusId = `${inputId}-status`
    const lowerLabel = field.label.toLowerCase()

    return (
        <div className="space-y-2">
            <Label htmlFor={inputId}>{field.label}</Label>
            <InputGroup>
                <InputGroupInput
                    id={inputId}
                    value={text}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="No limit"
                    inputMode={field.inputMode}
                    autoComplete="off"
                    disabled={disabled}
                    aria-invalid={!parsed.ok}
                    aria-describedby={statusId}
                    data-testid={`driving-limit-input-${field.dimension}`}
                />
                {text !== "" && !disabled && (
                    <InputGroupAddon align="inline-end">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Remove the ${lowerLabel} limit`}
                            onClick={() => onChange("")}
                        >
                            <XIcon />
                        </Button>
                    </InputGroupAddon>
                )}
                <InputGroupAddon align="inline-end">
                    <InputGroupText>{field.unit}</InputGroupText>
                </InputGroupAddon>
            </InputGroup>
            {/* Always state "No limit": the placeholder hides on focus. */}
            <p
                id={statusId}
                className={cn(
                    "flex items-center gap-1.5 text-sm",
                    parsed.ok ? "text-muted-foreground" : "text-destructive"
                )}
                data-testid={`driving-limit-status-${field.dimension}`}
            >
                {!parsed.ok ? (
                    parsed.error
                ) : parsed.value == null ? (
                    <>
                        <InfinityIcon className="size-4" aria-hidden />
                        No limit on {lowerLabel}
                    </>
                ) : (
                    `Maximum ${formatDimensionValue(field.dimension, parsed.value)}`
                )}
            </p>
            <p className="text-xs text-muted-foreground">{field.description}</p>
        </div>
    )
}

type DrivingLimitProfileFormProps = {
    /** The profile being edited. Absent when creating one. */
    profile?: DrivingLimitProfile
    /** Whether the user has `drivers.update`. For the UI only; RLS enforces it. */
    canEdit: boolean
}

export function DrivingLimitProfileForm({ profile, canEdit }: DrivingLimitProfileFormProps) {
    const router = useRouter()
    const slug = useOrgSlug()
    const isCreating = profile === undefined
    const listHref = `/orgs/${slug}/dashboard/fleet/driving-limits`

    const [name, setName] = useState(profile?.name ?? "")
    const [nameError, setNameError] = useState<string | null>(null)
    const [inputs, setInputs] = useState<LimitInputs>(() => (profile ? inputsFromValues(profile) : EMPTY_INPUTS))
    const [templateKey, setTemplateKey] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const parsed = Object.fromEntries(
        LIMIT_FIELDS.map((field) => [field.dimension, parseLimit(field, inputs[field.dimension])])
    ) as Record<LimitDimension, ParsedLimit>

    const allValid = LIMIT_FIELDS.every((field) => parsed[field.dimension].ok)
    const allBlank = LIMIT_FIELDS.every((field) => inputs[field.dimension].trim() === "")
    const workingSeconds = valueOf(parsed.working)
    const drivingSeconds = valueOf(parsed.driving)
    const drivingNeverBinds = workingSeconds != null && drivingSeconds != null && drivingSeconds >= workingSeconds

    function applyTemplate(template: DrivingLimitTemplate) {
        setInputs(inputsFromValues(template.values))
        setTemplateKey(template.key)

        // Keep a name the user typed. Replace a name from the previous template.
        const previousTemplateName = DRIVING_LIMIT_TEMPLATES.find((candidate) => candidate.key === templateKey)?.name
        if (name.trim() === "" || name === previousTemplateName) {
            setName(template.name)
            setNameError(null)
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!canEdit || isSubmitting) return

        const trimmedName = name.trim()
        if (!trimmedName) {
            setNameError("Give this profile a name.")
            return
        }
        if (!allValid) return

        const input: DrivingLimitProfileInput = {
            name: trimmedName,
            max_working_seconds: valueOf(parsed.working),
            max_driving_seconds: valueOf(parsed.driving),
            max_distance_m: valueOf(parsed.distance),
            max_stops: valueOf(parsed.stops),
        }

        setIsSubmitting(true)

        try {
            if (profile) {
                await updateDrivingLimitProfile(profile.id, input)
            } else {
                await createDrivingLimitProfile(await getOrganisationIdBySlug(slug), input)
            }

            toast.success(isCreating ? `"${trimmedName}" created.` : `"${trimmedName}" saved.`)

            // Clear the form: its state stays after navigation.
            if (isCreating) {
                setName("")
                setInputs(EMPTY_INPUTS)
                setTemplateKey(null)
            }

            router.push(listHref)
            router.refresh()
        } catch (error) {
            // Show a name clash on the field.
            if (isUniqueViolationError(error)) {
                setNameError(`This organisation already has a profile named "${trimmedName}".`)
                return
            }

            console.error(error)
            toast.error(describeWriteError(error, DRIVERS_UPDATE, "Could not save the profile."))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)} noValidate>
            {!canEdit && (
                <p
                    className="rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
                    data-testid="driving-limit-permission-note"
                >
                    {permissionRequiredMessage(DRIVERS_UPDATE)}
                </p>
            )}

            {isCreating && canEdit && (
                <Card>
                    <CardHeader>
                        <CardTitle>Start from a template</CardTitle>
                        <CardDescription>
                            Examples only. They do not follow any fatigue or working-time law. A template fills in
                            the form below, and you can change every value.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {DRIVING_LIMIT_TEMPLATES.map((template) => (
                                <button
                                    key={template.key}
                                    type="button"
                                    onClick={() => applyTemplate(template)}
                                    aria-pressed={templateKey === template.key}
                                    className={cn(
                                        "rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
                                        templateKey === template.key && "border-primary bg-muted/40"
                                    )}
                                    data-testid={`driving-limit-template-${template.key}`}
                                >
                                    <span className="block font-medium">{template.name}</span>
                                    <span className="block text-sm text-muted-foreground">{template.description}</span>
                                    <span className="mt-2 block text-xs text-muted-foreground">
                                        {summariseTemplate(template.values)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>
                        A name that dispatchers know.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="max-w-md space-y-2">
                        <Label htmlFor="driving-limit-name">Name</Label>
                        <Input
                            id="driving-limit-name"
                            value={name}
                            onChange={(event) => {
                                setName(event.target.value)
                                setNameError(null)
                            }}
                            placeholder="e.g. Standard metro"
                            disabled={!canEdit}
                            aria-invalid={nameError !== null}
                            data-testid="driving-limit-name-input"
                        />
                        {nameError && (
                            <p className="text-sm text-destructive" data-testid="driving-limit-name-error">
                                {nameError}
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Limits</CardTitle>
                    <CardDescription>
                        All limits are optional. Leave a field blank for no limit.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        {LIMIT_FIELDS.map((field) => (
                            <LimitInput
                                key={field.dimension}
                                field={field}
                                text={inputs[field.dimension]}
                                parsed={parsed[field.dimension]}
                                disabled={!canEdit}
                                onChange={(text) => setInputs((current) => ({ ...current, [field.dimension]: text }))}
                            />
                        ))}
                    </div>

                    {allBlank && (
                        <p
                            className="rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground"
                            data-testid="driving-limit-all-blank-note"
                        >
                            All fields are blank, so this profile has no limits.
                        </p>
                    )}

                    {drivingNeverBinds && (
                        <p className="rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                            The driving time limit is not less than the working time limit, so it has no effect.
                            Driving time is part of working time.
                        </p>
                    )}
                </CardContent>
                <CardFooter className="justify-end gap-2">
                    <Button variant="outline" render={<Link href={listHref} />}>
                        {canEdit ? "Cancel" : "Back"}
                    </Button>
                    {canEdit && (
                        <Button type="submit" disabled={isSubmitting || !allValid} data-testid="driving-limit-submit">
                            {isSubmitting ? "Saving..." : isCreating ? "Create profile" : "Save changes"}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </form>
    )
}
