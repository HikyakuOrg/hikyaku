"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
    Controller,
    useFieldArray,
    useForm,
    useWatch,
    type Control,
    type DefaultValues,
    type FieldErrors,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import type { CatalogAddon, CatalogService, ServiceCatalog } from "@/lib/api/services"
import {
    createService,
    updateService,
    deleteService,
    createServiceAddon,
    updateServiceAddon,
    deleteServiceAddon,
    type UpdateCatalogItemInput,
} from "@/lib/actions/services"
import { getConnectStatus } from "@/lib/actions/connect"
import { PRICING_UNIT_OPTIONS, formatRate, unitSuffix, minorToMajor } from "@/lib/pricing"
import { CurrencyIsoCodes, formatCurrency } from "@/lib/currency"
import {
    catalogItemSchema,
    serviceSchema,
    type CatalogItemFormValues,
    type ServiceFormValues,
} from "./service-form-schema"

const CURRENCY_CODES = CurrencyIsoCodes.map((code) => code.toLowerCase())

/** Searchable ISO currency picker. `exclude` hides codes already in use. */
function CurrencyPicker({
    id,
    value,
    onChange,
    exclude,
}: {
    id: string
    value: string
    onChange: (currency: string) => void
    exclude: string[]
}) {
    const items = CURRENCY_CODES.filter((code) => code === value || !exclude.includes(code))
    return (
        <Combobox
            items={items}
            value={value || null}
            onValueChange={(code: string | null) => onChange(code ?? "")}
            itemToStringLabel={(code: string) => code.toUpperCase()}
        >
            <ComboboxInput id={id} placeholder="Currency" aria-label="Currency" />
            <ComboboxContent>
                <ComboboxEmpty>No currency found.</ComboboxEmpty>
                <ComboboxList>
                    {(code: string) => (
                        <ComboboxItem key={code} value={code}>
                            {code.toUpperCase()}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    )
}

/**
 * Amounts in currencies other than the main one, so a shop in another currency
 * can quote this service without FX conversion.
 */
function OtherCurrenciesField({
    control,
    errors,
    currency,
}: {
    control: Control<ServiceFormValues>
    errors: FieldErrors<ServiceFormValues>
    currency: string
}) {
    const { fields, append, remove } = useFieldArray({ control, name: "currencyOptions" })
    const options = useWatch({ control, name: "currencyOptions" }) ?? []
    const pricingUnit = useWatch({ control, name: "pricingUnit" })
    const suffix = unitSuffix(pricingUnit)
    const main = currency.toLowerCase()

    return (
        <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Other currencies</legend>
            <p className="text-muted-foreground text-xs">
                For shops that charge in another currency. Hikyaku never converts currencies, so a
                shop only offers this service if it has a price in the shop&apos;s currency.
            </p>
            {fields.map((row, index) => {
                const rowErrors = errors.currencyOptions?.[index]
                const used = [
                    main,
                    ...options.flatMap((o, i) => (i !== index && o?.currency ? [o.currency] : [])),
                ]
                const rowError = rowErrors?.currency?.message ?? rowErrors?.amount?.message
                return (
                    <div key={row.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Controller
                                name={`currencyOptions.${index}.currency`}
                                control={control}
                                render={({ field }) => (
                                    <div className="w-32 shrink-0">
                                        <CurrencyPicker
                                            id={`currency-option-${index}`}
                                            value={field.value}
                                            onChange={field.onChange}
                                            exclude={used}
                                        />
                                    </div>
                                )}
                            />
                            <Controller
                                name={`currencyOptions.${index}.amount`}
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        type="number"
                                        min={0.01}
                                        step="0.01"
                                        placeholder="0.00"
                                        aria-label={`Amount in ${options[index]?.currency?.toUpperCase() || "this currency"}`}
                                        value={Number.isNaN(field.value) ? "" : (field.value ?? "")}
                                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                    />
                                )}
                            />
                            {suffix && (
                                <span className="text-muted-foreground shrink-0 text-sm">/ {suffix}</span>
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Remove currency"
                                onClick={() => remove(index)}
                            >
                                <Trash2 className="size-4 text-muted-foreground" />
                            </Button>
                        </div>
                        {rowError && <p className="text-destructive text-xs">{rowError}</p>}
                    </div>
                )
            })}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ currency: "", amount: Number.NaN })}
            >
                <Plus className="mr-1.5 size-4" /> Add currency
            </Button>
        </fieldset>
    )
}

