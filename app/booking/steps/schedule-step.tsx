"use client"

import { useMemo } from "react"
import { Controller, useForm, type Control } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { CalendarIcon } from "@phosphor-icons/react"
import { Loader2 } from "lucide-react"

import { ScheduleFormValues, scheduleSchema } from "../booking-schema"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupInput } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

function DateField({
    label,
    value,
    onChange,
    invalid,
    error,
}: {
    label: string
    value?: string
    onChange: (value: string) => void
    invalid?: boolean
    error?: { message?: string }
}) {
    return (
        <Field data-invalid={invalid}>
            <FieldLabel>{label}</FieldLabel>
            <Popover>
                <PopoverTrigger
                    render={
                        <Button
                            variant="outline"
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !value && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 size-4" />
                            {value ? format(new Date(value), "PPP") : "Pick a date"}
                        </Button>
                    }
                />
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={value ? new Date(value) : undefined}
                        onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        autoFocus
                    />
                </PopoverContent>
            </Popover>
            {invalid && <FieldError errors={[error]} />}
        </Field>
    )
}

function TimeWindow({
    label,
    fromName,
    toName,
    control,
}: {
    label: string
    fromName: "pickupTimeFrom" | "deliveryTimeFrom"
    toName: "pickupTimeTo" | "deliveryTimeTo"
    control: Control<ScheduleFormValues>
}) {
    return (
        <Field>
            <FieldLabel>{label}</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
                <Controller
                    name={fromName}
                    control={control}
                    render={({ field }) => (
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">From</p>
                            <InputGroup>
                                <InputGroupInput
                                    {...field}
                                    type="time"
                                    value={field.value ?? ""}
                                    aria-label={`${label} from`}
                                />
                            </InputGroup>
                        </div>
                    )}
                />
                <Controller
                    name={toName}
                    control={control}
                    render={({ field }) => (
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">To</p>
                            <InputGroup>
                                <InputGroupInput
                                    {...field}
                                    type="time"
                                    value={field.value ?? ""}
                                    aria-label={`${label} to`}
                                />
                            </InputGroup>
                        </div>
                    )}
                />
            </div>
        </Field>
    )
}

export function ScheduleStep({
    defaultValues,
    isSubmitting = false,
    onNext,
    onPrev,
}: {
    defaultValues?: ScheduleFormValues
    isSubmitting?: boolean
    onNext: (data: ScheduleFormValues) => void
    onPrev: () => void
}) {
    const initial = useMemo(
        () =>
            defaultValues ?? {
                pickupDate: "",
                pickupTimeFrom: undefined,
                pickupTimeTo: undefined,
                deliveryDate: "",
                deliveryTimeFrom: undefined,
                deliveryTimeTo: undefined,
                deliveryNotes: undefined,
            },
        [defaultValues]
    )

    const form = useForm<ScheduleFormValues>({
        resolver: zodResolver(scheduleSchema),
        defaultValues: initial,
    })

    return (
        <form
            id="schedule"
            onSubmit={form.handleSubmit(onNext)}
            className="space-y-8 p-4"
        >
            <div>
                <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                    Schedule
                </h3>
                <p className="text-muted-foreground mt-2 leading-7">
                    Choose pickup and delivery dates with optional time windows.
                </p>
            </div>

            <FieldGroup>
                <Controller
                    name="pickupDate"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <DateField
                            label="Pickup Date"
                            value={field.value}
                            onChange={field.onChange}
                            invalid={fieldState.invalid}
                            error={fieldState.error}
                        />
                    )}
                />

                <TimeWindow
                    label="Pickup Time Window"
                    fromName="pickupTimeFrom"
                    toName="pickupTimeTo"
                    control={form.control}
                />

                <Separator />

                <Controller
                    name="deliveryDate"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <DateField
                            label="Delivery Date"
                            value={field.value}
                            onChange={field.onChange}
                            invalid={fieldState.invalid}
                            error={fieldState.error}
                        />
                    )}
                />

                <TimeWindow
                    label="Delivery Time Window"
                    fromName="deliveryTimeFrom"
                    toName="deliveryTimeTo"
                    control={form.control}
                />

                <Separator />

                <Controller
                    name="deliveryNotes"
                    control={form.control}
                    render={({ field }) => (
                        <Field>
                            <FieldLabel htmlFor="delivery-notes">
                                Delivery Notes{" "}
                                <span className="text-muted-foreground font-normal">
                                    (optional)
                                </span>
                            </FieldLabel>
                            <Textarea
                                {...field}
                                id="delivery-notes"
                                value={field.value ?? ""}
                                placeholder="e.g. Leave at the front door, call before delivery…"
                                rows={3}
                            />
                        </Field>
                    )}
                />
            </FieldGroup>

            <div className="flex justify-between pt-6 border-t">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onPrev}
                    disabled={isSubmitting}
                >
                    Previous
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Next
                </Button>
            </div>
        </form>
    )
}
