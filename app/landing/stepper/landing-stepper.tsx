"use client"


import React, { useEffect, useRef } from "react"
import { defineStepper } from "@stepperize/react"
import { StepStatus, useStepItemContext } from "@stepperize/react/primitives"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"


const stepperDef = defineStepper(
    {
        id: "package",
        title: "Package",
        description: "Item details",
    },
    {
        id: "addresses",
        title: "Addresses",
        description: "Sender & recipient",
    },
    {
        id: "schedule",
        title: "Schedule",
        description: "Dates & options",
    },
    {
        id: "review",
        title: "Review",
        description: "Confirm & submit",
    }
)

const { Stepper } = stepperDef
type StepperInstance = ReturnType<typeof stepperDef.useStepper>



export function LandingStepper({ className }: { className?: string }) {
    const stepperRef = useRef<StepperInstance | null>(null)

    useEffect(() => {
        const interval = setInterval(() => {
            const s = stepperRef.current
            if (!s) return
            if (s.state.current.index === s.state.all.length - 1) {
                s.navigation.goTo(s.state.all[0].id)
            } else {
                s.navigation.next()
            }
        }, 900)
        return () => clearInterval(interval)
    }, [])

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
                <h4 className="text-xs sm:text-base font-medium" {...domProps}>
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
        <Stepper.Root className={cn("max-w-4xl space-y-4 mx-auto", className)} orientation="horizontal">
            {({ stepper }) => {
                stepperRef.current = stepper
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
                                                <div className="hidden sm:block">
                                                    <StepperDescriptionWrapper
                                                        description={data.description}
                                                    />
                                                </div>
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
                    </>
                )
            }}
        </Stepper.Root>
    )
}