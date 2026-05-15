"use client"

import React from "react"
import { defineStepper } from "@stepperize/react"
import { StepStatus, useStepItemContext } from "@stepperize/react/primitives"

import { Button } from "@/components/ui/button"
import {
    SetupFormValues,
    PricingFormValues,
    CoverageFormValues,
    setupSchema,
    pricingSchema,
    coverageSchema,
} from "./service-rate-schema"
import { SetupStep } from "./steps/setup-step"
import { PricingStep } from "./steps/pricing-step"
import { CoverageStep } from "./steps/coverage-step"
import { ReviewStep } from "./steps/review-step"

export type SelectedServiceArea = { id: string; name: string }

export type ServiceRateFormData = {
    setup?: SetupFormValues
    pricing?: PricingFormValues
    coverage?: CoverageFormValues
    selectedServiceAreas?: SelectedServiceArea[]
}

export function ServiceRateStepper() {
    const { Stepper } = defineStepper(
        {
            id: "setup",
            title: "Setup",
            description: "Currency & type",
            schema: setupSchema,
        },
        {
            id: "pricing",
            title: "Pricing",
            description: "Rates & distances",
            schema: pricingSchema,
        },
        {
            id: "coverage",
            title: "Coverage",
            description: "Service Areas & add-ons",
            schema: coverageSchema,
        },
        {
            id: "review",
            title: "Review",
            description: "Confirm & save",
        }
    )

    const StepperTriggerWrapper = () => {
        const item = useStepItemContext()
        const isInactive = item.status === "inactive"

        return (
            <Stepper.Trigger
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
                const stored = (id: "setup" | "pricing" | "coverage") =>
                    stepper.metadata.get(id) as ServiceRateFormData | undefined

                const formData: ServiceRateFormData = {
                    setup: stored("setup")?.setup,
                    pricing: stored("pricing")?.pricing,
                    coverage: stored("coverage")?.coverage,
                    selectedServiceAreas: stored("coverage")?.selectedServiceAreas,
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
                                setup: () => (
                                    <SetupStep
                                        defaultValues={formData.setup}
                                        onNext={(data) => {
                                            stepper.metadata.set("setup", {
                                                ...formData,
                                                setup: data,
                                            })
                                            stepper.navigation.next()
                                        }}
                                    />
                                ),
                                pricing: () => (
                                    <PricingStep
                                        defaultValues={formData.pricing}
                                        currency={formData.setup?.currency ?? "USD"}
                                        deliveryType={
                                            formData.setup?.deliveryType ?? "on_demand"
                                        }
                                        onNext={(data) => {
                                            stepper.metadata.set("pricing", {
                                                ...formData,
                                                pricing: data,
                                            })
                                            stepper.navigation.next()
                                        }}
                                        onPrev={() => stepper.navigation.prev()}
                                    />
                                ),
                                coverage: () => (
                                    <CoverageStep
                                        defaultValues={formData.coverage}
                                        defaultSelectedServiceAreas={formData.selectedServiceAreas}
                                        currency={formData.setup?.currency ?? "USD"}
                                        distanceUnit={
                                            formData.pricing?.distanceUnit ?? "km"
                                        }
                                        onNext={(data, selectedAreas) => {
                                            stepper.metadata.set("coverage", {
                                                ...formData,
                                                coverage: data,
                                                selectedServiceAreas: selectedAreas,
                                            })
                                            stepper.navigation.next()
                                        }}
                                        onPrev={() => stepper.navigation.prev()}
                                    />
                                ),
                                review: () => (
                                    <ReviewStep
                                        formData={formData}
                                        selectedServiceAreas={formData.selectedServiceAreas ?? []}
                                        onPrev={() => stepper.navigation.prev()}
                                        onSubmit={() => {
                                            // TODO: wire in data layer
                                            console.log("Submit service rate:", formData)
                                        }}
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
