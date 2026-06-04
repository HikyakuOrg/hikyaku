import { Controller, Control, useForm } from "react-hook-form"
import { LogisticsAssignmentFormValues, logisticsAssignmentSchema } from "./add-package-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import { Item, ItemContent, ItemTitle, ItemDescription } from "@/components/ui/item"
import { useEffect, useState } from "react";
import { Tables } from "@/lib/supabase/supabase";
import { getWarehouse, searchWarehouse } from "@/lib/supabase/db";
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { format, parseISO } from "date-fns"
import { ChevronDownIcon, XIcon } from "lucide-react"
import { toast } from "sonner";
import { InputGroupTextarea } from "@/components/ui/input-group";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export function LogisticsAssignmentStep({ onNext, onPrev, defaultValues }: {
    onNext: (data: LogisticsAssignmentFormValues & { warehouse?: Tables<'warehouse'> }) => void;
    onPrev: () => void;
    defaultValues?: LogisticsAssignmentFormValues;
}) {

    const form = useForm({
        resolver: zodResolver(logisticsAssignmentSchema),
        defaultValues: defaultValues ?? { warehouseId: "", trackingNumber: "", deliveryNotes: "", scheduledArrival: "" },
    });

    const [searchTerm, setSearchTerm] = useState("")
    const [results, setResults] = useState<Tables<'warehouse'>[]>([])
    const [selectedWarehouse, setSelectedWarehouse] = useState<Tables<'warehouse'> | null>(null)
    const [open, setOpen] = useState(false)
    const [date, setDate] = useState<Date | undefined>(undefined)
    const [time, setTime] = useState<string>("")
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (defaultValues?.scheduledArrival) {
            const d = parseISO(defaultValues.scheduledArrival);
            setDate(d);
            setTime(format(d, "HH:mm:ss"));
        }
    }, [defaultValues?.scheduledArrival]);

    useEffect(() => {
        const fetchWarehouse = async () => {
            if (defaultValues?.warehouseId) {
                try {
                    const warehouse = await getWarehouse(defaultValues.warehouseId);
                    setSelectedWarehouse(warehouse);
                } catch (error) {
                    console.error("Error fetching warehouse:", error);
                }
            }
        };

        fetchWarehouse();
    }, [defaultValues?.warehouseId]);

    useEffect(() => {
        const timeout = setTimeout(async () => {
            if (!searchTerm || searchTerm.length < 2) {
                setResults([])
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            const data = await searchWarehouse(searchTerm)
            const typedData: Tables<'warehouse'>[] =
                data?.map((item) => ({
                    ...item,
                    warehouse_location: item.warehouse_location as Point,
                })) ?? [];

            setResults(typedData);
            setIsLoading(false)
        }, 300)

        return () => clearTimeout(timeout)
    }, [searchTerm])

    return (
        <form
            id="logisticsAssignment"
            onSubmit={form.handleSubmit((data) => {
                if (time && !date) {
                    toast.error("Please select a date if you have entered a time.")
                    return
                }
                onNext({
                    ...data,
                    warehouse: selectedWarehouse ?? undefined
                })
            })}
            className="space-y-8 p-4">

            <div className="space-y-8">
                <div className="flex flex-col gap-4">
                    <div>
                        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                            Logistics Assignment
                        </h3>
                        <p className="text-muted-foreground mt-2 leading-7">
                            Assign a specific warehouse and scheduled arrival time for this shipment
                        </p>
                    </div>
                    <div className="grid w-full gap-6">
                        <Controller
                            name="scheduledArrival"
                            control={form.control}
                            render={({ field }) => {

                                const updateDateTime = (newDate?: Date, newTime?: string) => {
                                    if (!newDate) {
                                        field.onChange(undefined)
                                        return
                                    }

                                    const timeValue = newTime ?? time
                                    const dateValue = newDate ?? date

                                    if (!dateValue) return

                                    const [hours = "23", minutes = "59", seconds = "59"] =
                                        (timeValue || "23:59:59").split(":")

                                    const combined = new Date(dateValue)
                                    combined.setHours(Number(hours), Number(minutes), Number(seconds))

                                    field.onChange(combined.toISOString())
                                }

                                return (
                                    <FieldGroup className="w-full grid grid-cols-2 gap-4">
                                        <Field>
                                            <FieldLabel>Date</FieldLabel>

                                            <Popover open={open} onOpenChange={setOpen}>
                                                <PopoverTrigger>
                                                    <Button type="button" variant="outline" className="w-full justify-between font-normal">
                                                        {date ? format(date, "PPP") : "Select date"}
                                                        <ChevronDownIcon />
                                                    </Button>
                                                </PopoverTrigger>

                                                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={date}
                                                        captionLayout="dropdown"
                                                        defaultMonth={date}
                                                        onSelect={(d) => {
                                                            setDate(d)
                                                            updateDateTime(d, time)
                                                            setOpen(false)
                                                        }}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </Field>

                                        <Field>
                                            <FieldLabel>Time</FieldLabel>
                                            <Input
                                                type="time"
                                                step="1"
                                                value={time}
                                                onChange={(e) => {
                                                    const t = e.target.value
                                                    setTime(t)
                                                    updateDateTime(date, t)
                                                }}
                                            />
                                        </Field>
                                        <h1 className="text-xs font-semibold text-muted-foreground mt-2 leading-2">
                                            Date Time will be in UTC
                                        </h1>

                                    </FieldGroup>
                                )
                            }}
                        />

                        <Controller
                            name="trackingNumber"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field>
                                    <FieldLabel htmlFor="trackingNumber">Tracking Number</FieldLabel>
                                    <Input
                                        type="text"
                                        id="trackingNumber"
                                        {...field}
                                        className="w-full"
                                    />
                                    <h1 className="text-xs font-semibold text-muted-foreground mt-2 leading-2">
                                        (Optional) Set Tracking Number. Will be generated automatically if not set.
                                    </h1>
                                </Field>
                            )}
                        />

                        <Controller
                            name="deliveryNotes"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field>
                                    <FieldLabel htmlFor="deliveryNotes">Delivery Notes</FieldLabel>
                                    <Textarea
                                        id="deliveryNotes"
                                        {...field}
                                        className="w-full"
                                    />
                                </Field>
                            )}
                        />

                        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                            <div className="flex items-center gap-2">
                                
                                Warehouse Details
                                <Badge variant="destructive">Required</Badge>
                            </div>
                        </h3>
                        <Controller
                            name="warehouseId"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <div>
                                    <Combobox
                                        value={selectedWarehouse}
                                        onValueChange={(warehouse) => {
                                            if (warehouse) {
                                                setSelectedWarehouse(warehouse)
                                                setSearchTerm(warehouse.warehouse_name ?? "")
                                                field.onChange(warehouse.id)
                                            }
                                        }}
                                        items={results}
                                        itemToStringValue={(item) => item.warehouse_name}
                                    >
                                        <ComboboxInput
                                            placeholder="Search warehouse by name or address"
                                            value={selectedWarehouse ? selectedWarehouse.warehouse_name : searchTerm}
                                            onChange={(e) => {
                                                const value = e.target.value
                                                setSearchTerm(value)

                                                if (selectedWarehouse) {
                                                    setSelectedWarehouse(null)
                                                    field.onChange("")
                                                }
                                            }}
                                            aria-invalid={fieldState.invalid}
                                            loading={isLoading}
                                        />

                                        <ComboboxContent>
                                            <ComboboxEmpty>No warehouse found.</ComboboxEmpty>

                                            <ComboboxList>
                                                {(item: Tables<'warehouse'>) => (
                                                    <ComboboxItem
                                                        key={item.id}
                                                        value={item}
                                                    >
                                                        <Item size="xs" className="p-0">
                                                            <ItemContent>
                                                                <ItemTitle>{item.warehouse_name}</ItemTitle>
                                                                <ItemDescription>
                                                                    {item.warehouse_address}
                                                                    <p></p>
                                                                    {item.warehouse_country}
                                                                </ItemDescription>
                                                            </ItemContent>
                                                        </Item>
                                                    </ComboboxItem>
                                                )}
                                            </ComboboxList>
                                        </ComboboxContent>
                                    </Combobox>
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </div>
                            )}
                        />
                        {form.watch("warehouseId") && (
                            <div className="bg-white dark:bg-slate-900 border border-primary/20 rounded-xl p-5 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight">{selectedWarehouse?.warehouse_name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{selectedWarehouse?.warehouse_address}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{selectedWarehouse?.warehouse_city}, {selectedWarehouse?.warehouse_zipcode}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{selectedWarehouse?.warehouse_country}</p>
                                    </div>
                                </div>
                                <XIcon size={32} className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer" onClick={() => {
                                    setSelectedWarehouse(null)
                                    form.setValue("warehouseId", "")
                                }} />

                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-6 border-t mt-4">
                <Button type="button" variant="outline" onClick={onPrev}>Previous</Button>
                <Button type="submit">Next</Button>
            </div>
        </form>
    )
}