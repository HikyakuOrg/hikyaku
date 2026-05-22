"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { addDays, format } from "date-fns"
import { CardFooter } from "@/components/ui/card"

export interface DateStepData {
    date: string // YYYY-MM-DD
}

export function DateStep({
    defaultValues,
    onNext,
    onPrev,
}: {
    defaultValues?: DateStepData
    onNext: (data: DateStepData) => void
    onPrev: () => void
}) {
    const [selected, setSelected] = useState<Date | undefined>(
        defaultValues?.date ? new Date(defaultValues.date + "T00:00:00") : undefined
    )
    const [error, setError] = useState<string | null>(null)

    function handleSubmit() {
        if (!selected) {
            setError("Please select a date to continue.")
            return
        }
        onNext({ date: format(selected, "yyyy-MM-dd") })
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">Select Shift Date</h3>
                <p className="text-muted-foreground mt-2 leading-7">
                    Choose the date this shift will run. The shift will start at 08:00 local time.
                </p>
            </div>

            <div className="flex justify-center">
                <Calendar
                    className="w-full"
                    mode="single"
                    selected={selected}
                    onSelect={(d) => {
                        setSelected(d)
                        setError(null)
                    }}
                    disabled={{ before: new Date() }}
                />
            </div>
            <div className="flex flex-wrap gap-2 border-t">
                {[
                    { label: "Today", value: 0 },
                    { label: "Tomorrow", value: 1 },
                    { label: "In 3 days", value: 3 },
                    { label: "In a week", value: 7 },
                    { label: "In 2 weeks", value: 14 },
                ].map((preset) => (
                    <Button
                        key={preset.value}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                            const newDate = addDays(new Date(), preset.value)
                            setSelected(newDate)
                        }}
                    >
                        {preset.label}
                    </Button>
                ))}
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            <div className="flex justify-between">
                <Button variant="outline" onClick={onPrev}>Back</Button>
                <Button onClick={handleSubmit}>Next</Button>
            </div>
        </div>
    )
}
