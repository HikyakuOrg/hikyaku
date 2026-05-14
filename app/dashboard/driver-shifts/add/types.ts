import type { WarehouseStepData } from "./steps/warehouse-step"
import type { DateStepData } from "./steps/date-step"
import type { DriverVehicleStepData } from "./steps/driver-vehicle-step"
import type { PackagesRouteStepData } from "./steps/packages-route-step"

export type FormData = {
    warehouse?: WarehouseStepData
    date?: DateStepData
    driverVehicle?: DriverVehicleStepData
    packagesRoute?: PackagesRouteStepData
}
