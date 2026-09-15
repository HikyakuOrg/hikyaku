"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxItem,
    ComboboxList,
    useComboboxAnchor,
} from "@/components/ui/combobox"
import { createSkill, getSkills, type Skill } from "@/lib/supabase/db"
import { isUniqueViolationError } from "@/lib/permissions"
import { getErrorMessage } from "@/lib/utils"

/**
 * Multi-select for the organisation's skill catalog, shared by the vehicle
 * form's Capabilities card (HIK-96) and the package wizard's required-skills
 * field (HIK-97) so the two never drift on how a skill is picked or created.
 *
 * The catalog is small by nature (a handful of named capabilities per org),
 * so it is fetched whole on mount and filtered client-side rather than
 * debounced-searched like the driver/service-area picker.
 */
export function SkillsMultiSelect({
    value,
    onChange,
    organisationId,
    disabled = false,
    placeholder = "Search or add a skill…",
    testId = "skills-picker",
}: {
    value: string[]
    onChange: (skillIds: string[]) => void
    /** Needed to create a new catalog skill inline. Omit (or pass null) to hide that option, e.g. before the organisation id has loaded. */
    organisationId?: string | null
    disabled?: boolean
    placeholder?: string
    testId?: string
}) {
    const [catalog, setCatalog] = useState<Skill[]>([])
    const [query, setQuery] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    // Selected ids are strings (the combobox Value type), so chip labels are
    // looked up here rather than carried on the value itself — same shape
    // driver-service-areas-card uses for the same reason.
    const knownRef = useRef(new Map<string, Skill>())
    const anchor = useComboboxAnchor()

    useEffect(() => {
        getSkills()
            .then((skills) => {
                setCatalog(skills)
                for (const skill of skills) knownRef.current.set(skill.id, skill)
            })
            .catch((error) => console.error("Failed to load the skill catalog:", error))
    }, [])

    const trimmedQuery = query.trim()
    const filtered = trimmedQuery
        ? catalog.filter((skill) => skill.name.toLowerCase().includes(trimmedQuery.toLowerCase()))
        : catalog
    const hasExactMatch = catalog.some(
        (skill) => skill.name.toLowerCase() === trimmedQuery.toLowerCase()
    )
    const canCreate = !!organisationId && trimmedQuery.length > 0 && !hasExactMatch

    async function handleCreate() {
        if (!organisationId || !trimmedQuery) return

        setIsCreating(true)
        try {
            const created = await createSkill(organisationId, trimmedQuery)
            const skill: Skill = { id: created.id, name: created.name }
            knownRef.current.set(skill.id, skill)
            setCatalog((current) => [...current, skill].sort((a, b) => a.name.localeCompare(b.name)))
            onChange([...value, skill.id])
            setQuery("")
            toast.success(`"${skill.name}" added to the skill catalog.`)
        } catch (error) {
            console.error(error)
            toast.error(
                isUniqueViolationError(error)
                    ? `A skill named "${trimmedQuery}" already exists.`
                    : getErrorMessage(error) || "Failed to create the skill."
            )
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <Combobox
            multiple
            value={value}
            onValueChange={onChange}
            onInputValueChange={setQuery}
            disabled={disabled}
            itemToStringLabel={(id: string) => knownRef.current.get(id)?.name ?? id}
        >
            <ComboboxChips ref={anchor} data-testid={testId}>
                {value.map((id) => (
                    <ComboboxChip key={id}>{knownRef.current.get(id)?.name ?? id}</ComboboxChip>
                ))}
                <ComboboxChipsInput placeholder={placeholder} />
            </ComboboxChips>

            <ComboboxContent anchor={anchor}>
                <ComboboxList>
                    {filtered.length === 0 ? (
                        canCreate ? (
                            <button
                                type="button"
                                className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-50"
                                disabled={isCreating}
                                onClick={() => void handleCreate()}
                                data-testid={`${testId}-create`}
                            >
                                {isCreating ? "Creating…" : `+ Create "${trimmedQuery}"`}
                            </button>
                        ) : (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                No matching skills
                            </div>
                        )
                    ) : (
                        filtered.map((skill) => (
                            <ComboboxItem key={skill.id} value={skill.id}>
                                {skill.name}
                            </ComboboxItem>
                        ))
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    )
}
