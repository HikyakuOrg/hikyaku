

export type PackageStatus = "PENDING" | "ASSIGNED" | "OUT_FOR_DELIVERY" | "IN_TRANSIT" | "DELIVERED" | "FAILED"


export function PackageStatusText(status: PackageStatus): string {
    switch (status) {
        case "PENDING":
            return "Pending"
        case "ASSIGNED":
            return "Assigned"
        case "OUT_FOR_DELIVERY":
            return "Out for Delivery"
        case "IN_TRANSIT":
            return "In Transit"
        case "DELIVERED":
            return "Delivered"
        case "FAILED":
            return "Failed"
    }
}

export const STATUS_OPTIONS = [
    "Pending",
    "Delivered",
    "Failed",
    "Assigned",
    "In Transit",
]
