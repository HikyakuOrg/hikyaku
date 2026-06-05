"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm, type Control, type FieldErrors } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { formatCurrency } from "@/lib/currency"
import {
    catalogItemSchema,
    type CatalogItemFormValues,
} from "./service-form-schema"

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
                                    {/* base-ui renders the raw value by default — map it to the friendly label. */}
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
    } = useForm<CatalogItemFormValues>({
        resolver: zodResolver(catalogItemSchema),
        defaultValues: { name: "", pricingUnit: "per_delivery" },
    })

    const submit = (values: CatalogItemFormValues) => {
        startTransition(async () => {
            const result = await createService({
                name: values.name,
                amountMajor: values.amount,
                pricingUnit: values.pricingUnit,
            })
            if (!result.success) {
                toast.error(result.error)
                return
            }
            toast.success("Service created")
            reset()
            setOpen(false)
            onDone()
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button><Plus className="mr-2 size-4" /> New Service</Button>} />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Service</DialogTitle>
                    <DialogDescription>
                        Charged in {currency.toUpperCase()}. Add optional extras after creating it.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(submit)} className="space-y-4">
                    <CatalogItemFields control={control} errors={errors} currency={currency} />
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
            toast.success("Add-on created")
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
            toast.success("Changes saved")
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
                        toast.success("Add-on deleted")
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
                </div>
                <div className="flex items-center">
                    <EditItemDialog
                        title="Edit service"
                        item={service}
                        onSave={(input) => updateService(service.id, input)}
                        onDone={onDone}
                    />
                    <DeleteButton
                        label="Delete service"
                        description={`This removes "${service.name}" and all its add-ons. This cannot be undone.`}
                        onConfirm={async () => {
                            const result = await deleteService(service.id)
                            if (!result.success) {
                                toast.error(result.error)
                                return
                            }
                            toast.success("Service deleted")
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

    // Prefill the new-service currency hint from the connected account.
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
                        Unit-priced services and add-ons customers choose at booking.
                    </p>
                </div>
                <NewServiceDialog currency={currency} onDone={refresh} />
            </div>

            {services.length === 0 ? (
                <div className="py-20 text-center">
                    <p className="text-muted-foreground">No services have been created yet.</p>
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
