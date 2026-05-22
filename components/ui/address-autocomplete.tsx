"use client"

import { useRef, useState } from "react"
import { fetchAddressSuggestions, type AddressSuggestion } from "@/lib/maps/geocode-autocomplete"
import {
    Combobox,
    ComboboxContent,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"

export type { AddressSuggestion }

export function AddressAutocomplete({
    value,
    onChange,
    onSuggestionSelect,
    id,
    placeholder,
    "aria-invalid": ariaInvalid,
}: {
    value: string
    onChange: (value: string) => void
    onSuggestionSelect?: (suggestion: AddressSuggestion) => void
    id?: string
    placeholder?: string
    "aria-invalid"?: boolean
}) {
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
    const [loading, setLoading] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

    return (
        <Combobox
            value={value}
            onValueChange={(v) => {
                const match = suggestions.find((s) => s.label === v)
                onChange(v as string)
                if (match) onSuggestionSelect?.(match)
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
    )
}
