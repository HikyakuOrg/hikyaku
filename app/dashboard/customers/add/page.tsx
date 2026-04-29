"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { TriangleAlert } from "lucide-react"
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
    prepareCustomerFromForm,
    type PreparedCustomerCreation,
} from "@/lib/customers/create-customer"

export default function AddCustomerPage() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [pendingCreation, setPendingCreation] = useState<PreparedCustomerCreation | null>(null)
    const [showOutsideServiceAreaDialog, setShowOutsideServiceAreaDialog] = useState(false)

    const handleSubmit = async (values: CustomerFormValues) => {
        setIsSubmitting(true)

        try {
            const prepared = await prepareCustomerFromForm(values)

            if (!prepared.isWithinServiceArea) {
                setPendingCreation(prepared)
                setShowOutsideServiceAreaDialog(true)
                return
            }

            const customer = await createPreparedCustomer(prepared)

            toast.success("Customer created successfully")
            router.push(`/dashboard/customers/${customer.id}`)
        } catch (error: any) {
            toast.error(error.message || "Failed to create customer")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCreateOutsideServiceArea = async () => {
        if (!pendingCreation) {
            return
        }

        setIsSubmitting(true)

        try {
            const customer = await createPreparedCustomer(pendingCreation)
            setShowOutsideServiceAreaDialog(false)
            setPendingCreation(null)
            toast.success("Customer created successfully")
            router.push(`/dashboard/customers/${customer.id}`)
        } catch (error: any) {
            toast.error(error.message || "Failed to create customer")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <div className="space-y-6 p-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Add Customer</h1>
                    <p className="text-muted-foreground">
                        Create a new customer record for package intake and delivery operations.
                    </p>
                </div>

                <CustomerForm
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    className="space-y-6"
                    footer={
                        <div className="flex items-center justify-end gap-2 border-t pt-6">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSubmitting}
                                onClick={() => router.push("/dashboard/customers")}
                            >
                                Cancel
                            </Button>

                            <Button type="submit" disabled={isSubmitting}>
                                Create Customer
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
                        setPendingCreation(null)
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
                            The address you entered is outside the current service area coverage. You can still create the customer if you want to store the record anyway.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>
                            Go Back
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isSubmitting}
                            onClick={handleCreateOutsideServiceArea}
                        >
                            Create Anyway
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}