/** The add-on fields, plus a service's description and other currencies. */
function ServiceFields({
    control,
    errors,
    currency,
}: {
    control: Control<ServiceFormValues>
    errors: FieldErrors<ServiceFormValues>
    currency: string
}) {
    return (
        <div className="space-y-4">
            {/* The service form is a superset of the add-on form, so the shared fields fit. */}
            <CatalogItemFields
                control={control as unknown as Control<CatalogItemFormValues>}
                errors={errors}
                currency={currency}
            />
            <Controller
                name="description"
                control={control}
                render={({ field }) => (
                    <div className="space-y-1.5">
                        <Label htmlFor="item-description">Description</Label>
                        <Textarea
                            id="item-description"
                            rows={2}
                            placeholder="e.g. Delivered by our own drivers, same or next day"
                            {...field}
                        />
                        <p className="text-muted-foreground text-xs">
                            Shown with the rate at storefront checkout.
                        </p>
                        {errors.description?.message && (
                            <p className="text-destructive text-xs">{errors.description.message}</p>
                        )}
                    </div>
                )}
            />
            <OtherCurrenciesField control={control} errors={errors} currency={currency} />
        </div>
    )
}

const EMPTY_SERVICE: DefaultValues<ServiceFormValues> = {
    name: "",
    pricingUnit: "per_delivery",
    description: "",
    currencyOptions: [],
}

/** A service's stored values as form values. */
function serviceFormValues(service: CatalogService): ServiceFormValues {
    return {
        name: service.name,
        amount: minorToMajor(service.amount_minor, service.currency),
        pricingUnit: service.pricing_unit as ServiceFormValues["pricingUnit"],
        description: service.description ?? "",
        currencyOptions: service.currency_options.map((option) => ({
            currency: option.currency.toLowerCase(),
            amount: minorToMajor(option.amount_minor, option.currency),
        })),
    }
}

function toCurrencyOptions(rows: ServiceFormValues["currencyOptions"]) {
    return rows.map((row) => ({ currency: row.currency, amountMajor: row.amount }))
}

/** Compares currency lists regardless of order. */
function currencyOptionsKey(rows: ServiceFormValues["currencyOptions"]): string {
    return rows
        .map((row) => `${row.currency}:${row.amount}`)
        .sort()
        .join(",")
}

/**
 * Only the fields that changed. Any price change mints a new Stripe price and
 * archives the old one, so an unchanged amount or currency list is left out.
 */
function serviceChanges(
    before: ServiceFormValues,
    after: ServiceFormValues,
): UpdateCatalogItemInput {
    const changes: UpdateCatalogItemInput = {}
    if (after.name !== before.name) changes.name = after.name
    if (after.description !== before.description) changes.description = after.description
    if (after.pricingUnit !== before.pricingUnit) changes.pricingUnit = after.pricingUnit
    if (after.amount !== before.amount) changes.amountMajor = after.amount
    if (currencyOptionsKey(after.currencyOptions) !== currencyOptionsKey(before.currencyOptions)) {
        changes.currencyOptions = toCurrencyOptions(after.currencyOptions)
    }
    return changes
}

