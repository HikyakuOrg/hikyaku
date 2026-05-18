"use client"

import React, { useState } from "react"
import { defineStepper } from "@stepperize/react"
import { StepStatus, useStepItemContext } from "@stepperize/react/primitives"

import { Button } from "@/components/ui/button"
import {
    PackageFormValues,
    AddressesFormValues,
    ScheduleFormValues,
    ServiceRateOption,
    packageSchema,
    addressesSchema,
    scheduleSchema,
} from "./booking-schema"
import { PackageStep } from "./steps/package-step"
import { AddressesStep } from "./steps/addresses-step"
import { ScheduleStep } from "./steps/schedule-step"
import { ReviewStep } from "./steps/review-step"
import { calculateServiceFee } from "@/lib/api/service-fees"
import { createBooking } from "@/lib/actions/create-booking"

export type BookingFormData = {
    package?: PackageFormValues
    addresses?: AddressesFormValues
    schedule?: ScheduleFormValues
}

const { Stepper } = defineStepper(
    {
        id: "package",
        title: "Package",
        description: "Item details",
        schema: packageSchema,
    },
    {
        id: "addresses",
        title: "Addresses",
        description: "Sender & recipient",
        schema: addressesSchema,
    },
    {
        id: "schedule",
        title: "Schedule",
        description: "Dates & options",
        schema: scheduleSchema,
    },
    {
        id: "review",
        title: "Review",
        description: "Confirm & submit",
    }
)

export function BookingStepper({
    serviceRates,
}: {
    serviceRates: ServiceRateOption[]
}) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    const StepperTriggerWrapper = () => {
        const item = useStepItemContext()
        const isInactive = item.status === "inactive"

        return (
            <Stepper.Trigger
                disabled={isInactive}
                render={(domProps) => (
                    <Button
                        className="rounded-full"
                        variant={isInactive ? "secondary" : "default"}
                        size="icon"
                        {...domProps}
                    >
                        <Stepper.Indicator>{item.index + 1}</Stepper.Indicator>
                    </Button>
                )}
            />
        )
    }

    const StepperTitleWrapper = ({ title }: { title: string }) => (
        <Stepper.Title
            render={(domProps) => (
                <h4 className="text-base font-medium" {...domProps}>
                    {title}
                </h4>
            )}
        />
    )

    const StepperDescriptionWrapper = ({
        description,
    }: {
        description?: string
    }) => {
        if (!description) return null
        return (
            <Stepper.Description
                render={(domProps) => (
                    <p className="text-sm text-muted-foreground" {...domProps}>
                        {description}
                    </p>
                )}
            />
        )
    }

    const StepperSeparatorWithStatus = ({
        status,
        isLast,
    }: {
        status: StepStatus
        isLast: boolean
    }) => {
        if (isLast) return null
        return (
            <Stepper.Separator
                orientation="horizontal"
                data-status={status}
                className="bg-muted data-[status=success]:bg-primary data-[disabled]:opacity-50 transition-all duration-300 ease-in-out data-[orientation=horizontal]:h-0.5 data-[orientation=horizontal]:flex-1"
            />
        )
    }

    return (
        <Stepper.Root className="w-full space-y-4" orientation="horizontal">
            {({ stepper }) => {
                const stored = (id: "package" | "addresses" | "schedule") =>
                    stepper.metadata.get(id) as BookingFormData | undefined

                const formData: BookingFormData = {
                    package: stored("package")?.package,
                    addresses: stored("addresses")?.addresses,
                    schedule: stored("schedule")?.schedule,
                }

                return (
                    <>
                        <Stepper.List className="flex list-none gap-2 flex-row items-center justify-between">
                            {stepper.state.all.map((stepData, index) => {
                                const currentIndex = stepper.state.current.index
                                const status: StepStatus =
                                    index < currentIndex
                                        ? "success"
                                        : index === currentIndex
                                            ? "active"
                                            : "inactive"
                                const isLast = index === stepper.state.all.length - 1
                                const data = stepData as {
                                    id: string
                                    title: string
                                    description?: string
                                }

                                return (
                                    <React.Fragment key={stepData.id}>
                                        <Stepper.Item
                                            step={stepData.id}
                                            className="group peer relative flex shrink-0 items-center gap-2"
                                        >
                                            <StepperTriggerWrapper />
                                            <div className="flex flex-col items-start gap-1">
                                                <StepperTitleWrapper title={data.title} />
                                                <StepperDescriptionWrapper
                                                    description={data.description}
                                                />
                                            </div>
                                        </Stepper.Item>
                                        <StepperSeparatorWithStatus
                                            key={`separator-${stepData.id}`}
                                            status={status}
                                            isLast={isLast}
                                        />
                                    </React.Fragment>
                                )
                            })}
                        </Stepper.List>

                        <div className="min-h-[280px] rounded border bg-card p-6">
                            {stepper.flow.switch({
                                package: () => (
                                    <PackageStep
                                        defaultValues={formData.package}
                                        serviceRates={serviceRates}
                                        onNext={(data) => {
                                            stepper.metadata.set("package", {
                                                ...formData,
                                                package: data,
                                            })
                                            stepper.navigation.next()
                                        }}
                                    />
                                ),
                                addresses: () => (
                                    <AddressesStep
                                        defaultValues={formData.addresses}
                                        onNext={(data) => {
                                            stepper.metadata.set("addresses", {
                                                ...formData,
                                                addresses: data,
                                            })
                                            stepper.navigation.next()
                                        }}
                                        onPrev={() => stepper.navigation.prev()}
                                    />
                                ),
                                schedule: () => (
                                    <ScheduleStep
                                        defaultValues={formData.schedule}
                                        deliveryType={
                                            formData.package?.deliveryType ?? "on_demand"
                                        }
                                        onNext={(data) => {
                                            stepper.metadata.set("schedule", {
                                                ...formData,
                                                schedule: data,
                                            })
                                            stepper.navigation.next()
                                        }}
                                        onPrev={() => stepper.navigation.prev()}
                                    />
                                ),
                                review: () => (
                                    <ReviewStep
                                        formData={formData}
                                        serviceRates={serviceRates}
                                        onPrev={() => stepper.navigation.prev()}
                                        onSubmit={async () => {
                                            setIsSubmitting(true)
                                            try {
                                                const serviceRateId = formData.package?.serviceRateId ?? ""
                                                const result = await calculateServiceFee(formData, serviceRateId)
                                                await createBooking(formData, result)
                                                console.log("Booking created successfully:", result)
                                            } catch (err) {
                                                console.error("Booking creation failed:", err)
                                            } finally {
                                                setIsSubmitting(false)
                                            }
                                        }}
                                        isSubmitting={isSubmitting}
                                    />
                                ),
                            })}
                        </div>
                    </>
                )
            }}
        </Stepper.Root>
    )
}
