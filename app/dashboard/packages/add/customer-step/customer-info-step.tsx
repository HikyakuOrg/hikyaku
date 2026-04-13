import { useForm } from "react-hook-form";
import { CustomerFormValues, customerSchema } from "../add-package-schema";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { CustomerSelector } from "./customer-selector";
import { UserRoundPlus, UserRoundSearch } from 'lucide-react';
import { CustomerCard } from "./customer-card";
import { Badge } from "@/components/ui/badge";
import { AddCustomerDialog } from "./add-customer-dialog";
import { getCustomersByIds } from "@/lib/supabase/db";

export function CustomerInfo({ onNext, onPrev, defaultValues }: {
    onNext: (data: CustomerFormValues & { sender?: Customer; receiver?: Customer }) => void;
    onPrev: () => void;
    defaultValues?: CustomerFormValues;
}) {
    const form = useForm({
        resolver: zodResolver(customerSchema),
        defaultValues: defaultValues ?? { senderId: "", receiverId: "" },
    });

    const [selectedSenderCustomer, setSelectedSenderCustomer] = useState<Customer | null>(null);
    const [selectedReceiverCustomer, setSelectedReceiverCustomer] = useState<Customer | null>(null);
    const [senderDialogOpen, setSenderDialogOpen] = useState(false)
    const [receiverDialogOpen, setReceiverDialogOpen] = useState(false)

    useEffect(() => {
        const fetchCustomers = async () => {
            const customerIds = [];
            if (defaultValues?.senderId) customerIds.push(defaultValues.senderId);
            if (defaultValues?.receiverId) customerIds.push(defaultValues.receiverId);

            if (customerIds.length > 0) {
                try {
                    const customers = await getCustomersByIds(customerIds);
                    const sender = customers.find(c => c.id === defaultValues?.senderId);
                    const receiver = customers.find(c => c.id === defaultValues?.receiverId);

                    if (sender) setSelectedSenderCustomer(sender as any);
                    if (receiver) setSelectedReceiverCustomer(receiver as any);
                } catch (error) {
                    console.error("Error fetching customers:", error);
                }
            }
        };

        fetchCustomers();
    }, [defaultValues]);

    return (
        <form
            id="customerInfo"
            onSubmit={form.handleSubmit((data) => onNext({
                ...data,
                sender: selectedSenderCustomer ?? undefined,
                receiver: selectedReceiverCustomer ?? undefined
            }))}
            className="space-y-8 p-4"
        >
            <AddCustomerDialog
                open={senderDialogOpen}
                onOpenChange={setSenderDialogOpen}
                onCustomerAdded={(customer) => {
                    setSelectedSenderCustomer(customer)
                    form.setValue("senderId", customer.id)
                }} />

            <AddCustomerDialog
                open={receiverDialogOpen}
                onOpenChange={setReceiverDialogOpen}
                onCustomerAdded={(customer) => {
                    setSelectedReceiverCustomer(customer)
                    form.setValue("receiverId", customer.id)
                }} />

            <div className="space-y-8">
                <FieldGroup>
                    <div className="flex flex-col gap-4">
                        <div>
                            <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                                Customer Information
                            </h3>
                            <p className="text-muted-foreground mt-2 leading-7">
                                Identify the sender and receiver for this shipment from your existing customers
                            </p>
                        </div>
                        <div className="grid w-full gap-6">
                            <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                                <div className="flex items-center gap-2">
                                    <UserRoundSearch />
                                    Sender Details
                                    <Badge variant="destructive">Required</Badge>
                                </div>
                            </h3>
                            <CustomerSelector
                                name="senderId"
                                control={form.control}
                                customerSelected={(customer) => {
                                    if (customer) {
                                        setSelectedSenderCustomer(customer)
                                    }
                                }}
                                initialSelectedCustomer={selectedSenderCustomer}
                            />

                            {!form.watch("senderId") && (
                                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/30 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    onClick={() => {
                                        setSenderDialogOpen(true)
                                    }}>
                                    <UserRoundPlus />
                                    <p className="text-slate-400 text-sm font-medium">No sender selected yet</p>
                                    <button type="button" className="mt-4 text-xs text-primary font-bold uppercase tracking-widest hover:underline">+ Create New Customer</button>
                                </div>
                            )}

                            {form.watch("senderId") && selectedSenderCustomer && (
                                <CustomerCard
                                    customer={selectedSenderCustomer}
                                    onRemove={() => {
                                        setSelectedSenderCustomer(null)
                                        form.setValue("senderId", "")
                                    }}
                                />
                            )}

                            <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                                <div className="flex items-center gap-2">
                                    <UserRoundSearch />
                                    Receiver Details
                                    <Badge variant="destructive">Required</Badge>
                                </div>
                            </h3>
                            <CustomerSelector
                                name="receiverId"
                                control={form.control}
                                customerSelected={(customer) => {
                                    if (customer) {
                                        setSelectedReceiverCustomer(customer)
                                    }
                                }}
                                initialSelectedCustomer={selectedReceiverCustomer}
                            />

                            {!form.watch("receiverId") && (
                                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/30 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    onClick={() => {
                                        setReceiverDialogOpen(true)
                                    }}>
                                    <UserRoundPlus />
                                    <p className="text-slate-400 text-sm font-medium">No receiver selected yet</p>
                                    <button type="button" className="mt-4 text-xs text-primary font-bold uppercase tracking-widest hover:underline">+ Create New Customer</button>
                                </div>
                            )}

                            {form.watch("receiverId") && selectedReceiverCustomer && (
                                <CustomerCard
                                    customer={selectedReceiverCustomer}
                                    onRemove={() => {
                                        setSelectedReceiverCustomer(null)
                                        form.setValue("receiverId", "")
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </FieldGroup>
            </div>

            <div className="flex justify-end gap-2 pt-6 border-t mt-4">
                <Button type="button" variant="outline" onClick={onPrev}>Previous</Button>
                <Button type="submit">Next</Button>
            </div>
        </form>
    );
}