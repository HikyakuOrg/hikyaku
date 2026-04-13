"use client"

import { Button } from "@/components/ui/button";
import { defineStepper } from "@stepperize/react";
import { StepStatus, useStepItemContext } from "@stepperize/react/primitives";
import React from "react";
import { PackageInfo } from "./package-step/package-info-step";
import { CustomerFormValues, customerSchema, LogisticsAssignmentFormValues, logisticsAssignmentSchema, PackageFormValues, packageSchema } from "./add-package-schema";
import { CustomerInfo } from "./customer-step/customer-info-step";
import { LogisticsAssignmentStep } from "./logistics-assignment-step";
import { OverviewStep } from "./overview-step";

import { Tables } from "@/lib/supabase/supabase";

export type FormData = {
    packageInfo?: PackageFormValues;
    customerInfo?: CustomerFormValues & {
        sender?: Customer;
        receiver?: Customer;
    };
    logisticsAssignment?: LogisticsAssignmentFormValues & {
        warehouse?: Tables<'warehouse'>;
    };
};


export function StepperForm() {

    const { Stepper } = defineStepper(
        {
            id: "packageInfo",
            title: "Package Info",
            description: "Enter package details",
            schema: packageSchema
        },
        {
            id: "customerInfo",
            title: "Customer Info",
            description: "Enter customer details",
            schema: customerSchema
        },
        {
            id: "logisticsAssignment",
            title: "Logistics Assignment",
            description: "Assign logistics",
            schema: logisticsAssignmentSchema
        },
        {
            id: "complete",
            title: "Complete",
            description: "Review and submit",
        }
    );

    const StepperTriggerWrapper = () => {
        const item = useStepItemContext();
        const isInactive = item.status === "inactive";

        return (
            <Stepper.Trigger
                render={(domProps) => (
                    <Button
                        className="rounded-full"
                        variant={isInactive ? "secondary" : "default"}
                        size="icon"
                        {...domProps}
                    >
                        <Stepper.Indicator>
                            {item.index + 1}
                        </Stepper.Indicator>
                    </Button>
                )}
            />
        );
    };

    const StepperTitleWrapper = ({ title }: { title: string }) => {
        return (
            <Stepper.Title
                render={(domProps) => (
                    <h4 className="text-base font-medium" {...domProps}>
                        {title}
                    </h4>
                )}
            />
        );
    };

    const StepperDescriptionWrapper = ({
        description,
    }: { description?: string }) => {
        if (!description) return null;
        return (
            <Stepper.Description
                render={(domProps) => (
                    <p className="text-sm text-muted-foreground" {...domProps}>
                        {description}
                    </p>
                )}
            />
        );
    };

    const StepperSeparatorWithStatus = ({
        status,
        isLast,
    }: { status: StepStatus; isLast: boolean }) => {
        if (isLast) return null;

        return (
            <Stepper.Separator
                orientation="horizontal"
                data-status={status}
                className="bg-muted data-[status=success]:bg-primary data-[disabled]:opacity-50 transition-all duration-300 ease-in-out data-[orientation=horizontal]:h-0.5 data-[orientation=horizontal]:flex-1"
            />
        );
    };

    return (
        <Stepper.Root className="w-full space-y-4" orientation="horizontal">
            {({ stepper }) => {
                const stored = (id: "packageInfo" | "customerInfo" | "logisticsAssignment") =>
                    stepper.metadata.get(id) as FormData | undefined;
                const formData: FormData = {
                    packageInfo: stored("packageInfo")?.packageInfo,
                    customerInfo: stored("customerInfo")?.customerInfo,
                    logisticsAssignment: stored("logisticsAssignment")?.logisticsAssignment,
                };

                return (
                    <>
                        <Stepper.List className="flex list-none gap-2 flex-row items-center justify-between">
                            {stepper.state.all.map((stepData, index) => {
                                const currentIndex = stepper.state.current.index;
                                const status = index < currentIndex ? "success" : index === currentIndex ? "active" : "inactive";
                                const isLast =
                                    index === stepper.state.all.length - 1;
                                const data = stepData as {
                                    id: string;
                                    title: string;
                                    description?: string;
                                };

                                return (
                                    <React.Fragment key={stepData.id}>
                                        <Stepper.Item
                                            step={stepData.id}
                                            className="group peer relative flex shrink-0 items-center gap-2"
                                        >
                                            <StepperTriggerWrapper />
                                            <div className="flex flex-col items-start gap-1">
                                                <StepperTitleWrapper
                                                    title={data.title}
                                                />
                                                <StepperDescriptionWrapper
                                                    description={
                                                        data.description
                                                    }
                                                />
                                            </div>
                                        </Stepper.Item>
                                        <StepperSeparatorWithStatus
                                            key={`separator-${stepData.id}`}
                                            status={status}
                                            isLast={isLast}
                                        />
                                    </React.Fragment>
                                );
                            })}
                        </Stepper.List>

                        <div className="min-h-[280px] rounded border bg-card p-6">
                            {stepper.flow.switch({
                                packageInfo: () => (
                                    <PackageInfo
                                        defaultValues={formData.packageInfo}
                                        onNext={(data) => {
                                            stepper.metadata.set("packageInfo", {
                                                ...formData,
                                                packageInfo: data,
                                            });
                                            stepper.navigation.next();
                                        }}
                                    />
                                ),
                                customerInfo: () => (
                                    <CustomerInfo
                                        defaultValues={formData.customerInfo}
                                        onNext={(data) => {
                                            stepper.metadata.set("customerInfo", {
                                                ...formData,
                                                customerInfo: data,
                                            });
                                            stepper.navigation.next();
                                        }}
                                        onPrev={() => stepper.navigation.prev()}
                                    />
                                ),
                                logisticsAssignment: () => (
                                    <LogisticsAssignmentStep
                                        defaultValues={formData.logisticsAssignment}
                                        onNext={(data) => {
                                            stepper.metadata.set("logisticsAssignment", {
                                                ...formData,
                                                logisticsAssignment: data,
                                            });
                                            stepper.navigation.next();
                                        }}
                                        onPrev={() => stepper.navigation.prev()}
                                    />
                                ),
                                complete: () => (
                                    <OverviewStep
                                        formData={formData}
                                        onPrev={() => stepper.navigation.prev()}
                                    />
                                ),
                            })}
                        </div>
                    </>
                );
            }}
        </Stepper.Root>
    );

}