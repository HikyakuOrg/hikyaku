import { Button } from "@/components/ui/button"
import { CustomerForm } from "@/components/customers/customer-form"
import type { CustomerFormValues } from "@/components/customers/customer-schema"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter as AlertDialogFooterActions,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    createPreparedCustomer,
    prepareCustomerFromForm,
    type PreparedCustomerCreation,
} from "@/lib/customers/create-customer"
import { TriangleAlert } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"

interface AddCustomerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCustomerAdded: (customer: Customer) => void
}

export function AddCustomerDialog({ open, onOpenChange, onCustomerAdded }: AddCustomerDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [pendingCreation, setPendingCreation] = useState<PreparedCustomerCreation | null>(null)
    const [showOutsideServiceAreaDialog, setShowOutsideServiceAreaDialog] = useState(false)

    const onSubmit = async (values: CustomerFormValues) => {
        setIsLoading(true)
        try {
            const prepared = await prepareCustomerFromForm(values)

            if (!prepared.isWithinServiceArea) {
                setPendingCreation(prepared)
                setShowOutsideServiceAreaDialog(true)
                return
            }

            const customer = await createPreparedCustomer(prepared)
            onCustomerAdded(customer)
            toast.success("Customer created successfully")
            onOpenChange(false)
        } catch (e) {
            toast.error(getErrorMessage(e))
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateOutsideServiceArea = async () => {
        if (!pendingCreation) {
            return
        }

        setIsLoading(true)

        try {
            const customer = await createPreparedCustomer(pendingCreation)
            setShowOutsideServiceAreaDialog(false)
            setPendingCreation(null)
            onCustomerAdded(customer)
            toast.success("Customer created successfully")
            onOpenChange(false)
        } catch (error) {
            toast.error(getErrorMessage(error) || "Failed to create customer")
        } finally {
            setIsLoading(false)
        }
    }


    return (
        <>
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
                        <p className="text-sm text-muted-foreground">
                            Creating customer...
                        </p>
                    </div>
                </div>
            )}
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create Customer</DialogTitle>
                        <DialogDescription>
                            Create a new customer and add them to your customer list
                        </DialogDescription>
                    </DialogHeader>

                    <div className="-mx-4 max-h-[50vh] overflow-y-auto px-4">
                        <CustomerForm
                            onSubmit={onSubmit}
                            isSubmitting={isLoading}
                            footer={
                                <DialogFooter className="pt-4">
                                    <DialogClose>
                                        <Button variant="outline" disabled={isLoading}>
                                            Cancel
                                        </Button>
                                    </DialogClose>

                                    <Button type="submit" disabled={isLoading}>
                                        Create Customer
                                    </Button>
                                </DialogFooter>
                            }
                        />
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={showOutsideServiceAreaDialog}
                onOpenChange={(open) => {
                    setShowOutsideServiceAreaDialog(open)
                    if (!open) {
                        setPendingCreation(null)
                    }
                }}
            >
                <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        <AlertDialogMedia>
                            <TriangleAlert className="size-8" />
                        </AlertDialogMedia>
                        <AlertDialogTitle>Customer outside service area</AlertDialogTitle>
                        <AlertDialogDescription>
                            The address you entered is outside the current service area coverage. You can still create the customer if you want to keep the record.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooterActions>
                        <AlertDialogCancel disabled={isLoading}>
                            Go Back
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isLoading}
                            onClick={handleCreateOutsideServiceArea}
                        >
                            Create Anyway
                        </AlertDialogAction>
                    </AlertDialogFooterActions>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}