function CatalogItemFields({
    control,
    errors,
    currency,
}: {
    control: Control<CatalogItemFormValues>
    errors: FieldErrors<CatalogItemFormValues>
    currency: string
}) {
    return (
        <div className="space-y-4">
            <Controller
                name="name"
                control={control}
                render={({ field }) => (
                    <div className="space-y-1.5">
                        <Label htmlFor="item-name">Name</Label>
                        <Input id="item-name" placeholder="e.g. Standard Delivery" {...field} />
                        {errors.name?.message && (
                            <p className="text-destructive text-xs">{errors.name.message}</p>
                        )}
                    </div>
                )}
            />

            <div className="grid grid-cols-2 gap-3">
                <Controller
                    name="amount"
                    control={control}
                    render={({ field }) => (
                        <div className="space-y-1.5">
                            <Label htmlFor="item-amount">Amount</Label>
                            <Input
                                id="item-amount"
                                type="number"
                                min={0.01}
                                step="0.01"
                                placeholder="0.00"
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.valueAsNumber)}
                            />
                            {errors.amount?.message && (
                                <p className="text-destructive text-xs">{errors.amount.message}</p>
                            )}
                        </div>
                    )}
                />

                <Controller
                    name="pricingUnit"
                    control={control}
                    render={({ field }) => (
                        <div className="space-y-1.5">
                            <Label>Billed per</Label>
                            <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                    {/* Show the label, not the raw value. */}
                                    <SelectValue>
                                        {(value: string) =>
                                            PRICING_UNIT_OPTIONS.find((o) => o.value === value)?.label}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {PRICING_UNIT_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                />
            </div>

            <Controller
                name="amount"
                control={control}
                render={({ field: amountField }) => (
                    <Controller
                        name="pricingUnit"
                        control={control}
                        render={({ field: unitField }) => {
                            const suffix = unitSuffix(unitField.value)
                            const amount = Number(amountField.value) || 0
                            return (
                                <p className="text-muted-foreground text-sm">
                                    Customers pay{" "}
                                    <span className="font-medium text-foreground">
                                        {formatCurrency(amount, currency)}
                                        {suffix ? ` / ${suffix}` : ""}
                                    </span>
                                </p>
                            )
                        }}
                    />
                )}
            />
        </div>
    )
}

function NewServiceDialog({ currency, onDone }: { currency: string; onDone: () => void }) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ServiceFormValues>({
        resolver: zodResolver(serviceSchema),
        defaultValues: EMPTY_SERVICE,
    })

    const submit = (values: ServiceFormValues) => {
        startTransition(async () => {
            const result = await createService({
                name: values.name,
                amountMajor: values.amount,
                pricingUnit: values.pricingUnit,
                ...(values.description ? { description: values.description } : {}),
                ...(values.currencyOptions.length
                    ? { currencyOptions: toCurrencyOptions(values.currencyOptions) }
                    : {}),
            })
            if (!result.success) {
                toast.error(result.error)
                return
            }
            toast.success("Service created.")
            reset(EMPTY_SERVICE)
            setOpen(false)
            onDone()
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button><Plus className="mr-2 size-4" /> New Service</Button>} />
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>New Service</DialogTitle>
                    <DialogDescription>
                        Charged in {currency.toUpperCase()}. You can add extras after you create it.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(submit)} className="space-y-4">
                    <ServiceFields control={control} errors={errors} currency={currency} />
                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Create service
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function AddAddonDialog({
    serviceId,
    currency,
    onDone,
}: {
    serviceId: string
    currency: string
    onDone: () => void
}) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CatalogItemFormValues>({
        resolver: zodResolver(catalogItemSchema),
        defaultValues: { name: "", pricingUnit: "per_delivery" },
    })

    const submit = (values: CatalogItemFormValues) => {
        startTransition(async () => {
            const result = await createServiceAddon(serviceId, {
                name: values.name,
                amountMajor: values.amount,
                pricingUnit: values.pricingUnit,
            })
            if (!result.success) {
                toast.error(result.error)
                return
            }
            toast.success("Add-on created.")
            reset()
            setOpen(false)
            onDone()
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                        <Plus className="mr-1.5 size-4" /> Add add-on
                    </Button>
                }
            />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Add-on</DialogTitle>
                    <DialogDescription>
                        An optional extra customers can select. Charged in {currency.toUpperCase()}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(submit)} className="space-y-4">
                    <CatalogItemFields control={control} errors={errors} currency={currency} />
                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Create add-on
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function DeleteButton({
    label,
    description,
    onConfirm,
}: {
    label: string
    description: string
    onConfirm: () => Promise<void>
}) {
    const [isPending, startTransition] = useTransition()
    return (
        <AlertDialog>
            <AlertDialogTrigger
                render={
                    <Button variant="ghost" size="icon" aria-label={label}>
                        <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                }
            />
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{label}?</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={isPending}
                        onClick={(e) => {
                            e.preventDefault()
                            startTransition(async () => {
                                await onConfirm()
                            })
                        }}
                    >
                        {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

type SaveResult = { success: true; data: unknown } | { success: false; error: string }

function EditItemDialog({
    title,
    item,
    onSave,
    onDone,
}: {
    title: string
    item: CatalogAddon
    onSave: (input: UpdateCatalogItemInput) => Promise<SaveResult>
    onDone: () => void
}) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CatalogItemFormValues>({
        resolver: zodResolver(catalogItemSchema),
        defaultValues: {
            name: item.name,
            amount: minorToMajor(item.amount_minor, item.currency),
            pricingUnit: item.pricing_unit as CatalogItemFormValues["pricingUnit"],
        },
    })

    // Re-sync the form when the dialog opens so it reflects the latest catalog
    // values (a prior edit may have changed them).
    useEffect(() => {
        if (open) {
            reset({
                name: item.name,
                amount: minorToMajor(item.amount_minor, item.currency),
                pricingUnit: item.pricing_unit as CatalogItemFormValues["pricingUnit"],
            })
        }
    }, [open, item.name, item.amount_minor, item.currency, item.pricing_unit, reset])

    const submit = (values: CatalogItemFormValues) => {
        startTransition(async () => {
            const result = await onSave({
                name: values.name,
                amountMajor: values.amount,
                pricingUnit: values.pricingUnit,
            })
            if (!result.success) {
                toast.error(result.error)
                return
            }
            toast.success("Changes saved.")
            setOpen(false)
            onDone()
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button variant="ghost" size="icon" aria-label={title}>
                        <Pencil className="size-4 text-muted-foreground" />
                    </Button>
                }
            />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>Charged in {item.currency.toUpperCase()}.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(submit)} className="space-y-4">
                    <CatalogItemFields control={control} errors={errors} currency={item.currency} />
                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Save changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function EditServiceDialog({ service, onDone }: { service: CatalogService; onDone: () => void }) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ServiceFormValues>({
        resolver: zodResolver(serviceSchema),
        defaultValues: serviceFormValues(service),
    })

    // Re-sync the form when the dialog opens so it reflects the latest catalog.
    useEffect(() => {
        if (open) reset(serviceFormValues(service))
    }, [open, service, reset])

    const submit = (values: ServiceFormValues) => {
        const changes = serviceChanges(serviceFormValues(service), values)
        if (Object.keys(changes).length === 0) {
            setOpen(false)
            return
        }
        startTransition(async () => {
            const result = await updateService(service.id, changes)
            if (!result.success) {
                toast.error(result.error)
                return
            }
            toast.success("Changes saved.")
            setOpen(false)
            onDone()
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button variant="ghost" size="icon" aria-label="Edit service">
                        <Pencil className="size-4 text-muted-foreground" />
                    </Button>
                }
            />
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit service</DialogTitle>
                    <DialogDescription>Charged in {service.currency.toUpperCase()}.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(submit)} className="space-y-4">
                    <ServiceFields control={control} errors={errors} currency={service.currency} />
                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Save changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function AddonRow({ addon, onDone }: { addon: CatalogAddon; onDone: () => void }) {
    return (
        <div className="flex items-center justify-between gap-4 py-2 pl-6">
            <p className="text-sm">{addon.name}</p>
            <div className="flex items-center gap-3">
                <span className="tabular-nums font-mono text-sm text-muted-foreground">
                    {formatRate(addon.amount_minor, addon.currency, addon.pricing_unit)}
                </span>
                <EditItemDialog
                    title="Edit add-on"
                    item={addon}
                    onSave={(input) => updateServiceAddon(addon.id, input)}
                    onDone={onDone}
                />
                <DeleteButton
                    label="Delete add-on"
                    description={`Remove "${addon.name}" from this service.`}
                    onConfirm={async () => {
                        const result = await deleteServiceAddon(addon.id)
                        if (!result.success) {
                            toast.error(result.error)
                            return
                        }
                        toast.success("Add-on deleted.")
                        onDone()
                    }}
                />
            </div>
        </div>
    )
}

function ServiceCard({
    service,
    currency,
    onDone,
}: {
    service: CatalogService
    currency: string
    onDone: () => void
}) {
    return (
        <article className="rounded-lg border p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-base font-semibold leading-snug">{service.name}</h2>
                    <p className="tabular-nums font-mono text-sm text-muted-foreground">
                        {formatRate(service.amount_minor, service.currency, service.pricing_unit)}
                    </p>
                    {service.currency_options.length > 0 && (
                        <ul
                            aria-label="Other currencies"
                            className="flex flex-wrap gap-x-3 tabular-nums font-mono text-xs text-muted-foreground"
                        >
                            {service.currency_options.map((option) => (
                                <li key={option.currency}>
                                    {formatRate(option.amount_minor, option.currency, service.pricing_unit)}
                                </li>
                            ))}
                        </ul>
                    )}
                    {service.description && (
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                    )}
                </div>
                <div className="flex items-center">
                    <EditServiceDialog service={service} onDone={onDone} />
                    <DeleteButton
                        label="Delete service"
                        description={`This removes "${service.name}" and all its add-ons. This cannot be undone.`}
                        onConfirm={async () => {
                            const result = await deleteService(service.id)
                            if (!result.success) {
                                toast.error(result.error)
                                return
                            }
                            toast.success("Service deleted.")
                            onDone()
                        }}
                    />
                </div>
            </div>

            {service.addons.length > 0 && (
                <div className="divide-y border-t">
                    {service.addons.map((addon) => (
                        <AddonRow key={addon.id} addon={addon} onDone={onDone} />
                    ))}
                </div>
            )}

            <div className="pt-1">
                <AddAddonDialog
                    serviceId={service.id}
                    currency={service.currency || currency}
                    onDone={onDone}
                />
            </div>
        </article>
    )
}

export function ServicesManager({ catalog }: { slug: string; catalog: ServiceCatalog }) {
    const router = useRouter()
    const [currency, setCurrency] = useState("usd")

    // Use the connected account's currency.
    useEffect(() => {
        getConnectStatus().then((result) => {
            if (result.success && result.data.currency) setCurrency(result.data.currency)
        })
    }, [])

    const refresh = () => router.refresh()
    const { services } = catalog

    return (
        <div className="p-8 space-y-10">
            <div className="flex items-start justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Service Rates</h1>
                    <p className="text-muted-foreground mt-2">
                        The services and add-ons that customers choose when they book.
                    </p>
                </div>
                <NewServiceDialog currency={currency} onDone={refresh} />
            </div>

            {services.length === 0 ? (
                <div className="py-20 text-center">
                    <p className="text-muted-foreground">No services yet.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {services.map((service) => (
                        <ServiceCard
                            key={service.id}
                            service={service}
                            currency={currency}
                            onDone={refresh}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
