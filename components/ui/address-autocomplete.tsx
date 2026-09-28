"use client"

import { useEffect, useRef, useState } from "react"
import { fetchAddressSuggestions, type AddressSuggestion } from "@/lib/actions/geocode"
import { isLikelyBuilding } from "@/lib/maps/geocode-autocomplete"
import {
    Combobox,
    ComboboxContent,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export type { AddressSuggestion }

export function AddressAutocomplete({
    value,
    onChange,
    onSuggestionSelect,
    unitValue,
    onUnitChange,
    onEscalationBlockedChange,
    id,
    unitId,
    placeholder,
    "aria-invalid": ariaInvalid,
}: {
    value: string
    onChange: (value: string) => void
    onSuggestionSelect?: (suggestion: AddressSuggestion) => void
    /** Unit/suite/business-name value. Uncontrolled (internal state) when omitted. */
    unitValue?: string
    onUnitChange?: (value: string) => void
    /** Called when the building prompt starts or stops blocking, so the caller can disable its submit button. */
    onEscalationBlockedChange?: (blocked: boolean) => void
    id?: string
    unitId?: string
    placeholder?: string
    "aria-invalid"?: boolean
}) {
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
    const [loading, setLoading] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const [internalUnit, setInternalUnit] = useState("")
    const unit = unitValue ?? internalUnit
    function setUnit(next: string) {
        onUnitChange?.(next)
        if (unitValue === undefined) setInternalUnit(next)
    }

    // The building prompt applies only while `value` is still the picked
    // suggestion. Editing the text removes it.
    const [matchedSuggestion, setMatchedSuggestion] = useState<AddressSuggestion | null>(null)
    const [dismissedFor, setDismissedFor] = useState<string | null>(null)
    const unitInputRef = useRef<HTMLInputElement>(null)

    const isMatchActive = matchedSuggestion !== null && value === matchedSuggestion.label
    const isBuilding = isMatchActive && isLikelyBuilding(matchedSuggestion)
    const blocked = isBuilding && dismissedFor !== matchedSuggestion?.label

    useEffect(() => {
        onEscalationBlockedChange?.(blocked)
    }, [blocked, onEscalationBlockedChange])

    useEffect(() => {
        if (isBuilding) unitInputRef.current?.focus()
        // Not on every keystroke, or it would take focus from the user.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isBuilding, matchedSuggestion])

    function handleInputChange(text: string) {
        if (timerRef.current) clearTimeout(timerRef.current)
        if (!text.trim()) {
            setSuggestions([])
            return
        }
        timerRef.current = setTimeout(async () => {
            setLoading(true)
            try {
                setSuggestions(await fetchAddressSuggestions(text))
            } catch {
                setSuggestions([])
            } finally {
                setLoading(false)
            }
        }, 450)
    }

    const resolvedUnitId = unitId ?? (id ? `${id}-unit` : undefined)

    return (
        <div className="w-full space-y-3">
            <Combobox
                value={value}
                onValueChange={(v) => {
                    const match = suggestions.find((s) => s.label === v)
                    onChange(v as string)
                    if (match) {
                        setMatchedSuggestion(match)
                        setDismissedFor(null)
                        onSuggestionSelect?.(match)
                    }
                    setSuggestions([])
                }}
            >
                <ComboboxInput
                    id={id}
                    placeholder={placeholder}
                    aria-invalid={ariaInvalid}
                    loading={loading}
                    showTrigger={false}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        onChange(e.target.value)
                        handleInputChange(e.target.value)
                        if (!e.target.value.trim()) setMatchedSuggestion(null)
                    }}
                />
                {suggestions.length > 0 && (
                    <ComboboxContent>
                        <ComboboxList>
                            {suggestions.map((s) => (
                                <ComboboxItem key={s.label} value={s.label}>
                                    {s.label}
                                </ComboboxItem>
                            ))}
                        </ComboboxList>
                    </ComboboxContent>
                )}
            </Combobox>

            <Field className="gap-1.5">
                <FieldLabel htmlFor={resolvedUnitId}>Unit, suite, or business name</FieldLabel>
                <Input
                    id={resolvedUnitId}
                    ref={unitInputRef}
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Optional"
                    aria-describedby={resolvedUnitId ? `${resolvedUnitId}-hint` : undefined}
                />
                {isBuilding && (
                    <FieldDescription id={resolvedUnitId ? `${resolvedUnitId}-hint` : undefined} role="status">
                        {dismissedFor === matchedSuggestion?.label
                            ? "Delivering to the main entrance."
                            : "This looks like a building. Which unit or business?"}
                    </FieldDescription>
                )}
                {blocked && (
                    <Button
                        type="button"
                        variant="link"
                        size="xs"
                        className="h-auto self-start p-0"
                        onClick={() => {
                            setDismissedFor(matchedSuggestion?.label ?? null)
                            setUnit("")
                        }}
                    >
                        Deliver to the main entrance
                    </Button>
                )}
            </Field>
        </div>
    )
}
