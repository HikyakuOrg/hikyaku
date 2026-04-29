"use client"

import { notFound, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { CustomerForm } from "@/components/customers/customer-form"
import type { CustomerFormValues } from "@/components/customers/customer-schema"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
    createPreparedCustomer,
    customerToFormValues,
    prepareCustomerFromForm,
    type PreparedCustomerCreation,
    updatePreparedCustomer,
} from "@/lib/customers/create-customer"
import { getCustomer } from "@/lib/supabase/db"

type CustomerEditorPageProps = {
    mode: "create" | "edit"
    customerId?: string
}

export function CustomerEditorPage({ mode, customerId }: CustomerEditorPageProps) {
    const router = useRouter()
    const [initialValues, setInitialValues] = useState<CustomerFormValues>()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [pendingSubmission, setPendingSubmission] = useState<PreparedCustomerCreation | null>(null)
    const [showOutsideServiceAreaDialog, setShowOutsideServiceAreaDialog] = useState(false)
    const [status, setStatus] = useState<"loading" | "ready" | "not-found">(
        mode === "edit" ? "loading" : "ready"
    )

    useEffect(() => {
        if (mode !== "edit") {
            return
        }

        if (!customerId) {
            setStatus("not-found")
            return
        }

        let active = true

        async function loadCustomer() {
            try {
                const customer = await getCustomer(customerId)

                if (!active) {
                    return
                }

                setInitialValues(customerToFormValues(customer as Customer))
                setStatus("ready")
            } catch {
                if (!active) {
                    return
                }

                setStatus("not-found")
            }
        }

        void loadCustomer()

        return () => {
            active = false
        }
    }, [customerId, mode])

    const persistCustomer = async (prepared: PreparedCustomerCreation) => {
        if (mode === "edit") {
            if (!customerId) {
                throw new Error("Missing customer id")
            }

            return updatePreparedCustomer(customerId, prepared)
        }

        return createPreparedCustomer(prepared)
    }

    const handleSubmit = async (values: CustomerFormValues) => {
        setIsSubmitting(true)

        try {
            const prepared = await prepareCustomerFromForm(values, customerId)

            if (!prepared.isWithinServiceArea) {
                setPendingSubmission(prepared)
                setShowOutsideServiceAreaDialog(true)
                return
            }

            const customer = await persistCustomer(prepared)

            toast.success(
                mode === "edit"
                    ? "Customer updated successfully"
                    : "Customer created successfully"
            )
            router.push(`/dashboard/customers/${customer.id}`)
        } catch (error: any) {
            toast.error(
                error.message ||
                (mode === "edit" ? "Failed to update customer" : "Failed to create customer")
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleConfirmOutsideServiceArea = async () => {
        if (!pendingSubmission) {
            return
        }

        setIsSubmitting(true)

        try {
            const customer = await persistCustomer(pendingSubmission)
            setShowOutsideServiceAreaDialog(false)
            setPendingSubmission(null)
            toast.success(
                mode === "edit"
                    ? "Customer updated successfully"
                    : "Customer created successfully"
            )
            router.push(`/dashboard/customers/${customer.id}`)
        } catch (error: any) {
            toast.error(
                error.message ||
                (mode === "edit" ? "Failed to update customer" : "Failed to create customer")
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    if (status === "not-found") {
        notFound()
    }

    if (status === "loading") {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <>
            <div className="space-y-6 p-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {mode === "edit" ? "Edit Customer" : "Add Customer"}
                    </h1>
                    <p className="text-muted-foreground">
                        {mode === "edit"
                            ? "Update the customer record used for package intake and delivery operations."
                            : "Create a new customer record for package intake and delivery operations."}
                    </p>
                </div>

                <CustomerForm
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    initialValues={initialValues}
                    className="space-y-6"
                    footer={
                        <div className="flex items-center justify-end gap-2 border-t pt-6">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSubmitting}
                                onClick={() =>
                                    router.push(
                                        mode === "edit" && customerId
                                            ? `/dashboard/customers/${customerId}`
                                            : "/dashboard/customers"
                                    )
                                }
                            >
                                Cancel
                            </Button>

                            <Button type="submit" disabled={isSubmitting}>
                                {mode === "edit" ? "Update Customer" : "Create Customer"}
                            </Button>
                        </div>
                    }
                />
            </div>

            <AlertDialog
                open={showOutsideServiceAreaDialog}
                onOpenChange={(open) => {
                    setShowOutsideServiceAreaDialog(open)
                    if (!open) {
                        setPendingSubmission(null)
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogMedia>
                            <TriangleAlert className="size-8" />
                        </AlertDialogMedia>
                        <AlertDialogTitle>Customer outside service area</AlertDialogTitle>
                        <AlertDialogDescription>
                            The address you entered is outside the current service area coverage. You can still save the customer if you want to store the record anyway.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>
                            Go Back
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isSubmitting}
                            onClick={handleConfirmOutsideServiceArea}
                        >
                            {mode === "edit" ? "Update Anyway" : "Create Anyway"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}