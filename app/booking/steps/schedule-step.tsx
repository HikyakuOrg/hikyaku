"use client"

import { useMemo } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { CalendarIcon } from "@phosphor-icons/react"
import { Loader2 } from "lucide-react"
import { z } from "zod/v4"

import { ScheduleFormValues, scheduleSchema } from "../booking-schema"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupInput } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export function ScheduleStep({
    defaultValues,
    deliveryType,
    isSubmitting = false,
    onNext,
    onPrev,
}: {
    defaultValues?: ScheduleFormValues
    deliveryType: "on_demand" | "scheduled"
    isSubmitting?: boolean
    onNext: (data: ScheduleFormValues) => void
    onPrev: () => void
}) {
    const isScheduled = deliveryType === "scheduled"

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
                signatureRequired: false,
            },
        [defaultValues]
    )

    const resolverSchema = isScheduled
        ? scheduleSchema.extend({
              deliveryDate: z.string().min(1, "Delivery date is required"),
          })
        : scheduleSchema

    const form = useForm<ScheduleFormValues>({
        resolver: zodResolver(resolverSchema as typeof scheduleSchema),
        defaultValues: initial,
    })

    const submit = (data: ScheduleFormValues) =>
        onNext(isScheduled ? data : { ...data, deliveryDate: data.pickupDate })

    return (
        <form
            id="schedule"
            onSubmit={form.handleSubmit(submit)}
            className="space-y-8 p-4"
        >
            <div>
                <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                    Schedule
                </h3>
                <p className="text-muted-foreground mt-2 leading-7">
                    {isScheduled
                        ? "Choose pickup and delivery dates with preferred time windows."
                        : "Choose your preferred pickup and delivery dates."}
                </p>
            </div>

            <FieldGroup>
                <Controller
                    name="pickupDate"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Pickup Date</FieldLabel>
                            <Popover>
                                <PopoverTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 size-4" />
                                            {field.value
                                                ? format(new Date(field.value), "PPP")
                                                : "Pick a date"}
                                        </Button>
                                    }
                                />
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value ? new Date(field.value) : undefined}
                                        onSelect={(date) =>
                                            field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                                        }
                                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                        autoFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />

                {isScheduled && (
                    <Field>
                        <FieldLabel>Pickup Time Window</FieldLabel>
                        <div className="grid grid-cols-2 gap-2">
                            <Controller
                                name="pickupTimeFrom"
                                control={form.control}
                                render={({ field }) => (
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">From</p>
                                        <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                type="time"
                                                value={field.value ?? ""}
                                                aria-label="Pickup from"
                                            />
                                        </InputGroup>
                                    </div>
                                )}
                            />
                            <Controller
                                name="pickupTimeTo"
                                control={form.control}
                                render={({ field }) => (
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">To</p>
                                        <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                type="time"
                                                value={field.value ?? ""}
                                                aria-label="Pickup to"
                                            />
                                        </InputGroup>
                                    </div>
                                )}
                            />
                        </div>
                    </Field>
                )}

                {isScheduled && (
                  <>
                <Separator />

                <Controller
                    name="deliveryDate"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Delivery Date</FieldLabel>
                            <Popover>
                                <PopoverTrigger
                                    render={
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 size-4" />
                                            {field.value
                                                ? format(new Date(field.value), "PPP")
                                                : "Pick a date"}
                                        </Button>
                                    }
                                />
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value ? new Date(field.value) : undefined}
                                        onSelect={(date) =>
                                            field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                                        }
                                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                        autoFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />

                {/* Delivery Time Window — Scheduled only */}
                {isScheduled && (
                    <Field>
                        <FieldLabel>Delivery Time Window</FieldLabel>
                        <div className="grid grid-cols-2 gap-2">
                            <Controller
                                name="deliveryTimeFrom"
                                control={form.control}
                                render={({ field }) => (
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">From</p>
                                        <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                type="time"
                                                value={field.value ?? ""}
                                                aria-label="Delivery from"
                                            />
                                        </InputGroup>
                                    </div>
                                )}
                            />
                            <Controller
                                name="deliveryTimeTo"
                                control={form.control}
                                render={({ field }) => (
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">To</p>
                                        <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                type="time"
                                                value={field.value ?? ""}
                                                aria-label="Delivery to"
                                            />
                                        </InputGroup>
                                    </div>
                                )}
                            />
                        </div>
                    </Field>
                )}
                  </>
                )}

                <Separator />

                {/* Delivery Notes */}
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

                {/* Signature Required */}
                <Controller
                    name="signatureRequired"
                    control={form.control}
                    render={({ field }) => (
                        <Field>
                            <label className="flex cursor-pointer items-center gap-3">
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={(checked) => field.onChange(!!checked)}
                                />
                                <div>
                                    <p className="text-sm font-medium">Signature Required</p>
                                    <p className="text-muted-foreground text-xs">
                                        A signature will be collected from the recipient upon delivery.
                                    </p>
                                </div>
                            </label>
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
                    {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Next
                </Button>
            </div>
        </form>
    )
}
