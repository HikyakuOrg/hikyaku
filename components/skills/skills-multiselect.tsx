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
import { useOrganisationId } from "@/components/organisation-provider"
import { isUniqueViolationError } from "@/lib/permissions"
import { getErrorMessage } from "@/lib/utils"

/**
 * Skill picker for the vehicle form and the package wizard. Organisations have
 * few skills, so this loads all of them and filters on the client.
 */
export function SkillsMultiSelect({
    value,
    onChange,
    disabled = false,
    placeholder = "Search or add a skill…",
    testId = "skills-picker",
}: {
    value: string[]
    onChange: (skillIds: string[]) => void
    disabled?: boolean
    placeholder?: string
    testId?: string
}) {
    const organisationId = useOrganisationId()
    const [catalog, setCatalog] = useState<Skill[]>([])
    const [query, setQuery] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    // Combobox values are ids, so keep the names here for the chips.
    const knownRef = useRef(new Map<string, Skill>())
    const anchor = useComboboxAnchor()

    useEffect(() => {
        getSkills(organisationId)
            .then((skills) => {
                setCatalog(skills)
                for (const skill of skills) knownRef.current.set(skill.id, skill)
            })
            .catch((error) => console.error("Failed to load the skill catalog:", error))
    }, [organisationId])

    const trimmedQuery = query.trim()
    const filtered = trimmedQuery
        ? catalog.filter((skill) => skill.name.toLowerCase().includes(trimmedQuery.toLowerCase()))
        : catalog
    const hasExactMatch = catalog.some(
        (skill) => skill.name.toLowerCase() === trimmedQuery.toLowerCase()
    )
    const canCreate = trimmedQuery.length > 0 && !hasExactMatch

    async function handleCreate() {
        if (!trimmedQuery) return

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
                    : getErrorMessage(error) || "Could not create the skill."
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
