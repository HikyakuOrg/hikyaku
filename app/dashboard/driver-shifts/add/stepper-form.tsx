"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { defineStepper } from "@stepperize/react"
import { StepStatus, useStepItemContext } from "@stepperize/react/primitives"
import { WarehouseStep } from "./steps/warehouse-step"
import { DateStep } from "./steps/date-step"
import { DriverVehicleStep } from "./steps/driver-vehicle-step"
import { PackagesRouteStep } from "./steps/packages-route-step"
import { OverviewStep } from "./steps/overview-step"

import type { FormData } from "./types"

export type { FormData }

const { Stepper } = defineStepper(
    { id: "warehouse", title: "Warehouse", description: "Select departure warehouse" },
    { id: "date", title: "Date", description: "Choose shift date" },
    { id: "driverVehicle", title: "Driver & Vehicle", description: "Assign driver and vehicle" },
    { id: "packagesRoute", title: "Packages & Route", description: "Build delivery route" },
    { id: "overview", title: "Overview", description: "Review and confirm" }
)

function StepperTriggerWrapper() {
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

function StepperTitleWrapper({ title }: { title: string }) {
    return (
        <Stepper.Title
            render={(domProps) => (
                <h4 className="text-base font-medium" {...domProps}>{title}</h4>
            )}
        />
    )
}

function StepperDescriptionWrapper({ description }: { description?: string }) {
    if (!description) return null
    return (
        <Stepper.Description
            render={(domProps) => (
                <p className="text-sm text-muted-foreground" {...domProps}>{description}</p>
            )}
        />
    )
}

function StepperSeparatorWithStatus({ status, isLast }: { status: StepStatus; isLast: boolean }) {
    if (isLast) return null
    return (
        <Stepper.Separator
            orientation="horizontal"
            data-status={status}
            className="bg-muted data-[status=success]:bg-primary data-[disabled]:opacity-50 transition-all duration-300 ease-in-out data-[orientation=horizontal]:h-0.5 data-[orientation=horizontal]:flex-1"
        />
    )
}

export function ShiftStepperForm() {
    return (
        <Stepper.Root className="w-full space-y-4" orientation="horizontal">
            {({ stepper }) => {
                type MetadataKey = "warehouse" | "date" | "driverVehicle" | "packagesRoute"

                const stored = (id: MetadataKey) =>
                    stepper.metadata.get(id) as FormData | undefined

                const formData: FormData = {
                    warehouse: stored("warehouse")?.warehouse,
                    date: stored("date")?.date,
                    driverVehicle: stored("driverVehicle")?.driverVehicle,
                    packagesRoute: stored("packagesRoute")?.packagesRoute,
                }

                return (
                    <>
                        <Stepper.List className="flex list-none gap-2 flex-row items-center justify-between">
                            {stepper.state.all.map((stepData, index) => {
                                const currentIndex = stepper.state.current.index
                                const status: StepStatus =
                                    index < currentIndex ? "success"
                                        : index === currentIndex ? "active"
                                            : "inactive"
                                const isLast = index === stepper.state.all.length - 1
                                const data = stepData as { id: string; title: string; description?: string }

                                return (
                                    <React.Fragment key={stepData.id}>
                                        <Stepper.Item
                                            step={stepData.id}
                                            className="group peer relative flex shrink-0 items-center gap-2"
                                        >
                                            <StepperTriggerWrapper />
                                            <div className="flex flex-col items-start gap-1">
                                                <StepperTitleWrapper title={data.title} />
                                                <StepperDescriptionWrapper description={data.description} />
                                            </div>
                                        </Stepper.Item>
                                        <StepperSeparatorWithStatus status={status} isLast={isLast} />
                                    </React.Fragment>
                                )
                            })}
                        </Stepper.List>

                        <div className="min-h-[280px] rounded border bg-card p-6">
                            {stepper.flow.switch({
                                warehouse: () => (
                                    <WarehouseStep
                                        defaultValues={formData.warehouse}
                                        onNext={(data) => {
                                            stepper.metadata.set("warehouse", { ...formData, warehouse: data })
                                            stepper.navigation.next()
                                        }}
                                    />
                                ),
                                date: () => (
                                    <DateStep
                                        defaultValues={formData.date}
                                        onNext={(data) => {
                                            stepper.metadata.set("date", { ...formData, date: data })
                                            stepper.navigation.next()
                                        }}
                                        onPrev={() => stepper.navigation.prev()}
                                    />
                                ),
                                driverVehicle: () => (
                                    <DriverVehicleStep
                                        warehouse={formData.warehouse!}
                                        shiftDate={formData.date?.date ?? new Date().toISOString().slice(0, 10)}
                                        defaultValues={formData.driverVehicle}
                                        onNext={(data) => {
                                            stepper.metadata.set("driverVehicle", { ...formData, driverVehicle: data })
                                            stepper.navigation.next()
                                        }}
                                        onPrev={() => stepper.navigation.prev()}
                                    />
                                ),
                                packagesRoute: () => (
                                    <PackagesRouteStep
                                        warehouse={formData.warehouse!}
                                        vehicleGrossLimits={formData.driverVehicle?.vehicleGrossLimits ?? 0}
                                        vehicleOrsType={formData.driverVehicle?.vehicleOrsType ?? "driving-car"}
                                        defaultValues={formData.packagesRoute}
                                        onNext={(data) => {
                                            stepper.metadata.set("packagesRoute", { ...formData, packagesRoute: data })
                                            stepper.navigation.next()
                                        }}
                                        onPrev={() => stepper.navigation.prev()}
                                    />
                                ),
                                overview: () => (
                                    <OverviewStep
                                        formData={formData}
                                        onPrev={() => stepper.navigation.prev()}
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
